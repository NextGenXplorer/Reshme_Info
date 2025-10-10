import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

// Firebase configuration from environment variables
// Make sure to copy .env.example to .env and fill in your Firebase credentials
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore without persistence to avoid BloomFilter errors
// This is more reliable for React Native environments
let db;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true, // Better for React Native
  });
} catch (error) {
  // If initialization fails, fall back to default Firestore
  console.log('Firestore initialization error, using default:', error);
  db = getFirestore(app);
}

export { db };

// Firestore collection names
export const COLLECTIONS = {
  COCOON_PRICES: 'cocoonPrices',
  MARKETS: 'markets',
  BREEDS: 'breeds',
  NOTIFICATIONS: 'notifications'
} as const;