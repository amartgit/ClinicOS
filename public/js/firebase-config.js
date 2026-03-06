// ============================================================
// ClinicOS – Firebase Configuration & Initialization
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// Your REAL Firebase configuration

const firebaseConfig = {
  apiKey: "AIzaSyCaEqKINtIA9onEwpoOACPQvRWiQMVyiXo",
  authDomain: "clinicos-c5e75.firebaseapp.com",
  projectId: "clinicos-c5e75",
  storageBucket: "clinicos-c5e75.firebasestorage.app",
  messagingSenderId: "352065041560",
  appId: "1:352065041560:web:57c0f9eb23c412994a0ced",
  measurementId: "G-8R32GSPF50"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Use emulator for demo purposes if testing without actual config
// In production, comment these out and put real config above
// import { connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// import { connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Optional: For local testing without setting up real Firebase backend
// connectAuthEmulator(auth, "http://127.0.0.1:9099");
// connectFirestoreEmulator(db, '127.0.0.1', 8080);

export { app, auth, db };
