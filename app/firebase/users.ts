import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "./config"

// Function to create a new user document in Firestore
export const createUserDocument = async (userId: string, userData: any) => {
  try {
    await setDoc(doc(db, "users", userId), {
      ...userData,
      createdAt: new Date().toISOString(),
    })
    return true
  } catch (error) {
    console.error("Error creating user document:", error)
    return false
  }
}

// Function to get user data from Firestore
export const getUserData = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId))
    if (userDoc.exists()) {
      return userDoc.data()
    } else {
      return null
    }
  } catch (error) {
    console.error("Error getting user data:", error)
    return null
  }
}

// Function to update user data in Firestore
export const updateUserData = async (userId: string, userData: any) => {
  try {
    await updateDoc(doc(db, "users", userId), userData)
    return true
  } catch (error) {
    console.error("Error updating user data:", error)
    return false
  }
}

// Add a default export to fix the warning
export default {
  createUserDocument,
  getUserData,
  updateUserData,
}

