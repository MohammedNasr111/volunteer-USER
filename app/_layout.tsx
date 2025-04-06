"use client"

import { Stack } from "expo-router"
import { LogBox } from "react-native"
import "./firebase/config" // Firebase config
import { useEffect, useState } from "react"
import { onAuthStateChanged, type User } from "firebase/auth" // Import User type
import { auth } from "./firebase/config"
import { useParticipantRemoval } from "../hooks/use-participant-removal"
import RemovalNotificationModal from "../components/removal-notification-modal"

// Ignore specific warnings that might come from dependencies
LogBox.ignoreLogs(["Warning: Failed prop type", "AsyncStorage has been extracted"])

export default function Layout() {
  const [initializing, setInitializing] = useState(true)
  const [user, setUser] = useState<User | null>(null) // Properly typed state
  const { removalData, showNotification, closeNotification, checkForRemovalNotifications } = useParticipantRemoval()

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      if (initializing) setInitializing(false)

      // Check for removal notifications when user logs in
      if (user) {
        checkForRemovalNotifications()
      }
    })

    // Cleanup subscription
    return unsubscribe
  }, [initializing, checkForRemovalNotifications])

  if (initializing) return null

  return (
    <>
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
    </>
  )
}

