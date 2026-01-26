/**
 * Configuration Firebase pour Bonkont
 * Utilise le SDK Firebase directement depuis le frontend (plan Spark gratuit)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, query, where, addDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

// Configuration Firebase (à remplacer par vos vraies clés depuis la console Firebase)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyReplaceWithReal",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bonkont-48a2c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bonkont-48a2c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bonkont-48a2c.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abc123"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser Firestore
export const db = getFirestore(app);

// Helper pour convertir les dates Firestore
export const convertFirestoreDate = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

// Helper pour convertir les dates en format Firestore
export const toFirestoreDate = (date) => {
  if (!date) return null;
  if (date instanceof Date) {
    return Timestamp.fromDate(date);
  }
  if (typeof date === 'string') {
    return Timestamp.fromDate(new Date(date));
  }
  return date;
};

export default app;







