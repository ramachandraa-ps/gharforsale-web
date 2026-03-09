// Simple in-memory rate limiter (per IP, resets on cold start)
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per minute per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimit.set(ip, { start: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export default async function handler(req, res) {
  // CORS - only allow same origin
  const origin = req.headers.origin || req.headers.referer || '';
  const allowed = origin.includes('gharforsale-web.vercel.app') || origin.includes('localhost');
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : '');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not configured');
    return res.status(200).json(createFallbackAnalysis());
  }

  try {
    const { location, area, landRate, type, price, bedrooms, bathrooms, title, description } = req.body;

    const pricePerSqft = (price && area) ? Math.round(price / area) : null;

    const prompt = `You are an expert Indian real estate investment analyst. Analyze this specific property and provide highly tailored investment insights.

Property Details:
- Title: ${title || 'Not specified'}
- Location: ${location || 'Not specified'}
- Type: ${type || 'Not specified'}
- Price: ₹${(price || 0).toLocaleString('en-IN')}
- Area: ${area || 0} sq ft
${pricePerSqft ? `- Price per sq ft: ₹${pricePerSqft.toLocaleString('en-IN')}` : ''}
${landRate ? `- Land Rate: ₹${landRate} per sq ft` : ''}
- Bedrooms: ${bedrooms || 'N/A'}
- Bathrooms: ${bathrooms || 'N/A'}
${description ? `- Description: ${description.substring(0, 300)}` : ''}

IMPORTANT: Your analysis must be SPECIFIC to this exact property's location, type, price range, and characteristics. Do NOT give generic responses. Consider:
- The specific city/area and its real estate market dynamics
- Whether the price per sq ft is above/below market average for that area
- The property type (flat vs villa vs plot vs commercial) and its investment profile
- Current Indian real estate trends for this specific segment

Respond with ONLY raw JSON (no markdown fences, no explanation):
{
  "scores": {
    "location": <number 0-10 with one decimal>,
    "roi": <number 0-10 with one decimal>,
    "growth": <number 0-10 with one decimal>
  },
  "market_insights": {
    "demand_level": "<specific demand assessment for this area and property type>",
    "supply_status": "<supply situation in this micro-market>",
    "price_trend": "<price trend specific to this location and segment>"
  },
  "investment_metrics": {
    "expected_roi": "<specific ROI estimate with percentage range>",
    "rental_yield": "<rental yield estimate specific to this property type and area>",
    "price_appreciation": "<appreciation forecast for this specific location>"
  }
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      })
    });

    if (!geminiResponse.ok) {
      console.error('Gemini API error:', geminiResponse.status);
      return res.status(200).json(createFallbackAnalysis());
    }

    const geminiData = await geminiResponse.json();

    const textContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      console.error('No text in Gemini response');
      return res.status(200).json(createFallbackAnalysis());
    }

    // Clean markdown fences if present
    let cleaned = textContent.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    const analysis = JSON.parse(cleaned);

    // Validate structure
    if (!analysis.scores || !analysis.market_insights || !analysis.investment_metrics) {
      return res.status(200).json(createFallbackAnalysis());
    }

    return res.status(200).json(analysis);
  } catch (err) {
    console.error('AI analysis error:', err);
    return res.status(200).json(createFallbackAnalysis());
  }
}

function createFallbackAnalysis() {
  return {
    scores: { location: 7.0, roi: 6.5, growth: 7.0 },
    market_insights: {
      demand_level: "Moderate demand",
      supply_status: "Balanced supply",
      price_trend: "Stable with slight appreciation"
    },
    investment_metrics: {
      expected_roi: "8-10% expected",
      rental_yield: "3-4% potential yield",
      price_appreciation: "10-15% in 3 years"
    }
  };
}
