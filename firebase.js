// ===========================================================
// InvoChat AI — Firebase bootstrap (modular SDK, CDN build)
// Connected to your naijabiz-436e7 Firebase project.
// ===========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC3VYhOmwq4wKfhek-2BJPM29zX0YbKLxc",
  authDomain: "naijabiz-436e7.firebaseapp.com",
  databaseURL: "https://naijabiz-436e7-default-rtdb.firebaseio.com",
  projectId: "naijabiz-436e7",
  storageBucket: "naijabiz-436e7.firebasestorage.app",
  messagingSenderId: "241357426874",
  appId: "1:241357426874:web:7dc429998b5b05c6087283",
  measurementId: "G-406XNHHRPV"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// NOTE: This build does not use Firebase Storage (which requires the paid
// Blaze plan). Business logos are instead resized client-side and stored
// as base64 data URIs directly on the user's Firestore document — see
// settings.js. If you later upgrade to Blaze and want full-resolution
// asset storage, re-add `getStorage` here and wire it back into settings.js.

setPersistence(auth, browserLocalPersistence).catch(() => {});