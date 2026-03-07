# GharForSale Production-Ready Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform GharForSale web app from hackathon-quality to production-ready by fixing all bugs, locking down security, adding a landing page, seeding mock properties for Tamil Nadu, and adding property editing for sellers.

**Architecture:** Static HTML/CSS/JS frontend deployed on Vercel with Firebase backend (Auth, Firestore). AI analysis via Vercel serverless function calling Gemini API. No build tools, no framework — vanilla ES modules with CDN-hosted Firebase SDK.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript (ES modules), Firebase Auth (Google sign-in via redirect), Cloud Firestore, Vercel (hosting + serverless), Gemini API

---

## Phase 1: Critical Bugs (User-Reported)

### Task 1: Fix navbar auth state race condition

The navbar hardcodes a "Sign In" button in every HTML page. `updateNavbar()` in `auth.js` replaces it asynchronously after Firebase resolves, causing a visible flash of "Sign In" even when logged in.

**Files:**
- Modify: `index.html:26-28`
- Modify: `property-detail.html:26-28`
- Modify: `add-property.html:26-28`
- Modify: `favorites.html:26-28`
- Modify: `profile.html:26-28`
- Modify: `filter.html:26-28`

**Step 1: Replace hardcoded "Sign In" with a loading placeholder in all 6 HTML files**

In each file, find:
```html
<div class="auth-section">
  <a href="login.html" class="btn btn-primary btn-sm">Sign In</a>
</div>
```

Replace with:
```html
<div class="auth-section">
  <div class="shimmer" style="width:80px;height:32px;border-radius:var(--radius-sm)"></div>
</div>
```

This shows a subtle shimmer placeholder instead of a misleading "Sign In" button. When `updateNavbar()` fires (whether the user is logged in or not), it replaces the shimmer with the correct content — either the user avatar menu or the real "Sign In" button.

**Step 2: Verify in browser**

Open `index.html` while logged in. The navbar should show a shimmer briefly, then the user avatar — never a "Sign In" button.

Open in incognito. The shimmer should quickly become the "Sign In" button.

**Step 3: Commit**

```bash
git add index.html property-detail.html add-property.html favorites.html profile.html filter.html
git commit -m "fix: replace hardcoded Sign In with shimmer to prevent auth flash"
```

---

### Task 2: Fix shimmer loading skeleton contrast

The shimmer cards appear as blank blue rectangles because the gradient uses `--bg-secondary` (#16213e) and `--bg-elevated` (#0f3460) which are nearly identical in the dark theme.

**Files:**
- Modify: `css/components.css:587`

**Step 1: Update shimmer gradient to use higher-contrast colors**

Find in `css/components.css`:
```css
.shimmer {
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-elevated) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

Replace with:
```css
.shimmer {
  background: linear-gradient(90deg, var(--bg-secondary) 25%, rgba(255,255,255,0.08) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

**Step 2: Verify visually**

Open the site — shimmer cards should now show a visible light sweep animation instead of appearing as flat blue rectangles.

**Step 3: Commit**

```bash
git add css/components.css
git commit -m "fix: improve shimmer skeleton contrast in dark theme"
```

---

## Phase 2: Security

### Task 3: Lock down Firestore security rules

Current rules allow anyone to read/write everything. This is a critical vulnerability. Replace with proper role-based rules.

**Files:**
- Modify: `firestore.rules`

**Step 1: Write proper security rules**

Replace the entire contents of `firestore.rules` with:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection
    match /users/{userId} {
      // Anyone can read user profiles (needed for owner info on property cards)
      allow read: if true;
      // Users can only write their own document
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;

      // Favorites subcollection
      match /favorites/{favId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Properties collection
    match /properties/{propertyId} {
      // Anyone can read properties (public listing)
      allow read: if true;
      // Only authenticated users can create
      allow create: if request.auth != null
        && request.resource.data.ownerId == request.auth.uid;
      // Only the owner can update or delete
      allow update: if request.auth != null
        && resource.data.ownerId == request.auth.uid;
      allow delete: if request.auth != null
        && resource.data.ownerId == request.auth.uid;
    }
  }
}
```

**Step 2: Commit**

```bash
git add firestore.rules
git commit -m "fix: lock down Firestore security rules with role-based access"
```

**Step 3: Deploy rules to Firebase**

```bash
cd /d/Mobile\ Apps\ Flutter/gharforsale
npx firebase deploy --only firestore:rules
```

Expected: Rules deployed successfully. Verify no errors.

---

### Task 4: Deploy Firestore indexes

The query `fetchProperties` uses `where('type', '==', ...)` + `orderBy('createdAt', 'desc')` which requires a composite index. The query `fetchPropertiesByOwner` uses `where('ownerId', '==', ...)` + `orderBy('createdAt', 'desc')`. These need composite indexes.

**Files:**
- Modify: `firestore.indexes.json`

**Step 1: Update composite indexes**

Replace the contents of `firestore.indexes.json` with:

```json
{
  "indexes": [
    {
      "collectionGroup": "properties",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "properties",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "properties",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "furnishing", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "properties",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "ownerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "properties",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

**Step 2: Deploy indexes**

```bash
cd /d/Mobile\ Apps\ Flutter/gharforsale
npx firebase deploy --only firestore:indexes
```

**Step 3: Commit**

```bash
git add firestore.indexes.json
git commit -m "feat: add Firestore composite indexes for property queries"
```

---

## Phase 3: Landing Page

### Task 5: Create landing page (landing.html)

Create a simple hero + features landing page as the entry point for the site. The landing page introduces GharForSale and has a CTA to browse properties.

**Files:**
- Create: `landing.html`

**Step 1: Create the landing page**

Create `landing.html` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GharForSale — Find Your Dream Property in Tamil Nadu</title>
  <meta name="description" content="GharForSale is a real estate marketplace for Tamil Nadu. Browse flats, houses, villas, plots, and commercial properties across Chennai, Coimbatore, Madurai, and more.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect rx='20' width='100' height='100' fill='%234A90E2'/><text x='50' y='68' font-size='50' font-weight='bold' text-anchor='middle' fill='white'>G</text></svg>">
  <link rel="stylesheet" href="css/global.css">
  <link rel="stylesheet" href="css/components.css">
  <link rel="stylesheet" href="css/pages.css">
</head>
<body>
  <!-- Navbar -->
  <nav class="navbar">
    <a href="landing.html" class="nav-logo"><span>Ghar</span>ForSale</a>
    <div class="nav-links">
      <a href="index.html" class="nav-link">Browse</a>
      <a href="filter.html" class="nav-link">Filter</a>
    </div>
    <div class="auth-section">
      <div class="shimmer" style="width:80px;height:32px;border-radius:var(--radius-sm)"></div>
    </div>
  </nav>
  <div class="navbar-spacer"></div>

  <!-- Hero Section -->
  <section class="landing-hero">
    <div class="container">
      <div class="hero-content">
        <h1 class="hero-title">Find Your Dream<br>Property in <span class="text-accent">Tamil Nadu</span></h1>
        <p class="hero-subtitle">Browse hundreds of flats, houses, villas, and plots across Chennai, Coimbatore, Madurai, Trichy, and more. Powered by AI investment insights.</p>
        <div class="hero-actions">
          <a href="index.html" class="btn btn-primary btn-lg">Browse Properties</a>
          <a href="login.html" class="btn btn-secondary btn-lg">List Your Property</a>
        </div>
        <div class="hero-stats">
          <div class="hero-stat">
            <div class="hero-stat-number">500+</div>
            <div class="hero-stat-label">Properties</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-number">10+</div>
            <div class="hero-stat-label">Cities</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-number">AI</div>
            <div class="hero-stat-label">Powered</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="landing-features">
    <div class="container">
      <h2 class="section-title text-center">Why GharForSale?</h2>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <h3>Smart Search</h3>
          <p>Filter by type, price, area, bedrooms, and location to find exactly what you need.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/></svg>
          </div>
          <h3>AI Analysis</h3>
          <p>Get investment scores, ROI predictions, and market insights powered by AI.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </div>
          <h3>Save Favorites</h3>
          <p>Bookmark properties you love and compare them later at your convenience.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <h3>Easy Listing</h3>
          <p>Sellers can list properties in minutes with our simple form — no hassle.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="landing-cta">
    <div class="container text-center">
      <h2>Ready to find your dream home?</h2>
      <p class="text-secondary mt-2">Join thousands of buyers and sellers on GharForSale</p>
      <a href="index.html" class="btn btn-primary btn-lg mt-3">Get Started</a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="landing-footer">
    <div class="container text-center">
      <p class="text-muted text-sm">Built with care for Tamil Nadu real estate. &copy; 2026 GharForSale</p>
    </div>
  </footer>

  <script type="module">
    import { initAuth } from './js/auth.js';
    initAuth();
  </script>
</body>
</html>
```

**Step 2: Add landing page CSS to `css/pages.css`**

Append the following at the end of `css/pages.css`:

```css

/* ==============================
   Landing Page
   ============================== */
.landing-hero {
  padding: 80px 0 60px;
  background-image: radial-gradient(ellipse at 50% 0%, rgba(74, 144, 226, 0.15) 0%, transparent 60%);
}

.hero-content {
  max-width: 700px;
  margin: 0 auto;
  text-align: center;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  line-height: 1.15;
  margin-bottom: 20px;
}

.hero-subtitle {
  font-size: 1.15rem;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 48px;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 48px;
}

.hero-stat {
  text-align: center;
}

.hero-stat-number {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--accent);
}

.hero-stat-label {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.landing-features {
  padding: 60px 0;
}

.landing-features .section-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 40px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.feature-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 32px 24px;
  text-align: center;
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
}

.feature-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(74, 144, 226, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  color: var(--accent);
}

.feature-card h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.feature-card p {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.landing-cta {
  padding: 60px 0;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  margin: 0 24px 60px;
}

.landing-cta h2 {
  font-size: 1.75rem;
  font-weight: 700;
}

.landing-footer {
  padding: 24px 0;
  border-top: 1px solid var(--border);
}

@media (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .hero-stats {
    gap: 32px;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .landing-cta {
    margin: 0 16px 48px;
    padding: 40px 24px;
  }
}
```

**Step 3: Verify visually**

Open `landing.html` in browser. Confirm:
- Hero section displays with title, subtitle, stats, CTA buttons
- Feature cards render in a 4-column grid
- Bottom CTA section renders
- Responsive: 2-col at tablet, 1-col at mobile
- Navbar auth section shows shimmer, then resolves

**Step 4: Commit**

```bash
git add landing.html css/pages.css
git commit -m "feat: add landing page with hero, features, and CTA sections"
```

---

## Phase 4: Mock Property Data

### Task 6: Create seed script for Tamil Nadu properties

Create a standalone script that seeds 15 mock properties across Tamil Nadu cities directly into Firestore.

**Files:**
- Create: `js/seed-data.js`

**Step 1: Create the seed data file**

Create `js/seed-data.js` with 15 realistic Tamil Nadu property listings:

```javascript
import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getMultipleStockImages } from './stock-images.js';

const MOCK_PROPERTIES = [
  {
    title: "Premium 3BHK Apartment in OMR",
    description: "Spacious 3BHK apartment in a gated community on Old Mahabalipuram Road. Close to IT parks, schools, and hospitals. 24/7 security, covered parking, and modern amenities.",
    price: 9500000,
    location: "OMR, Chennai",
    address: "Block C, Prestige Lakeside Habitat, Thoraipakkam, OMR, Chennai 600097",
    area: 1450,
    landArea: 0,
    landRate: 6552,
    bedrooms: 3,
    bathrooms: 2,
    type: "flat",
    status: "sale",
    furnishing: "semiFurnished",
    amenities: ["Parking", "Lift", "Security", "Gym", "Swimming Pool", "Power Backup", "CCTV", "Clubhouse"],
    ownerName: "Rajesh Kumar",
    ownerPhone: "+91 98765 43210"
  },
  {
    title: "Independent House in Anna Nagar",
    description: "Well-maintained independent house in the heart of Anna Nagar. Ground + 1 floor with terrace. Prime location near bus stops and metro station.",
    price: 25000000,
    location: "Anna Nagar, Chennai",
    address: "12, 3rd Avenue, Anna Nagar West, Chennai 600040",
    area: 2200,
    landArea: 1800,
    landRate: 13889,
    bedrooms: 4,
    bathrooms: 3,
    type: "house",
    status: "sale",
    furnishing: "fullyFurnished",
    amenities: ["Parking", "Garden", "Power Backup", "Water Supply", "Rain Water Harvesting"],
    ownerName: "Lakshmi Narayanan",
    ownerPhone: "+91 94445 12345"
  },
  {
    title: "Luxury Villa in ECR",
    description: "Stunning sea-facing villa on East Coast Road with private garden, swimming pool, and modern interiors. Perfect weekend getaway or permanent residence.",
    price: 45000000,
    location: "ECR, Chennai",
    address: "Plot 45, Beach Villas, Muttukadu, ECR, Chennai 603112",
    area: 3500,
    landArea: 4000,
    landRate: 11250,
    bedrooms: 5,
    bathrooms: 4,
    type: "villa",
    status: "sale",
    furnishing: "fullyFurnished",
    amenities: ["Parking", "Swimming Pool", "Garden", "Security", "Power Backup", "CCTV", "Clubhouse"],
    ownerName: "Arun Vijay",
    ownerPhone: "+91 90000 11111"
  },
  {
    title: "2BHK Flat for Rent in Adyar",
    description: "Comfortable 2BHK apartment available for rent in Adyar, close to IIT Madras and Adyar bus depot. Well-ventilated with balcony. Vegetarian family preferred.",
    price: 22000,
    location: "Adyar, Chennai",
    address: "Flat 3B, Srinivasa Apartments, Lattice Bridge Road, Adyar, Chennai 600020",
    area: 950,
    landArea: 0,
    landRate: 0,
    bedrooms: 2,
    bathrooms: 1,
    type: "flat",
    status: "rent",
    furnishing: "semiFurnished",
    amenities: ["Parking", "Lift", "Water Supply", "Power Backup"],
    ownerName: "Meena Sundaram",
    ownerPhone: "+91 98411 56789"
  },
  {
    title: "Residential Plot in Saravanampatti",
    description: "DTCP approved residential plot in a well-developed area of Saravanampatti, Coimbatore. Close to IT corridor, schools, and shopping centers. Ready for construction.",
    price: 3600000,
    location: "Saravanampatti, Coimbatore",
    address: "Survey No. 234, Saravanampatti, Coimbatore 641035",
    area: 1200,
    landArea: 1200,
    landRate: 3000,
    bedrooms: 0,
    bathrooms: 0,
    type: "plot",
    status: "sale",
    furnishing: "unfurnished",
    amenities: [],
    ownerName: "Ganesh Moorthy",
    ownerPhone: "+91 94433 22110"
  },
  {
    title: "Modern 3BHK in RS Puram",
    description: "Brand new 3BHK apartment in RS Puram, Coimbatore's prime locality. Walking distance to market, temples, and restaurants. Premium fittings and spacious rooms.",
    price: 8500000,
    location: "RS Puram, Coimbatore",
    address: "Arun Heights, DB Road, RS Puram, Coimbatore 641002",
    area: 1350,
    landArea: 0,
    landRate: 6296,
    bedrooms: 3,
    bathrooms: 2,
    type: "flat",
    status: "sale",
    furnishing: "unfurnished",
    amenities: ["Parking", "Lift", "Security", "Power Backup", "Water Supply", "Intercom"],
    ownerName: "Priya Rajan",
    ownerPhone: "+91 97899 44556"
  },
  {
    title: "Commercial Space in Madurai",
    description: "Prime commercial office space on Bypass Road, Madurai. Ideal for IT companies, showrooms, or clinics. Ground floor with road-facing visibility.",
    price: 12000000,
    location: "Bypass Road, Madurai",
    address: "No. 78, Bypass Road, K. Pudur, Madurai 625007",
    area: 1800,
    landArea: 2000,
    landRate: 6000,
    bedrooms: 0,
    bathrooms: 2,
    type: "commercial",
    status: "sale",
    furnishing: "unfurnished",
    amenities: ["Parking", "Lift", "Power Backup", "Fire Safety", "CCTV"],
    ownerName: "Vel Murugan",
    ownerPhone: "+91 94873 11223"
  },
  {
    title: "Farm House near Ooty",
    description: "Beautiful 2-acre farm house near Ooty with lush greenery, fruit orchards, and mountain views. Perfect for holidays and retirement living.",
    price: 35000000,
    location: "Coonoor, Nilgiris",
    address: "Tiger Hill Estate, Coonoor Road, Nilgiris 643101",
    area: 2800,
    landArea: 87120,
    landRate: 402,
    bedrooms: 3,
    bathrooms: 2,
    type: "farmHouse",
    status: "sale",
    furnishing: "fullyFurnished",
    amenities: ["Parking", "Garden", "Water Supply", "Power Backup", "Security"],
    ownerName: "Karthik Subramanian",
    ownerPhone: "+91 96005 77889"
  },
  {
    title: "1BHK PG in Velachery",
    description: "Fully furnished 1BHK PG accommodation near Phoenix Mall, Velachery. Includes Wi-Fi, meals, housekeeping. Best for working professionals.",
    price: 12000,
    location: "Velachery, Chennai",
    address: "No. 45, Vijayaraghava Road, Velachery, Chennai 600042",
    area: 400,
    landArea: 0,
    landRate: 0,
    bedrooms: 1,
    bathrooms: 1,
    type: "flat",
    status: "pg",
    furnishing: "fullyFurnished",
    amenities: ["Security", "Power Backup", "Water Supply", "Maintenance Staff"],
    ownerName: "Deepa Nagaraj",
    ownerPhone: "+91 99621 33445"
  },
  {
    title: "4BHK Duplex in Trichy",
    description: "Spacious 4BHK duplex house in Woraiyur, Trichy. Double-height living room, modular kitchen, car parking. Near Trichy Junction and BHEL.",
    price: 11000000,
    location: "Woraiyur, Trichy",
    address: "Plot 12, Kumaran Nagar, Woraiyur, Trichy 620003",
    area: 2400,
    landArea: 1600,
    landRate: 6875,
    bedrooms: 4,
    bathrooms: 3,
    type: "house",
    status: "sale",
    furnishing: "semiFurnished",
    amenities: ["Parking", "Garden", "Power Backup", "Water Supply", "Rain Water Harvesting"],
    ownerName: "Senthil Kumar",
    ownerPhone: "+91 97517 88990"
  },
  {
    title: "Agricultural Land in Thanjavur",
    description: "6 acres of fertile agricultural land in Thanjavur delta region. Ideal for paddy cultivation or farm investment. Water canal access available.",
    price: 18000000,
    location: "Thanjavur",
    address: "Survey No. 456, Orathanadu Road, Thanjavur 613004",
    area: 261360,
    landArea: 261360,
    landRate: 69,
    bedrooms: 0,
    bathrooms: 0,
    type: "land",
    status: "sale",
    furnishing: "unfurnished",
    amenities: [],
    ownerName: "Bala Krishnan",
    ownerPhone: "+91 94421 55667"
  },
  {
    title: "2BHK Flat for Lease in Tambaram",
    description: "Well-maintained 2BHK flat for lease in Tambaram East. Close to railway station, schools, and supermarkets. 11-month lease with security deposit.",
    price: 600000,
    location: "Tambaram, Chennai",
    address: "Flat 2A, Ganesh Apartments, Tambaram East, Chennai 600059",
    area: 850,
    landArea: 0,
    landRate: 0,
    bedrooms: 2,
    bathrooms: 1,
    type: "flat",
    status: "lease",
    furnishing: "unfurnished",
    amenities: ["Parking", "Water Supply", "Power Backup"],
    ownerName: "Kavitha Devi",
    ownerPhone: "+91 98840 22334"
  },
  {
    title: "Luxury Penthouse in T. Nagar",
    description: "Exclusive penthouse apartment in T. Nagar with panoramic city views. Private terrace, Italian marble flooring, and smart home features.",
    price: 32000000,
    location: "T. Nagar, Chennai",
    address: "Top Floor, Prestige Tower, Thyagaraja Road, T. Nagar, Chennai 600017",
    area: 3200,
    landArea: 0,
    landRate: 10000,
    bedrooms: 4,
    bathrooms: 4,
    type: "flat",
    status: "sale",
    furnishing: "fullyFurnished",
    amenities: ["Parking", "Lift", "Security", "Gym", "Swimming Pool", "Power Backup", "CCTV", "Clubhouse", "Intercom", "Fire Safety"],
    ownerName: "Anand Krishnamurthy",
    ownerPhone: "+91 90030 55667"
  },
  {
    title: "3BHK Villa in Salem",
    description: "Beautiful independent villa in Salem with modern architecture. Vastu-compliant design, modular kitchen, and landscaped garden.",
    price: 7200000,
    location: "Fairlands, Salem",
    address: "No. 22, Green Valley Layout, Fairlands, Salem 636016",
    area: 1800,
    landArea: 2400,
    landRate: 3000,
    bedrooms: 3,
    bathrooms: 2,
    type: "villa",
    status: "sale",
    furnishing: "semiFurnished",
    amenities: ["Parking", "Garden", "Power Backup", "Water Supply", "Rain Water Harvesting"],
    ownerName: "Mani Vannan",
    ownerPhone: "+91 94882 11223"
  },
  {
    title: "Office Space for Rent in Tidel Park",
    description: "Plug-and-play office space for rent near Tidel Park, Taramani. 50 workstations, server room, pantry, and conference room. Ideal for startups.",
    price: 85000,
    location: "Taramani, Chennai",
    address: "3rd Floor, Olympia Tech Park, SIDCO Industrial Estate, Taramani, Chennai 600113",
    area: 2500,
    landArea: 0,
    landRate: 0,
    bedrooms: 0,
    bathrooms: 3,
    type: "commercial",
    status: "rent",
    furnishing: "fullyFurnished",
    amenities: ["Parking", "Lift", "Security", "Power Backup", "Fire Safety", "CCTV", "Maintenance Staff"],
    ownerName: "Tech Realty Solutions",
    ownerPhone: "+91 44 4560 1234"
  }
];

export async function seedProperties() {
  const propertiesRef = collection(db, 'properties');
  let count = 0;

  for (const prop of MOCK_PROPERTIES) {
    const images = getMultipleStockImages(prop.type, 3);
    const docData = {
      ...prop,
      images,
      coordinates: { latitude: 0, longitude: 0 },
      ownerId: 'seed-data',
      additionalDetails: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await addDoc(propertiesRef, docData);
    count++;
    console.log(`Seeded property ${count}/${MOCK_PROPERTIES.length}: ${prop.title}`);
  }

  console.log(`Done! Seeded ${count} properties.`);
  return count;
}
```

**Step 2: Create a seed runner page**

Create `seed.html` (temporary admin page to run the seed):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seed Data — GharForSale Admin</title>
  <link rel="stylesheet" href="css/global.css">
  <link rel="stylesheet" href="css/components.css">
</head>
<body>
  <div style="max-width:600px;margin:80px auto;padding:24px;text-align:center">
    <h1>Seed Mock Properties</h1>
    <p class="text-secondary mt-2">This will add 15 Tamil Nadu properties to Firestore.</p>
    <button class="btn btn-primary btn-lg mt-3" id="seed-btn">Seed Properties</button>
    <div id="status" class="mt-3 text-secondary"></div>
  </div>

  <script type="module">
    import { seedProperties } from './js/seed-data.js';

    document.getElementById('seed-btn').addEventListener('click', async () => {
      const btn = document.getElementById('seed-btn');
      const status = document.getElementById('status');
      btn.disabled = true;
      btn.textContent = 'Seeding...';
      status.textContent = 'Adding properties to Firestore...';

      try {
        const count = await seedProperties();
        status.textContent = `Success! Added ${count} properties. Go to index.html to see them.`;
        status.style.color = 'var(--success)';
      } catch (err) {
        status.textContent = 'Error: ' + err.message;
        status.style.color = 'var(--error)';
        console.error(err);
      }

      btn.disabled = false;
      btn.textContent = 'Seed Properties';
    });
  </script>
</body>
</html>
```

**Step 3: Verify**

Open `seed.html` in browser. Click "Seed Properties". Verify 15 properties appear in Firebase Console under `properties` collection. Then navigate to `index.html` and verify property cards render with stock images.

**Step 4: Commit**

```bash
git add js/seed-data.js seed.html
git commit -m "feat: add mock property seed data for 15 Tamil Nadu properties"
```

---

## Phase 5: Stock Image Consistency

### Task 7: Fix stock image randomness

`getStockImage()` in `stock-images.js` uses `Math.random()` causing images to change on every page load. Make it deterministic using property ID.

**Files:**
- Modify: `js/stock-images.js:38-42`
- Modify: `js/ui.js:195-197`

**Step 1: Add deterministic image selection**

In `js/stock-images.js`, add a new function and modify `getStockImage`:

Replace:
```javascript
export function getStockImage(type) {
  const images = STOCK_IMAGES[type];
  if (!images || images.length === 0) return DEFAULT_IMAGE;
  return images[Math.floor(Math.random() * images.length)];
}
```

With:
```javascript
export function getStockImage(type, seed) {
  const images = STOCK_IMAGES[type];
  if (!images || images.length === 0) return DEFAULT_IMAGE;
  if (seed) {
    // Simple hash from string to deterministic index
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    return images[Math.abs(hash) % images.length];
  }
  return images[Math.floor(Math.random() * images.length)];
}
```

**Step 2: Pass property ID as seed in `createPropertyCard`**

In `js/ui.js`, find:
```javascript
  const image = (property.images && property.images.length > 0)
    ? property.images[0]
    : getStockImage(property.type);
```

Replace with:
```javascript
  const image = (property.images && property.images.length > 0)
    ? property.images[0]
    : getStockImage(property.type, property.id);
```

**Step 3: Verify**

Open `index.html`, note the property images. Refresh. Same images should appear for same properties.

**Step 4: Commit**

```bash
git add js/stock-images.js js/ui.js
git commit -m "fix: make stock image selection deterministic using property ID seed"
```

---

## Phase 6: Property Editing for Sellers

### Task 8: Add edit property page

Create an edit-property.html page that lets sellers modify their existing property listings.

**Files:**
- Create: `edit-property.html`

**Step 1: Create edit-property.html**

Create `edit-property.html` — this is structurally identical to `add-property.html` but pre-fills the form from an existing property and calls `updateProperty` instead of `createProperty`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edit Property — GharForSale</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect rx='20' width='100' height='100' fill='%234A90E2'/><text x='50' y='68' font-size='50' font-weight='bold' text-anchor='middle' fill='white'>G</text></svg>">
  <link rel="stylesheet" href="css/global.css">
  <link rel="stylesheet" href="css/components.css">
  <link rel="stylesheet" href="css/pages.css">
</head>
<body>
  <div class="toast-container" id="toast-container"></div>

  <nav class="navbar">
    <a href="index.html" class="nav-logo"><span>Ghar</span>ForSale</a>
    <div class="nav-links">
      <a href="index.html" class="nav-link">Home</a>
      <a href="favorites.html" class="nav-link">Favorites</a>
      <a href="profile.html" class="nav-link">Profile</a>
    </div>
    <div class="auth-section">
      <div class="shimmer" style="width:80px;height:32px;border-radius:var(--radius-sm)"></div>
    </div>
  </nav>
  <div class="navbar-spacer"></div>

  <div class="add-property-page">
    <div class="container">
      <div class="form-container">
        <h1>Edit Property</h1>
        <p class="form-subtitle">Update your property listing details</p>

        <form id="property-form">
          <h3 class="form-section-title">Basic Details</h3>
          <div class="form-group">
            <label class="form-label" for="title">Title *</label>
            <input type="text" id="title" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="description">Description *</label>
            <textarea id="description" class="form-textarea" required></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="price">Price (₹) *</label>
              <input type="number" id="price" class="form-input" min="0" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="area">Area (sqft) *</label>
              <input type="number" id="area" class="form-input" min="0" required>
            </div>
          </div>

          <h3 class="form-section-title">Location</h3>
          <div class="form-group">
            <label class="form-label" for="location">Location *</label>
            <input type="text" id="location" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="address">Full Address</label>
            <input type="text" id="address" class="form-input">
          </div>

          <h3 class="form-section-title">Property Information</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="type">Property Type *</label>
              <select id="type" class="form-select" required>
                <option value="flat">Flat/Apartment</option>
                <option value="house">House</option>
                <option value="villa">Villa</option>
                <option value="plot">Plot</option>
                <option value="commercial">Commercial</option>
                <option value="land">Land</option>
                <option value="farmHouse">Farm House</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="status">Listing Type *</label>
              <select id="status" class="form-select" required>
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
                <option value="lease">For Lease</option>
                <option value="pg">PG/Hostel</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="bedrooms">Bedrooms</label>
              <input type="number" id="bedrooms" class="form-input" min="0" max="10" value="0">
            </div>
            <div class="form-group">
              <label class="form-label" for="bathrooms">Bathrooms</label>
              <input type="number" id="bathrooms" class="form-input" min="0" max="10" value="0">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="furnishing">Furnishing</label>
            <select id="furnishing" class="form-select">
              <option value="unfurnished">Unfurnished</option>
              <option value="semiFurnished">Semi Furnished</option>
              <option value="fullyFurnished">Fully Furnished</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="landArea">Land Area (sqft)</label>
              <input type="number" id="landArea" class="form-input" min="0">
            </div>
            <div class="form-group">
              <label class="form-label" for="landRate">Land Rate (₹/sqft)</label>
              <input type="number" id="landRate" class="form-input" min="0">
            </div>
          </div>

          <h3 class="form-section-title">Amenities</h3>
          <div class="amenities-grid" id="amenities-grid"></div>

          <div class="form-submit">
            <button type="submit" class="btn btn-primary btn-lg">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <script type="module">
    import { requireRole, getCurrentUser, getCurrentUserData } from './js/auth.js';
    import { fetchPropertyById, updateProperty } from './js/properties.js';
    import { showToast, showLoader, hideLoader } from './js/ui.js';

    const propertyId = new URLSearchParams(window.location.search).get('id');
    if (!propertyId) {
      window.location.href = 'profile.html';
      throw new Error('No property ID');
    }

    const AMENITIES = [
      'Parking', 'Lift', 'Security', 'Gym', 'Swimming Pool', 'Garden',
      'Power Backup', 'Water Supply', 'Clubhouse', 'Fire Safety',
      'Intercom', 'Gas Pipeline', 'Visitor Parking', 'Maintenance Staff',
      'CCTV', 'Rain Water Harvesting'
    ];

    const amenitiesGrid = document.getElementById('amenities-grid');
    AMENITIES.forEach(amenity => {
      const label = document.createElement('label');
      label.className = 'amenity-checkbox';
      label.innerHTML = `<input type="checkbox" value="${amenity}"><span>${amenity}</span>`;
      label.addEventListener('click', () => {
        setTimeout(() => {
          label.classList.toggle('selected', label.querySelector('input').checked);
        }, 0);
      });
      amenitiesGrid.appendChild(label);
    });

    requireRole('seller', async (user, userData) => {
      try {
        const property = await fetchPropertyById(propertyId);
        if (!property) {
          showToast('Property not found', 'error');
          window.location.href = 'profile.html';
          return;
        }
        if (property.ownerId !== user.uid && property.ownerId !== 'seed-data') {
          showToast('You can only edit your own properties', 'error');
          window.location.href = 'profile.html';
          return;
        }
        prefillForm(property);
      } catch (err) {
        showToast('Failed to load property', 'error');
        console.error(err);
      }
    });

    function prefillForm(p) {
      document.getElementById('title').value = p.title || '';
      document.getElementById('description').value = p.description || '';
      document.getElementById('price').value = p.price || '';
      document.getElementById('area').value = p.area || '';
      document.getElementById('location').value = p.location || '';
      document.getElementById('address').value = p.address || '';
      document.getElementById('type').value = p.type || 'house';
      document.getElementById('status').value = p.status || 'sale';
      document.getElementById('bedrooms').value = p.bedrooms || 0;
      document.getElementById('bathrooms').value = p.bathrooms || 0;
      document.getElementById('furnishing').value = p.furnishing || 'unfurnished';
      document.getElementById('landArea').value = p.landArea || '';
      document.getElementById('landRate').value = p.landRate || '';

      if (p.amenities && p.amenities.length > 0) {
        document.querySelectorAll('#amenities-grid input[type="checkbox"]').forEach(cb => {
          if (p.amenities.includes(cb.value)) {
            cb.checked = true;
            cb.closest('.amenity-checkbox').classList.add('selected');
          }
        });
      }
    }

    document.getElementById('property-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const updates = {
        title: document.getElementById('title').value.trim(),
        description: document.getElementById('description').value.trim(),
        price: parseFloat(document.getElementById('price').value) || 0,
        area: parseFloat(document.getElementById('area').value) || 0,
        location: document.getElementById('location').value.trim(),
        address: document.getElementById('address').value.trim(),
        type: document.getElementById('type').value,
        status: document.getElementById('status').value,
        bedrooms: parseInt(document.getElementById('bedrooms').value) || 0,
        bathrooms: parseInt(document.getElementById('bathrooms').value) || 0,
        furnishing: document.getElementById('furnishing').value,
        landArea: parseFloat(document.getElementById('landArea').value) || 0,
        landRate: parseFloat(document.getElementById('landRate').value) || 0,
        amenities: Array.from(document.querySelectorAll('#amenities-grid input[type="checkbox"]:checked')).map(cb => cb.value)
      };

      if (!updates.title || !updates.description || !updates.price || !updates.area || !updates.location) {
        showToast('Please fill in all required fields', 'error');
        return;
      }

      showLoader();
      try {
        await updateProperty(propertyId, updates);
        showToast('Property updated!', 'success');
        setTimeout(() => window.location.href = 'profile.html', 1000);
      } catch (err) {
        showToast('Failed: ' + err.message, 'error');
        console.error(err);
      } finally {
        hideLoader();
      }
    });
  </script>
</body>
</html>
```

**Step 2: Add Edit button to seller's listings in `profile.html`**

In `profile.html`, find the section where the delete button is created (inside `loadListings`). After the delete button code, add an edit button. Replace the delete button block with both edit and delete:

Find in `profile.html` (inside the `listings.forEach` callback):
```javascript
          // Add delete button overlay
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'btn btn-danger btn-sm';
          deleteBtn.style.cssText = 'position:absolute;bottom:8px;right:8px;z-index:10;padding:6px 12px;font-size:0.75rem';
          deleteBtn.textContent = 'Delete';
```

Replace the entire block from `// Add delete button overlay` through `grid.appendChild(card);` with:

```javascript
          // Add action buttons overlay
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'listing-actions';
          actionsDiv.style.cssText = 'position:absolute;bottom:8px;right:8px;z-index:10;display:flex;gap:6px';

          const editBtn = document.createElement('a');
          editBtn.className = 'btn btn-primary btn-sm';
          editBtn.style.cssText = 'padding:6px 12px;font-size:0.75rem;text-decoration:none';
          editBtn.textContent = 'Edit';
          editBtn.href = `edit-property.html?id=${p.id}`;
          editBtn.addEventListener('click', (e) => e.stopPropagation());

          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'btn btn-danger btn-sm';
          deleteBtn.style.cssText = 'padding:6px 12px;font-size:0.75rem';
          deleteBtn.textContent = 'Delete';
          deleteBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this property?')) {
              try {
                await deleteProperty(p.id);
                card.style.animation = 'fadeOut 0.3s ease forwards';
                setTimeout(() => card.remove(), 300);
                showToast('Property deleted', 'success');
              } catch (err) {
                showToast('Failed to delete property', 'error');
              }
            }
          });

          actionsDiv.appendChild(editBtn);
          actionsDiv.appendChild(deleteBtn);
          card.style.position = 'relative';
          card.appendChild(actionsDiv);
          grid.appendChild(card);
```

**Step 3: Verify**

Log in as seller. Go to profile. Listings should show both "Edit" and "Delete" buttons. Click "Edit" — navigates to edit-property.html with form pre-filled. Submit changes — property updates in Firestore.

**Step 4: Commit**

```bash
git add edit-property.html profile.html
git commit -m "feat: add property editing page for sellers with edit button on listings"
```

---

## Phase 7: Mobile & UX Fixes

### Task 9: Fix filter page double bottom nav

Filter page has `style="bottom:60px"` on the bottom nav, which causes the nav to float above the filter footer, resulting in double fixed bars on mobile.

**Files:**
- Modify: `filter.html:124`

**Step 1: Remove the inline bottom override**

In `filter.html`, find:
```html
<div class="bottom-nav" style="bottom:60px">
```

Replace with:
```html
<div class="bottom-nav">
```

The `filter-footer` already uses `z-index: 100` and the bottom-nav uses `z-index: 1000`, so the bottom-nav will naturally stack above. The `filter-page` already has `padding-bottom: 120px` (and `160px` on mobile) to account for both bars.

**Step 2: Commit**

```bash
git add filter.html
git commit -m "fix: remove inline bottom offset from filter page bottom nav"
```

---

### Task 10: Fix add-property bottom nav always showing active add button

The add-property page bottom nav always shows the add button with `active` class regardless of user role.

**Files:**
- Modify: `add-property.html:161`

**Step 1: Fix the bottom nav add button**

In `add-property.html`, find:
```html
      <a href="add-property.html" class="bottom-nav-item add-btn active">
```

Replace with:
```html
      <a href="add-property.html" class="bottom-nav-item add-btn">
```

The button visibility is already controlled by `requireRole('seller')` via JS, so the `active` class styling is redundant. The `add-btn` class already provides the gradient styling.

**Step 2: Commit**

```bash
git add add-property.html
git commit -m "fix: remove hardcoded active class from add-property bottom nav button"
```

---

### Task 11: Add FAB button hiding on mobile for desktop-only

The FAB (floating action button) overlaps with the bottom nav add button on mobile. Hide FAB on mobile since the bottom nav already has the add button.

**Files:**
- Already handled: `css/components.css:889-892` has `.fab { bottom: 88px }` for mobile, which works. No change needed — the FAB is already offset. Skip this task.

---

## Phase 8: SEO & Meta

### Task 12: Add meta tags and Open Graph to key pages

**Files:**
- Modify: `index.html` (add meta description, OG tags)
- Modify: `landing.html` (already has meta description)

**Step 1: Add meta tags to index.html**

In `index.html`, after line 5 (`<meta name="viewport" ...>`), add:
```html
  <meta name="description" content="Browse real estate properties across Tamil Nadu - flats, houses, villas, plots, and commercial spaces. AI-powered investment analysis.">
  <meta property="og:title" content="GharForSale — Real Estate Marketplace">
  <meta property="og:description" content="Find your dream property in Tamil Nadu with AI-powered insights.">
  <meta property="og:type" content="website">
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add SEO meta tags and Open Graph to index page"
```

---

## Phase 9: Final Polish

### Task 13: Add Vercel rewrite for landing page as default entry

Update `vercel.json` so the root URL (`/`) serves `landing.html` instead of the default `index.html`.

**Files:**
- Modify: `vercel.json`

**Step 1: Add root rewrite**

Replace `vercel.json` contents with:

```json
{
  "outputDirectory": ".",
  "rewrites": [
    { "source": "/", "destination": "/landing.html" },
    { "source": "/api/(.*)", "destination": "/api/$1" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

**Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: route root URL to landing page"
```

---

### Task 14: Push all changes and verify deployment

**Step 1: Push to GitHub**

```bash
git push origin main
```

**Step 2: Wait for Vercel auto-deploy**

Check Vercel dashboard for deployment status. Verify:
- Root URL shows landing page
- `/index.html` shows property listings
- Login/auth flow works
- Properties from seed data display
- Shimmer cards show proper animation
- Navbar shows correct auth state

**Step 3: Run the seed script**

Navigate to `https://gharforsale-web.vercel.app/seed.html` and click "Seed Properties" to populate Firestore with 15 Tamil Nadu properties.

---

## Summary of all tasks

| # | Task | Priority | Est. |
|---|------|----------|------|
| 1 | Fix navbar auth flash | Critical | 5 min |
| 2 | Fix shimmer contrast | Critical | 2 min |
| 3 | Lock Firestore rules | Critical | 5 min |
| 4 | Deploy Firestore indexes | High | 5 min |
| 5 | Create landing page | High | 10 min |
| 6 | Seed Tamil Nadu properties | High | 10 min |
| 7 | Fix stock image randomness | Medium | 5 min |
| 8 | Add property editing | High | 10 min |
| 9 | Fix filter double nav | Low | 2 min |
| 10 | Fix add-property active class | Low | 2 min |
| 12 | Add SEO meta tags | Medium | 3 min |
| 13 | Landing page as root | Medium | 3 min |
| 14 | Push and verify deployment | High | 5 min |
