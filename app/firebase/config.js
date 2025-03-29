// app/firebase/config.js
import { initializeApp } from "firebase/app"
import { initializeAuth, getReactNativePersistence } from "firebase/auth"
import { getFirestore, collection, getDocs } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getDatabase, ref, get, set } from "firebase/database" // Add this import
import AsyncStorage from "@react-native-async-storage/async-storage"

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCLu0Xgjug_21FG2mK44_D5Kcbx89W5LL8",
  authDomain: "volunteer-connect-7f417.firebaseapp.com",
  projectId: "volunteer-connect-7f417",
  storageBucket: "volunteer-connect-7f417.firebasestorage.app",
  messagingSenderId: "298606131985",
  appId: "1:298606131985:web:e73a8b7569b658b5f6eab0",
  databaseURL: "https://volunteer-connect-7f417-default-rtdb.asia-southeast1.firebasedatabase.app", // Add this line with your database URL
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
})

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app)

// Initialize Storage
const storage = getStorage(app)

// Initialize Realtime Database
const realtimeDb = getDatabase(app)

// Utility function to fix participant counts (for admin use)
export const fixParticipantCounts = async (causeId) => {
  try {
    // Get the actual participants
    const participantsRef = ref(realtimeDb, `causes/${causeId}/participants`)
    const participantsSnapshot = await get(participantsRef)

    // Count the actual participants
    let actualCount = 0
    if (participantsSnapshot.exists()) {
      const participants = participantsSnapshot.val()
      actualCount = Object.keys(participants).length
    }

    // Update the count in the database
    const countRef = ref(realtimeDb, `causes/${causeId}/participantsCount`)
    await set(countRef, actualCount)

    console.log(`Fixed participant count for cause ${causeId}: set to ${actualCount}`)
    return actualCount
  } catch (error) {
    console.error("Error fixing participant count:", error)
    throw error
  }
}

// Utility function to fix participant counts for all causes
export const fixAllParticipantCounts = async () => {
  try {
    // Get all causes
    const causesSnapshot = await getDocs(collection(db, "causes"))

    const results = []

    for (const causeDoc of causesSnapshot.docs) {
      const causeId = causeDoc.id

      // Get the participants from Realtime Database
      const participantsRef = ref(realtimeDb, `causes/${causeId}/participants`)
      const participantsSnapshot = await get(participantsRef)

      // Count the actual participants
      let actualCount = 0
      if (participantsSnapshot.exists()) {
        const participants = participantsSnapshot.val()
        actualCount = Object.keys(participants).length
      }

      // Update the count in the database
      const countRef = ref(realtimeDb, `causes/${causeId}/participantsCount`)
      await set(countRef, actualCount)

      results.push({
        causeId,
        name: causeDoc.data().name || "Unknown Cause",
        actualCount,
      })

      console.log(`Fixed participant count for cause ${causeId}: set to ${actualCount}`)
    }

    return results
  } catch (error) {
    console.error("Error fixing all participant counts:", error)
    throw error
  }
}

export { app, auth, db, storage, realtimeDb }

// This fixes the "missing default export" warning for Expo Router
export default function FirebaseConfig() {
  return null
}

// Firebase configuration

