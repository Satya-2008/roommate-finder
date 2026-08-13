// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD4Zj7W79comtdn51z0ftULv0BM-lP3qFU",
  authDomain: "roomate-finder-c6a1e.firebaseapp.com",
  projectId: "roomate-finder-c6a1e",
  storageBucket: "roomate-finder-c6a1e.firebasestorage.app",
  messagingSenderId: "153878349933",
  appId: "1:153878349933:web:a668d96b202c0a92e51764",
  measurementId: "G-1NP86EHQRK",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth and Firestore instances, used across the app
export const auth = getAuth(app);
export const db = getFirestore(app);