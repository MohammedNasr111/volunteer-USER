"use client"

// Add a global state context to manage notification count across screens
import { createContext, useState, useEffect } from "react"
import { Stack } from "expo-router"
import { LogBox } from "react-native"
import "./firebase/config" // Firebase config
import { onAuthStateChanged, type User } from "firebase/auth" // Import User type
import { auth, db } from "./firebase/config"
import { useParticipantRemoval } from "../hooks/use-participant-removal"
import RemovalNotificationModal from "../components/removal-notification-modal"
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore"

// Create a context for notification count
export const NotificationContext = createContext<{
  unreadCount: number
  setUnreadCount: (count: number) => void
  refreshUnreadCount: () => void
}>({
  unreadCount: 0,
  setUnreadCount: () => {},
  refreshUnreadCount: () => {},
})

// Ignore specific warnings that might come from dependencies
LogBox.ignoreLogs(["Warning: Failed prop type", "AsyncStorage has been extracted"])

export default function Layout() {
  const [initializing, setInitializing] = useState(true)
  const [user, setUser] = useState<User | null>(null) // Properly typed state
  const { removalData, showNotification, closeNotification, checkForRemovalNotifications } = useParticipantRemoval()

  // Add state for notification count
  const [unreadCount, setUnreadCount] = useState(0)

  // Function to refresh unread notification count
  const refreshUnreadCount = async () => {
    const userId = auth.currentUser?.uid
    if (!userId) return

    try {
      // Count unread regular notifications
      const notificationsRef = collection(db, "notifications")
      const notificationsQuery = query(notificationsRef, where("userId", "==", userId), where("read", "==", false))
      const notificationsSnapshot = await getDocs(notificationsQuery)

      // Count unseen removal notifications
      const removalsRef = collection(db, "participantRemovals")
      const removalsQuery = query(removalsRef, where("userId", "==", userId), where("seen", "==", false))
      const removalsSnapshot = await getDocs(removalsQuery)

      // Set total unread count
      const totalUnread = notificationsSnapshot.size + removalsSnapshot.size
      setUnreadCount(totalUnread)
    } catch (error) {
      console.error("Error counting unread notifications:", error)
    }
  }

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      if (initializing) setInitializing(false)

      // Check for removal notifications when user logs in
      if (user) {
        try {
          checkForRemovalNotifications()
          refreshUnreadCount() // Count unread notifications on login
        } catch (error) {
          console.log("Error checking for removal notifications, will retry on next login")
        }
      }
      // We're NOT redirecting when user is null (signed out)
      // This allows the profile page to handle the redirection
    })

    // Cleanup subscription
    return unsubscribe
  }, [initializing, checkForRemovalNotifications])

  // Set up real-time listener for notification changes
  useEffect(() => {
    const userId = auth.currentUser?.uid
    if (!userId) {
      // If no user, reset unread count to 0
      setUnreadCount(0)
      return
    }

    let unsubscribeNotifications = () => {}
    let unsubscribeRemovals = () => {}

    try {
      // Listen for changes in regular notifications
      const notificationsRef = collection(db, "notifications")
      const notificationsQuery = query(notificationsRef, where("userId", "==", userId))

      unsubscribeNotifications = onSnapshot(
        notificationsQuery,
        () => {
          refreshUnreadCount()
        },
        (error) => {
          // Only log error if user is still logged in
          if (auth.currentUser) {
            console.error("Error listening to notifications:", error)
          }
        },
      )

      // Listen for changes in removal notifications
      const removalsRef = collection(db, "participantRemovals")
      const removalsQuery = query(removalsRef, where("userId", "==", userId))

      unsubscribeRemovals = onSnapshot(
        removalsQuery,
        () => {
          refreshUnreadCount()
        },
        (error) => {
          // Only log error if user is still logged in
          if (auth.currentUser) {
            console.error("Error listening to removals:", error)
          }
        },
      )
    } catch (error) {
      console.error("Error setting up notification listeners:", error)
    }

    return () => {
      // Clean up listeners
      try {
        unsubscribeNotifications()
        unsubscribeRemovals()
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, [auth.currentUser?.uid])

  if (initializing) return null

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, refreshUnreadCount }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="signup/password" />
        <Stack.Screen name="home" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="causes" />
        <Stack.Screen name="frequency" />
        <Stack.Screen name="location" />
      </Stack>

      {/* Removal notification modal */}
      <RemovalNotificationModal visible={showNotification} onClose={closeNotification} removalData={removalData} />
    </NotificationContext.Provider>
  )
}

