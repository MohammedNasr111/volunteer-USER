"use client"

// Add a global state context to manage notification count across screens
import { createContext, useState, useEffect } from "react"
import { Stack } from "expo-router"
import { LogBox } from "react-native"
import "./firebase/config" // Firebase config
import { onAuthStateChanged, type User } from "firebase/auth" // Import User type
import { auth, db } from "./firebase/config"
import { useParticipantRemoval } from "../hooks/use-participant-removal"
import { collection, query, where, getDocs, onSnapshot, addDoc } from "firebase/firestore"
import { LocationProvider } from "../contexts/LocationContext" // Import the LocationProvider

// Add more notification types to the context
export const NotificationContext = createContext<{
  unreadCount: number
  setUnreadCount: (count: number) => void
  refreshUnreadCount: () => void
  createNotification: (type: string, title: string, message: string, additionalData?: any) => Promise<void>
}>({
  unreadCount: 0,
  setUnreadCount: () => {},
  refreshUnreadCount: () => {},
  createNotification: async () => {},
})

// Ignore specific warnings that might come from dependencies
LogBox.ignoreLogs([
  "Warning: Failed prop type",
  "AsyncStorage has been extracted",
  "@firebase/firestore: Firestore (11.4.0): WebChannelConnection RPC 'Listen' stream",
  // Add this new line to ignore the specific sign-out warning
  "WebChannelConnection RPC 'Listen' stream",
  // Add this to ignore any notifications-related warnings
  "Possible Unhandled Promise Rejection",
])

export default function Layout() {
  const [initializing, setInitializing] = useState(true)
  const [user, setUser] = useState<User | null>(null) // Properly typed state
  const { removalData, showNotification, closeNotification, checkForRemovalNotifications } = useParticipantRemoval()

  // Add state for notification count
  const [unreadCount, setUnreadCount] = useState(0)
  // Add a flag to prevent automatic redirection on sign-out
  const [isManualSignOut, setIsManualSignOut] = useState(false)
  // Add a flag to prevent duplicate login notifications
  const [hasCreatedLoginNotification, setHasCreatedLoginNotification] = useState(false)

  // Function to create a new notification
  const createNotification = async (
    type: string,
    title: string,
    message: string,
    additionalData?: any,
  ): Promise<void> => {
    const userId = auth.currentUser?.uid
    if (!userId) return

    // Prevent duplicate login notifications
    if (type === "login" && hasCreatedLoginNotification) {
      return
    }

    try {
      // Create the notification directly
      const notificationsRef = collection(db, "notifications")

      const notificationData = {
        userId,
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        seen: false,
        ...additionalData,
      }

      await addDoc(notificationsRef, notificationData)

      // If it's a login notification, set the flag
      if (type === "login") {
        setHasCreatedLoginNotification(true)
      }

      // Refresh unread count after creating a notification
      refreshUnreadCount()

      console.log(`Created notification: ${type} - ${title}`)
    } catch (error) {
      console.error("Error creating notification:", error)
    }
  }

  // Function to refresh unread notification count
  const refreshUnreadCount = async () => {
    const userId = auth.currentUser?.uid
    if (!userId) {
      setUnreadCount(0)
      return
    }

    // Skip fetching if we're in the process of signing out
    if (isManualSignOut) {
      return;
    }

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
      // Only log error if it's not a permissions error during sign-out
      if (auth.currentUser) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (!errorMessage.includes("Missing or insufficient permissions")) {
          console.error("Error counting unread notifications:", error)
        }
      }
    }
  }

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const previousUser = auth.currentUser
      setUser(user)

      if (initializing) {
        setInitializing(false)
      }

      // Check for removal notifications when user logs in
      if (user) {
        try {
          checkForRemovalNotifications()
          refreshUnreadCount() // Count unread notifications on login

          // Reset the manual sign out flag when user logs in
          setIsManualSignOut(false)

          // Reset the login notification flag when user changes
          if (!previousUser || previousUser.uid !== user.uid) {
            setHasCreatedLoginNotification(false)
          }
        } catch (error) {
          console.log("Error checking for removal notifications, will retry on next login")
        }
      } else if (!isManualSignOut) {
        // Only redirect if it's not a manual sign out
        // This allows the profile page to handle the redirection
      }
    })

    // Cleanup subscription
    return unsubscribe
  }, [initializing, checkForRemovalNotifications, isManualSignOut])

  // Set up real-time listener for notification changes
  useEffect(() => {
    const userId = auth.currentUser?.uid
    if (!userId || isManualSignOut) {
      // If no user or we're signing out, reset unread count to 0
      setUnreadCount(0)
      return () => {}
    }

    let unsubscribeNotifications = () => {}
    let unsubscribeRemovals = () => {}

    try {
      // Listen for changes in regular notifications
      const notificationsRef = collection(db, "notifications")
      const notificationsQuery = query(notificationsRef, where("userId", "==", userId))

      unsubscribeNotifications = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          // Only refresh if user is still logged in
          if (auth.currentUser && !isManualSignOut) {
            // Check for added notifications to show real-time updates
            const newNotifications = snapshot.docChanges()
              .filter(change => change.type === 'added')
              .map(change => change.doc.data())
              
            // If we have new notifications, log them to console
            if (newNotifications.length > 0) {
              console.log(`Received ${newNotifications.length} new notifications`);
              
              // Immediately refresh the unread count
              refreshUnreadCount()
            }
          }
        },
        (error) => {
          // Only log error if user is still logged in and it's not a permissions error
          if (auth.currentUser && !isManualSignOut) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            if (!errorMessage.includes("Missing or insufficient permissions")) {
              console.error("Error listening to notifications:", error)
            }
          }
        },
      )

      // Listen for changes in removal notifications
      const removalsRef = collection(db, "participantRemovals")
      const removalsQuery = query(removalsRef, where("userId", "==", userId))

      unsubscribeRemovals = onSnapshot(
        removalsQuery,
        (snapshot) => {
          // Only refresh if user is still logged in
          if (auth.currentUser && !isManualSignOut) {
            // Check for new removals
            const newRemovals = snapshot.docChanges()
              .filter(change => change.type === 'added' && !change.doc.data().seen)
              
            if (newRemovals.length > 0) {
              console.log(`Received ${newRemovals.length} new participant removals`);
              refreshUnreadCount()
            }
          }
        },
        (error) => {
          // Only log error if user is still logged in and it's not a permissions error
          if (auth.currentUser && !isManualSignOut) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            if (!errorMessage.includes("Missing or insufficient permissions")) {
              console.error("Error listening to removals:", error)
            }
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
  }, [auth.currentUser?.uid, isManualSignOut, refreshUnreadCount])

  // Add this new useEffect to handle sign-out cleanup
  useEffect(() => {
    // Listen for auth state changes to clean up listeners when user signs out
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        // User has signed out, make sure to clean up any remaining listeners
        try {
          // Force detach any remaining listeners
          const firestore = db
          const firestoreInternals = firestore as any

          if (firestoreInternals._delegate && firestoreInternals._delegate._firestoreClient) {
            // Try to terminate client connections gracefully
            if (typeof firestoreInternals.terminate === "function") {
              firestoreInternals.terminate().catch(() => {
                // Ignore errors during termination
              })
            }
          }
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    })

    return () => unsubscribe()
  }, [])

  // Export the setIsManualSignOut function to the global scope
  // so it can be called from the profile page
  useEffect(() => {
    // @ts-ignore - Add to global scope
    global.setIsManualSignOut = setIsManualSignOut

    return () => {
      // @ts-ignore - Clean up global function
      global.setIsManualSignOut = undefined
    }
  }, [])

  if (initializing) return null

  return (
    <LocationProvider>
      <NotificationContext.Provider value={{ unreadCount, setUnreadCount, refreshUnreadCount, createNotification }}>
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

        {/* Removal notification modal - disabled as per new requirements */}
        {/* <RemovalNotificationModal visible={showNotification} onClose={closeNotification} removalData={removalData} /> */}
      </NotificationContext.Provider>
    </LocationProvider>
  )
}
