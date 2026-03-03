export const STOCK_IMAGES = {
  flat: [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=60"
  ],
  house: [
    "https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1598228723793-52759bba239c?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?auto=format&fit=crop&w=800&q=60"
  ],
  villa: [
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=800&q=60"
  ],
  plot: [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1586788224331-947f68671cf1?auto=format&fit=crop&w=800&q=60"
  ],
  commercial: [
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1564069114553-7215e1ff1890?auto=format&fit=crop&w=800&q=60"
  ],
  land: [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1592595896551-12b371d546d5?auto=format&fit=crop&w=800&q=60"
  ],
  farmHouse: [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=60",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=60"
  ]
};

export const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=60";

export function getStockImage(type, seed) {
  const images = STOCK_IMAGES[type];
  if (!images || images.length === 0) return DEFAULT_IMAGE;
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    return images[Math.abs(hash) % images.length];
  }
  return images[Math.floor(Math.random() * images.length)];
}

export function getMultipleStockImages(type, count) {
  const images = STOCK_IMAGES[type];
  if (!images || images.length === 0) {
    return Array(count).fill(DEFAULT_IMAGE);
  }
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(images[i % images.length]);
  }
  return result;
}
