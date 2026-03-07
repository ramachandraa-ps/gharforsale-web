import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Redirect / to /landing.html (matches vercel.json redirect)
app.get('/', (req, res) => res.redirect('/landing.html'));

// API routes — loads Vercel-style serverless functions from api/ folder
app.all('/api/:fn', async (req, res) => {
  try {
    const mod = await import(`./api/${req.params.fn}.js`);
    await mod.default(req, res);
  } catch (err) {
    console.error('API route error:', err.message);
    res.status(404).json({ error: 'API route not found' });
  }
});

// Static files
app.use(express.static(__dirname, { extensions: ['html'] }));

app.listen(PORT, () => {
  console.log(`Local dev server running at http://localhost:${PORT}`);
});
