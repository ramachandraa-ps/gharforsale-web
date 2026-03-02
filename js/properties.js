import { db } from './firebase-config.js';
import {
  collection, query, where, orderBy, limit, startAfter,
  getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getMultipleStockImages } from './stock-images.js';

const PROPERTIES_COLLECTION = 'properties';

export async function fetchProperties(options = {}) {
  const {
    type, status, minPrice, maxPrice, minArea, maxArea,
    bedrooms, furnishing, location, searchTerm,
    pageSize = 20, lastDoc = null
  } = options;

  let q;
  const constraints = [];
  const collectionRef = collection(db, PROPERTIES_COLLECTION);

  // Firestore equality filters (indexed)
  if (type) {
    constraints.push(where('type', '==', type));
  }
  if (status) {
    constraints.push(where('status', '==', status));
  }
  if (furnishing) {
    constraints.push(where('furnishing', '==', furnishing));
  }

  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(pageSize));

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  q = query(collectionRef, ...constraints);

  const snapshot = await getDocs(q);
  let properties = [];
  let newLastDoc = null;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    data.id = docSnap.id;
    properties.push(data);
  });

  if (snapshot.docs.length > 0) {
    newLastDoc = snapshot.docs[snapshot.docs.length - 1];
  } else {
    newLastDoc = null;
  }

  // Client-side filters for range queries (same pattern as Flutter app)
  if (minPrice != null) {
    properties = properties.filter(p => (p.price || 0) >= minPrice);
  }
  if (maxPrice != null) {
    properties = properties.filter(p => (p.price || 0) <= maxPrice);
  }
  if (minArea != null) {
    properties = properties.filter(p => (p.area || 0) >= minArea);
  }
  if (maxArea != null) {
    properties = properties.filter(p => (p.area || 0) <= maxArea);
  }
  if (bedrooms != null && bedrooms !== 'any') {
    const bed = parseInt(bedrooms);
    if (bed >= 5) {
      properties = properties.filter(p => (p.bedrooms || 0) >= 5);
    } else {
      properties = properties.filter(p => (p.bedrooms || 0) === bed);
    }
  }
  if (location) {
    const loc = location.toLowerCase();
    properties = properties.filter(p =>
      (p.location || '').toLowerCase().includes(loc) ||
      (p.address || '').toLowerCase().includes(loc)
    );
  }
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    properties = properties.filter(p =>
      (p.title || '').toLowerCase().includes(term) ||
      (p.location || '').toLowerCase().includes(term) ||
      (p.address || '').toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term)
    );
  }

  return { properties, lastDoc: newLastDoc };
}

export async function fetchPropertyById(id) {
  const docRef = doc(db, PROPERTIES_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  data.id = docSnap.id;
  return data;
}

export async function fetchPropertiesByOwner(ownerId) {
  const q = query(
    collection(db, PROPERTIES_COLLECTION),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  const properties = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    data.id = docSnap.id;
    properties.push(data);
  });
  return properties;
}

export async function createProperty(data) {
  const docData = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const docRef = await addDoc(collection(db, PROPERTIES_COLLECTION), docData);
  return docRef.id;
}

export async function updateProperty(id, updates) {
  const docRef = doc(db, PROPERTIES_COLLECTION, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export async function deleteProperty(id) {
  const docRef = doc(db, PROPERTIES_COLLECTION, id);
  await deleteDoc(docRef);
}

export async function searchProperties(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') return [];

  const term = searchTerm.trim();
  const termEnd = term + '\uf8ff';

  // Search by title
  const titleQuery = query(
    collection(db, PROPERTIES_COLLECTION),
    where('title', '>=', term),
    where('title', '<=', termEnd),
    limit(20)
  );

  // Search by location
  const locationQuery = query(
    collection(db, PROPERTIES_COLLECTION),
    where('location', '>=', term),
    where('location', '<=', termEnd),
    limit(20)
  );

  const [titleSnap, locationSnap] = await Promise.all([
    getDocs(titleQuery),
    getDocs(locationQuery)
  ]);

  const resultsMap = new Map();

  titleSnap.forEach((docSnap) => {
    const data = docSnap.data();
    data.id = docSnap.id;
    resultsMap.set(docSnap.id, data);
  });

  locationSnap.forEach((docSnap) => {
    if (!resultsMap.has(docSnap.id)) {
      const data = docSnap.data();
      data.id = docSnap.id;
      resultsMap.set(docSnap.id, data);
    }
  });

  return Array.from(resultsMap.values());
}

export function buildPropertyObject(formData, userData) {
  const type = formData.type || 'house';
  const images = getMultipleStockImages(type, 3);

  return {
    title: formData.title || '',
    description: formData.description || '',
    price: parseFloat(formData.price) || 0,
    location: formData.location || '',
    address: formData.address || '',
    area: parseFloat(formData.area) || 0,
    landArea: parseFloat(formData.landArea) || 0,
    landRate: parseFloat(formData.landRate) || 0,
    bedrooms: parseInt(formData.bedrooms) || 0,
    bathrooms: parseInt(formData.bathrooms) || 0,
    type: type,
    status: formData.status || 'sale',
    furnishing: formData.furnishing || 'unfurnished',
    images: images,
    coordinates: { latitude: 0, longitude: 0 },
    ownerId: userData?.uid || '',
    ownerName: userData?.displayName || '',
    ownerPhone: userData?.phoneNumber || '',
    amenities: formData.amenities || [],
    additionalDetails: {}
  };
}
