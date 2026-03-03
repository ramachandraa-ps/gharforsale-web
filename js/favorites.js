import { db } from './firebase-config.js';
import {
  collection, doc, getDocs, getDoc, setDoc, deleteDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { fetchPropertyById } from './properties.js';

export async function addFavorite(userId, propertyId) {
  const favRef = doc(db, 'users', userId, 'favorites', propertyId);
  await setDoc(favRef, {
    propertyId: propertyId,
    addedAt: serverTimestamp()
  });
}

export async function removeFavorite(userId, propertyId) {
  const favRef = doc(db, 'users', userId, 'favorites', propertyId);
  await deleteDoc(favRef);
}

export async function isFavorite(userId, propertyId) {
  if (!userId || !propertyId) return false;
  const favRef = doc(db, 'users', userId, 'favorites', propertyId);
  const favDoc = await getDoc(favRef);
  return favDoc.exists();
}

export async function getFavorites(userId) {
  if (!userId) return [];
  const favsRef = collection(db, 'users', userId, 'favorites');
  const snapshot = await getDocs(favsRef);

  const propertyIds = [];
  snapshot.forEach((docSnap) => {
    propertyIds.push(docSnap.id);
  });

  if (propertyIds.length === 0) return [];

  // Fetch all properties in parallel instead of sequentially
  const results = await Promise.all(
    propertyIds.map(id => fetchPropertyById(id).catch(() => null))
  );

  return results.filter(Boolean);
}

export async function toggleFavorite(userId, propertyId) {
  const isFav = await isFavorite(userId, propertyId);
  if (isFav) {
    await removeFavorite(userId, propertyId);
    return false;
  } else {
    await addFavorite(userId, propertyId);
    return true;
  }
}
