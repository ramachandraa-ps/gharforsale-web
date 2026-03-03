import { auth, db, googleProvider } from './firebase-config.js';
import { onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { showToast } from './ui.js';

let currentUser = null;
let currentUserData = null;

export function getCurrentUser() {
  return currentUser;
}

export function getCurrentUserData() {
  return currentUserData;
}

export function initAuth(onReady) {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        currentUserData = userDoc.exists() ? userDoc.data() : null;
      } catch (err) {
        console.error('Error fetching user data:', err);
        currentUserData = null;
      }
    } else {
      currentUserData = null;
    }
    updateNavbar(currentUser, currentUserData);
    if (onReady) onReady(currentUser, currentUserData);
  });
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  // Create Firestore user doc if first-time sign-in
  const userDocRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      role: null,
      phoneNumber: user.phoneNumber || '',
      address: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  return result;
}

export async function handleSignOut() {
  await signOut(auth);
  currentUser = null;
  currentUserData = null;
  window.location.href = 'login.html';
}

export async function setUserRole(role) {
  if (!currentUser) return;
  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, {
    role: role,
    updatedAt: serverTimestamp()
  });
  if (currentUserData) {
    currentUserData.role = role;
  } else {
    currentUserData = { role };
  }
}

export function requireAuth(callback) {
  initAuth((user, userData) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    callback(user, userData);
  });
}

export function requireRole(role, callback) {
  initAuth((user, userData) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    if (userData?.role !== role) {
      showToast(`This page requires ${role} access`, 'error');
      window.location.href = 'index.html';
      return;
    }
    callback(user, userData);
  });
}

export function updateNavbar(user, userData) {
  const authSection = document.querySelector('.navbar .auth-section');
  if (!authSection) return;

  if (user) {
    const avatarUrl = user.photoURL || '';
    const displayName = userData?.displayName || user.displayName || 'User';
    const initial = displayName.charAt(0).toUpperCase();

    const avatarHtml = avatarUrl
      ? `<img src="${avatarUrl}" alt="" class="user-avatar" referrerpolicy="no-referrer">`
      : `<div class="user-avatar" style="background:var(--accent-gradient);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.85rem;color:white">${initial}</div>`;

    authSection.innerHTML = `
      <div class="user-menu">
        <button class="flex items-center gap-2" style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:8px">
          ${avatarHtml}
          <span class="user-name">${displayName}</span>
        </button>
        <div class="user-menu-dropdown hidden" id="user-dropdown">
          <a href="profile.html">Profile</a>
          <button id="nav-signout-btn">Sign Out</button>
        </div>
      </div>`;

    const menuBtn = authSection.querySelector('.user-menu > button');
    const dropdown = document.getElementById('user-dropdown');

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      dropdown.classList.add('hidden');
    });

    const signOutBtn = document.getElementById('nav-signout-btn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', handleSignOut);
    }
  } else {
    authSection.innerHTML = `<a href="login.html" class="btn btn-primary btn-sm">Sign In</a>`;
  }
}
