import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore"
import { db, auth } from "./config"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"

// User roles
export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

// Function to create a new user document in Firestore
export const createUserDocument = async (userId: string, userData: any) => {
  try {
    await setDoc(doc(db, "users", userId), {
      ...userData,
      role: UserRole.USER, // Set default role to USER for mobile app
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

// Function to check if a user is an admin
export const isUserAdmin = async (userId: string) => {
  try {
    const userData = await getUserData(userId)
    return userData?.role === UserRole.ADMIN
  } catch (error) {
    console.error("Error checking admin status:", error)
    return false
  }
}

// Enhanced login function that checks user role
export const loginUser = async (email: string, password: string) => {
  try {
    // First authenticate with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Then check if user has the correct role
    const userData = await getUserData(user.uid)

    if (!userData) {
      throw new Error("User data not found")
    }

    if (userData.role === UserRole.ADMIN) {
      // If admin tries to log in to mobile app, throw error
      await auth.signOut() // Sign out the admin
      throw new Error("admin_not_allowed")
    }

    return { user, userData }
  } catch (error: any) {
    // Re-throw the error to be handled by the calling function
    throw error
  }
}

// Enhanced signup function that sets the user role
export const signupUser = async (email: string, password: string, userData: any) => {
  try {
    // Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Create user document with role set to USER
    await createUserDocument(user.uid, {
      ...userData,
      email,
      role: UserRole.USER,
    })

    return { user, userData: { ...userData, role: UserRole.USER } }
  } catch (error) {
    throw error
  }
}

// Add a default export to fix the warning
export default {
  createUserDocument,
  getUserData,
  updateUserData,
  isUserAdmin,
  loginUser,
  signupUser,
  UserRole,
}

