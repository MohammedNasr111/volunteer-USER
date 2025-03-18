"use client"

import { useEffect } from "react"
import { useRouter } from "expo-router"
import { View, ActivityIndicator, Text, ImageBackground, TouchableOpacity, StyleSheet } from "react-native"
import { Link } from "expo-router"
import { useFonts } from "expo-font"
import { StatusBar } from "expo-status-bar"
import { AntDesign } from "@expo/vector-icons"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase/config"

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, redirect to home
        router.replace("/home")
      } else {
        // No user is signed in, show the splash screen
        router.replace("/splash")
      }
    })

    return unsubscribe
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#000" />
    </View>
  )
}

function SplashScreen() {
  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "AlfaSlabOne-Regular": require("../assets/fonts/AlfaSlabOne-Regular.ttf"),
    "SpaceMono-Regular": require("../assets/fonts/SpaceMono-Regular.ttf"),
  })

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={require("../assets/images/background1.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.contentContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.welcomeText}>WELCOME TO</Text>
            <View style={styles.brandContainer}>
              <Text style={styles.volunteerText}>Volunteer</Text>
              <Text style={styles.ampersandText}>&</Text>
              <Text style={styles.connectText}>Connect</Text>
            </View>
          </View>

          <Link href="/signup" asChild>
            <TouchableOpacity style={styles.signupButton}>
              <AntDesign name="plus" size={16} color="white" style={styles.plusIcon} />
              <Text style={styles.buttonText}>Sign up with Email</Text>
            </TouchableOpacity>
          </Link>

          <Text style={styles.taglineText}>-LIMITLESS OPPORTUNITIES-</Text>
        </View>
      </ImageBackground>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  welcomeText: {
    fontFamily: "AlfaSlabOne-Regular",
    fontSize: 24,
    color: "white",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  volunteerText: {
    fontFamily: "AlfaSlabOne-Regular",
    fontSize: 32,
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  ampersandText: {
    fontFamily: "AlfaSlabOne-Regular",
    fontSize: 32,
    color: "black",
    textShadowColor: "rgba(255, 255, 255, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  connectText: {
    fontFamily: "AlfaSlabOne-Regular",
    fontSize: 32,
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  signupButton: {
    flexDirection: "row",
    backgroundColor: "black",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    marginBottom: 40,
  },
  plusIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  taglineText: {
    fontFamily: "SpaceMono-Regular",
    fontSize: 14,
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
})

