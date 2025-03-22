"use client"

import { useEffect } from "react"
import { useRouter } from "expo-router"
import { View, ActivityIndicator, Text } from "react-native"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "./firebase/config"

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // User is signed in, check if onboarding is completed
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()

            // If user has completed onboarding, go to home
            // If not, check where they are in the flow
            if (userData.onboarding_completed) {
              router.replace("/home" as any)
            } else if (!userData.cause_preferences) {
              // If user hasn't set cause preferences, send to preferences
              router.replace({
                pathname: "/preferences" as any,
                params: { firstName: userData.firstName },
              })
            } else if (!userData.frequency_preference) {
              // If user hasn't set frequency, send to frequency
              router.replace("/frequency" as any)
            } else if (userData.location_enabled === undefined) {
              // If user hasn't set location preferences, send to location
              router.replace("/location" as any)
            } else {
              // If user has completed all preferences but not onboarding, send to onboarding
              router.replace("/onboarding" as any)
            }
          } else {
            // User document doesn't exist, redirect to splash
            router.replace("/splash" as any)
          }
        } else {
          // No user is signed in, show the splash screen
          router.replace("/splash" as any)
        }
      } catch (error) {
        console.error("Error in navigation flow:", error)
        // Fallback to splash screen in case of error
        router.replace("/splash" as any)
      }
    })

    return unsubscribe
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#000" />
      <Text style={{ marginTop: 10 }}>Loading...</Text>
    </View>
  )
}

