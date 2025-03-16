// app/firebase/config.js
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCLu0Xgjug_21FG2mK44_D5Kcbx89W5LL8',
  authDomain: 'volunteer-connect-7f417.firebaseapp.com',
  projectId: 'volunteer-connect-7f417',
  storageBucket: 'volunteer-connect-7f417.firebasestorage.app',
  messagingSenderId: '298606131985',
  appId: '1:298606131985:web:e73a8b7569b658b5f6eab0',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

export { app, auth, db, storage };

// This fixes the "missing default export" warning for Expo Router
export default function FirebaseConfig() {
  return null;
}