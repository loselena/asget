// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Your Firebase project configuration is loaded from standard environment variables.
// These are assumed to be set in the execution environment.
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.PROJECT_ID ? `${process.env.PROJECT_ID}.firebaseapp.com` : undefined,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.PROJECT_ID ? `${process.env.PROJECT_ID}.appspot.com` : undefined,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

const hasConfig = !!(firebaseConfig.apiKey && firebaseConfig.projectId);
let isFirebaseInitialized = false;

if (hasConfig) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    isFirebaseInitialized = true;
    console.log("Firebase initialized successfully.");
  } catch (e) {
    console.error("Firebase initialization error. Running in offline/demo mode.", e);
    // Ensure all services are null if initialization fails
    app = null;
    auth = null;
    db = null;
    storage = null;
    isFirebaseInitialized = false;
  }
} else {
    console.warn("Firebase configuration is missing. Running in offline/demo mode. Please provide Firebase keys in environment variables to enable full functionality.");
}

export { app, auth, db, storage, isFirebaseInitialized };