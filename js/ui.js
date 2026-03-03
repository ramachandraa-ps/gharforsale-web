import { getStockImage } from './stock-images.js';

// ==============================
// Toast Notifications
// ==============================
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  toast.innerHTML = `${icons[type] || icons.info}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==============================
// Loading Overlay
// ==============================
export function showLoader() {
  if (document.getElementById('loading-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.id = 'loading-overlay';
  overlay.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(overlay);
}

export function hideLoader() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.remove();
}

// ==============================
// Shimmer Skeleton
// ==============================
export function showShimmerGrid(containerId, count = 6) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'shimmer shimmer-card';
    container.appendChild(card);
  }
}

export function removeShimmerGrid(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
}

// ==============================
// Price Formatting
// ==============================
export function formatPrice(price, status) {
  if (!price && price !== 0) return '₹0';

  let formatted;
  if (price >= 10000000) {
    formatted = '₹' + (price / 10000000).toFixed(2) + ' Cr';
  } else if (price >= 100000) {
    formatted = '₹' + (price / 100000).toFixed(2) + ' L';
  } else {
    formatted = '₹' + price.toLocaleString('en-IN');
  }

  if (status === 'rent' || status === 'lease' || status === 'pg') {
    formatted += '/month';
  }

  return formatted;
}

// ==============================
// Display Name Helpers
// ==============================
const PROPERTY_TYPE_TEXT = {
  flat: 'Flat/Apartment',
  house: 'House',
  villa: 'Villa',
  plot: 'Plot',
  commercial: 'Commercial',
  land: 'Land',
  farmHouse: 'Farm House'
};

const PROPERTY_STATUS_TEXT = {
  sale: 'For Sale',
  rent: 'For Rent',
  lease: 'For Lease',
  pg: 'PG/Hostel',
  sold: 'Sold',
  rented: 'Rented',
  pending: 'Pending',
  inactive: 'Inactive'
};

const FURNISHING_TEXT = {
  unfurnished: 'Unfurnished',
  semiFurnished: 'Semi Furnished',
  fullyFurnished: 'Fully Furnished'
};

const STATUS_COLORS = {
  sale: '#4A90E2',
  rent: '#38b2ac',
  lease: '#f6ad55',
  pg: '#9F7AEA',
  sold: '#fc5c65',
  rented: '#fc5c65',
  pending: '#f6ad55',
  inactive: '#718096'
};

export function getPropertyTypeText(type) {
  return PROPERTY_TYPE_TEXT[type] || type || 'Unknown';
}

export function getPropertyStatusText(status) {
  return PROPERTY_STATUS_TEXT[status] || status || 'Unknown';
}

export function getFurnishingText(furnishing) {
  return FURNISHING_TEXT[furnishing] || furnishing || 'N/A';
}

export function getStatusColor(status) {
  return STATUS_COLORS[status] || '#718096';
}

// ==============================
// Time Ago
// ==============================
export function timeAgo(timestamp) {
  if (!timestamp) return '';

  let date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }

  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffWeek < 5) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
  return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
}

// ==============================
// XSS Protection
// ==============================
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ==============================
// Property Card Renderer
// ==============================
export function createPropertyCard(property) {
  const image = (property.images && property.images.length > 0)
    ? property.images[0]
    : getStockImage(property.type, property.id);

  const statusColor = getStatusColor(property.status);
  const statusText = getPropertyStatusText(property.status);
  const typeText = getPropertyTypeText(property.type);
  const price = formatPrice(property.price, property.status);
  const time = timeAgo(property.createdAt);

  const bedroomsHtml = property.bedrooms != null ? `
    <span class="spec-badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7"/><path d="M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"/><path d="M3 11h18"/></svg>
      ${escapeHtml(String(property.bedrooms))} Bed
    </span>` : '';

  const bathroomsHtml = property.bathrooms != null ? `
    <span class="spec-badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z"/><path d="M6 12V5a2 2 0 0 1 2-2h3v2.25"/></svg>
      ${escapeHtml(String(property.bathrooms))} Bath
    </span>` : '';

  const areaHtml = property.area ? `
    <span class="spec-badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
      ${escapeHtml(String(property.area))} sqft
    </span>` : '';

  return `
    <a href="property-detail.html?id=${escapeHtml(property.id)}" class="property-card">
      <div class="card-image">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(property.title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=60'">
        <span class="card-badge status-badge" style="background:${statusColor};color:white">${escapeHtml(statusText)}</span>
        <span class="card-badge type-badge">${escapeHtml(typeText)}</span>
      </div>
      <div class="card-content">
        <div class="card-title">${escapeHtml(property.title)}</div>
        <div class="card-price">${price}</div>
        <div class="card-location">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${escapeHtml(property.location || property.address || 'Location not specified')}
        </div>
        <div class="card-specs">
          ${bedroomsHtml}${bathroomsHtml}${areaHtml}
        </div>
        <div class="card-footer">
          <span>${escapeHtml(property.ownerName || 'Owner')}</span>
          <span>${time}</span>
        </div>
      </div>
    </a>`;
}
