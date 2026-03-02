import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCrDIn3z1GdmceP0pbea2stnQjohrT2Ox8",
  authDomain: "gharforsale-3ea48.firebaseapp.com",
  projectId: "gharforsale-3ea48",
  storageBucket: "gharforsale-3ea48.firebasestorage.app",
  messagingSenderId: "293372317683",
  appId: "1:293372317683:web:4b9379394179ea1ba54c86",
  measurementId: "G-2XXVTTSSLF"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
