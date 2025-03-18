"use client"

import { Stack } from "expo-router"
import { LogBox } from "react-native"
import "./firebase/config" // Firebase config
import { useEffect, useState } from "react"
import { onAuthStateChanged, User } from "firebase/auth" // Import User type
import { auth } from "./firebase/config"

// Ignore specific warnings that might come from dependencies
LogBox.ignoreLogs(["Warning: Failed prop type", "AsyncStorage has been extracted"])

export default function Layout() {
  const [initializing, setInitializing] = useState(true)
  const [user, setUser] = useState<User | null>(null) // Properly typed state

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      if (initializing) setInitializing(false)
    })

    // Cleanup subscription
    return unsubscribe
  }, [initializing])

  if (initializing) return null

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="signup/password" />
      <Stack.Screen name="home" />
    </Stack>
  )
}