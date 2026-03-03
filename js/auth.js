import { auth, db, googleProvider } from './firebase-config.js';
import {
  onAuthStateChanged, signInWithRedirect, getRedirectResult, signOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { showToast, escapeHtml } from './ui.js';

let currentUser = null;
let currentUserData = null;
let authInitialized = false;
let authListeners = [];

export function getCurrentUser() {
  return currentUser;
}

export function getCurrentUserData() {
  return currentUserData;
}

/**
 * Ensures a Firestore user document exists for the given Firebase Auth user.
 * Creates one if missing (first-time sign-in).
 */
async function ensureUserDoc(user) {
  const userDocRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    const newData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      role: null,
      phoneNumber: user.phoneNumber || '',
      address: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(userDocRef, newData);
    return { ...newData, role: null };
  }

  return userDoc.data();
}

export function initAuth(onReady) {
  // Singleton guard - only register onAuthStateChanged once
  if (!authInitialized) {
    authInitialized = true;
    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      if (user) {
        try {
          currentUserData = await ensureUserDoc(user);
        } catch (err) {
          console.error('Error fetching user data:', err);
          currentUserData = null;
        }
      } else {
        currentUserData = null;
      }
      updateNavbar(currentUser, currentUserData);
      // Notify all registered listeners
      authListeners.forEach(fn => fn(currentUser, currentUserData));
    });
  }

  if (onReady) {
    authListeners.push(onReady);
  }
}

/**
 * Initiates Google sign-in via full-page redirect (no popup, no COOP issues).
 * After sign-in, the browser redirects back to the current page.
 * Use handleRedirectResult() on page load to get the result.
 */
export function signInWithGoogle() {
  return signInWithRedirect(auth, googleProvider);
}

/**
 * Call on page load to check if we're returning from a redirect sign-in.
 * Returns {user, userData} if returning from redirect, null otherwise.
 */
export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const userData = await ensureUserDoc(result.user);
      currentUser = result.user;
      currentUserData = userData;
      return { user: result.user, userData };
    }
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
      console.error('Redirect result error:', err);
      throw err;
    }
  }
  return null;
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

  // Use setDoc with merge in case doc doesn't exist yet (race condition)
  await setDoc(userDocRef, {
    role: role,
    updatedAt: serverTimestamp()
  }, { merge: true });

  if (currentUserData) {
    currentUserData.role = role;
  } else {
    currentUserData = { role };
  }
}

export function requireAuth(callback) {
  let called = false;
  initAuth((user, userData) => {
    if (called) return;
    // Skip the initial null emission - wait for auth to resolve
    if (user === null && !auth.currentUser) {
      setTimeout(() => {
        if (!currentUser) {
          called = true;
          window.location.href = 'login.html';
        }
      }, 2000);
      return;
    }
    if (!user) {
      called = true;
      window.location.href = 'login.html';
      return;
    }
    called = true;
    callback(user, userData);
  });
}

export function requireRole(role, callback) {
  let called = false;
  initAuth((user, userData) => {
    if (called) return;
    if (user === null && !auth.currentUser) {
      setTimeout(() => {
        if (!currentUser) {
          called = true;
          window.location.href = 'login.html';
        }
      }, 2000);
      return;
    }
    if (!user) {
      called = true;
      window.location.href = 'login.html';
      return;
    }
    if (userData?.role !== role) {
      called = true;
      showToast(`This page requires ${role} access`, 'error');
      window.location.href = 'index.html';
      return;
    }
    called = true;
    callback(user, userData);
  });
}

// Track cleanup to prevent memory leaks
let dropdownCleanup = null;

export function updateNavbar(user, userData) {
  const authSection = document.querySelector('.navbar .auth-section');
  if (!authSection) return;

  // Clean up previous event listeners
  if (dropdownCleanup) {
    dropdownCleanup();
    dropdownCleanup = null;
  }

  if (user) {
    const avatarUrl = user.photoURL || '';
    const displayName = escapeHtml(userData?.displayName || user.displayName || 'User');
    const initial = displayName.charAt(0).toUpperCase();

    const avatarHtml = avatarUrl
      ? `<img src="${escapeHtml(avatarUrl)}" alt="" class="user-avatar" referrerpolicy="no-referrer">`
      : `<div class="user-avatar" style="background:var(--accent-gradient);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.85rem;color:white">${initial}</div>`;

    authSection.innerHTML = `
      <div class="user-menu">
        <button style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:8px">
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

    const toggleDropdown = (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    };
    const closeDropdown = () => dropdown.classList.add('hidden');
    const handleEsc = (e) => { if (e.key === 'Escape') closeDropdown(); };

    menuBtn.addEventListener('click', toggleDropdown);
    document.addEventListener('click', closeDropdown);
    document.addEventListener('keydown', handleEsc);

    // Store cleanup function
    dropdownCleanup = () => {
      menuBtn.removeEventListener('click', toggleDropdown);
      document.removeEventListener('click', closeDropdown);
      document.removeEventListener('keydown', handleEsc);
    };

    const signOutBtn = document.getElementById('nav-signout-btn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', handleSignOut);
    }
  } else {
    authSection.innerHTML = `<a href="login.html" class="btn btn-primary btn-sm">Sign In</a>`;
  }
}
