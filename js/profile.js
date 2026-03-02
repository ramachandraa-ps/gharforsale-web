import { db } from './firebase-config.js';
import { doc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export async function getUserProfile(uid) {
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) return null;
  return userDoc.data();
}

export async function updateUserProfile(uid, updates) {
  const allowedFields = ['displayName', 'phoneNumber', 'address'];
  const sanitized = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      sanitized[key] = updates[key];
    }
  }
  sanitized.updatedAt = serverTimestamp();

  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, sanitized);
  return sanitized;
}
