"use client"
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useFonts } from "expo-font"

export default function PreferencesScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { firstName } = params

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "AbhayaLibre-ExtraBold": require("../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
  })

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  const handleSetPreferences = () => {
    router.push("/causes" as any)
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={require("../assets/images/preference.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.contentContainer}>
          {/* Welcome text - center aligned as requested */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Welcome, {firstName}!</Text>
          </View>

          {/* Feature content - positioned in center but text left-aligned */}
          <View style={styles.featuresWrapper}>
            <View style={styles.featureContainer}>
              <Text style={styles.featureTitle}>Sign up for Volunteer Opportunities</Text>
              <Text style={styles.featureDescription}>
                Sign up for events directly through our app with just a few clicks, hassle free.
              </Text>
            </View>

            <View style={styles.featureContainer}>
              <Text style={styles.featureTitle}>Stay in touch with Organizations</Text>
              <Text style={styles.featureDescription}>
                Never miss an update from organizers and always be the first to know about new events.
              </Text>
            </View>

            <View style={styles.featureContainer}>
              <Text style={styles.featureTitle}>Find Local Organizations</Text>
              <Text style={styles.featureDescription}>
                Easily find organizations that support causes you care about and skills you have.
              </Text>
            </View>
          </View>

          {/* Button positioned higher up as requested */}
          <View style={styles.buttonWrapper}>
            <TouchableOpacity style={styles.preferencesButton} onPress={handleSetPreferences}>
              <Text style={styles.preferencesButtonText}>Set Preferences</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    justifyContent: "space-between", // This helps distribute the content
  },
  welcomeContainer: {
    alignItems: "center", // Center the welcome text horizontally
    width: "100%",
  },
  welcomeText: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 28,
    color: "white",
    marginBottom: 20,
    textAlign: "center", // Center the welcome text
  },
  featuresWrapper: {
    flex: 1,
    justifyContent: "center", // Center vertically in the available space
    alignItems: "flex-start", // Align items to the start (left)
  },
  featureContainer: {
    marginBottom: 30,
    width: "100%",
  },
  featureTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 22,
    color: "white",
    marginBottom: 5,
    textAlign: "left", // Left align the title text
  },
  featureDescription: {
    fontFamily: "Alata-Regular",
    fontSize: 16,
    color: "white",
    opacity: 0.9,
    textAlign: "left", // Left align the description text
  },
  buttonWrapper: {
    marginBottom: 80, // This pushes the button up from the bottom
  },
  preferencesButton: {
    backgroundColor: "black",
    borderRadius: 30,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  preferencesButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
})

