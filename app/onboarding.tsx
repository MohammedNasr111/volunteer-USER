"use client"
import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar as RNStatusBar,
  Platform,
} from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useFonts } from "expo-font"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { auth, db } from "./firebase/config"
import HomeScreen from "./home"

const { width, height } = Dimensions.get("window")

// Define the onboarding screens with positions
const onboardingScreens = [
  {
    id: "home",
    title: "Welcome to Volunteer&Connect!",
    description:
      "This is your home page where you can discover and join causes and organizations you're interested in!",
    position: "bottom", // Position of the tooltip
    targetElement: "bottomNav", // Element to point to
  },
  {
    id: "toggle",
    title: "Explore by Causes or organizations",
    description:
      "Toggle here to discover by Causes or Organization, to find your ideal volunteer experience. You can sign up for causes through both, this just speeds up and tailors your search!",
    position: "top", // Position of the tooltip
    targetElement: "toggle", // Element to point to
  },
  {
    id: "search",
    title: "Search for Causes by Name",
    description: "If you know what cause you're looking for, search the cause name and then filter the results.",
    position: "top", // Position of the tooltip
    targetElement: "search", // Element to point to
  },
  {
    id: "explore",
    title: "Browse Recommended Causes",
    description: "Based on your preferences, we've curated some awesome causes that you might be interested in.",
    position: "top", // Position of the tooltip
    targetElement: "explore", // Element to point to
  },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const [currentScreen, setCurrentScreen] = useState(0)
  const [loading, setLoading] = useState(true)

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
    "AbhayaLibre-ExtraBold": require("../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
    "Lato-Regular": require("../assets/fonts/Lato-Regular.ttf"),
    "Lato-Bold": require("../assets/fonts/Lato-Bold.ttf"),
  })

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        setLoading(true)
        const userId = auth.currentUser?.uid
        if (userId) {
          const userDoc = await getDoc(doc(db, "users", userId))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.onboarding_completed) {
              // If onboarding is already completed, go to home
              router.replace("/home" as any)
            }
          }
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error)
      } finally {
        setLoading(false)
      }
    }

    checkOnboardingStatus()
  }, [])

  // Mark onboarding as completed when user finishes or skips
  const completeOnboarding = async () => {
    try {
      const userId = auth.currentUser?.uid
      if (userId) {
        await updateDoc(doc(db, "users", userId), {
          onboarding_completed: true,
        })
      }
      router.replace("/home" as any)
    } catch (error) {
      console.error("Error updating onboarding status:", error)
      router.replace("/home" as any)
    }
  }

  const handleNext = () => {
    if (currentScreen < onboardingScreens.length - 1) {
      setCurrentScreen(currentScreen + 1)
    } else {
      completeOnboarding()
    }
  }

  const handleSkip = () => {
    completeOnboarding()
  }

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    )
  }

  // Get current screen data
  const currentScreenData = onboardingScreens[currentScreen]

  // Custom tooltip rendering based on the current screen
  const renderTooltip = () => {
    // Define tooltip styles based on current screen
    let tooltipContainerStyle = {}
    const arrowPositionStyle = {}

    switch (currentScreen) {
      case 0: // Home navigation tooltip
        tooltipContainerStyle = { bottom: 100 }
        return (
          <View style={[styles.tooltipContainer, tooltipContainerStyle]}>
            <View style={styles.tooltip}>
              {/* Arrow at bottom center */}
              <View style={[styles.arrow, styles.arrowBottom, { left: width * 0.25 - 30 }]} />

              {/* Tooltip content */}
              {renderTooltipContent()}
            </View>
          </View>
        )

      case 1: // Toggle tooltip - ADJUSTED TO BE SLIGHTLY LOWER
        tooltipContainerStyle = { top: 160 } // Increased from 140 to 160 to lower it
        return (
          <View style={[styles.tooltipContainer, tooltipContainerStyle]}>
            <View style={styles.tooltip}>
              {/* Arrow at top center */}
              <View style={[styles.arrow, styles.arrowTop, { left: width * 0.5 - 30 }]} />

              {/* Tooltip content */}
              {renderTooltipContent()}
            </View>
          </View>
        )

      case 2: // Search tooltip
        tooltipContainerStyle = { top: 210 } // Adjusted to match the new toggle position
        return (
          <View style={[styles.tooltipContainer, tooltipContainerStyle]}>
            <View style={styles.tooltip}>
              {/* Arrow at top center */}
              <View style={[styles.arrow, styles.arrowTop, { left: width * 0.5 - 30 }]} />

              {/* Tooltip content */}
              {renderTooltipContent()}
            </View>
          </View>
        )

      case 3: // Explore tooltip
        tooltipContainerStyle = { top: 300 } // Adjusted to match the new positions
        return (
          <View style={[styles.tooltipContainer, tooltipContainerStyle]}>
            <View style={styles.tooltip}>
              {/* Arrow at top center */}
              <View style={[styles.arrow, styles.arrowTop, { left: width * 0.5 - 30 }]} />

              {/* Tooltip content */}
              {renderTooltipContent()}
            </View>
          </View>
        )

      default:
        return null
    }
  }

  // Tooltip content rendering
  const renderTooltipContent = () => {
    return (
      <View style={styles.tooltipContent}>
        {/* Skip button in top right */}
        <View style={styles.skipContainer}>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.tooltipTitle}>{currentScreenData.title}</Text>
        <Text style={styles.tooltipDescription}>{currentScreenData.description}</Text>

        {/* Pagination dots - centered */}
        <View style={styles.paginationContainer}>
          {onboardingScreens.map((_, index) => (
            <View key={index} style={[styles.paginationDot, currentScreen === index && styles.paginationDotActive]} />
          ))}
        </View>

        {/* Next/Finish button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentScreen === onboardingScreens.length - 1 ? "Finish" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.statusBarSpacer} />

      {/* Render the actual home screen in the background */}
      <HomeScreen />

      {/* Overlay the onboarding tooltip */}
      <View style={styles.overlayContainer}>{renderTooltip()}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  statusBarSpacer: {
    height: Platform.OS === "android" ? RNStatusBar.currentHeight || 40 : 0,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)", // Very light dim
  },
  tooltipContainer: {
    position: "absolute",
    left: 20,
    right: 20,
  },
  tooltip: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: "relative",
  },
  arrow: {
    position: "absolute",
    width: 20,
    height: 20,
    backgroundColor: "white",
    transform: [{ rotate: "45deg" }],
    zIndex: 1,
  },
  arrowTop: {
    top: -10,
  },
  arrowBottom: {
    bottom: -10,
  },
  tooltipContent: {
    position: "relative",
  },
  skipContainer: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  tooltipTitle: {
    fontFamily: "Lato-Bold",
    fontSize: 18,
    marginBottom: 10,
    textAlign: "left",
    paddingRight: 40, // Make room for skip button
  },
  tooltipDescription: {
    fontFamily: "Lato-Regular",
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "left",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center", // Center the dots
    marginBottom: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4, // Equal spacing on both sides
  },
  paginationDotActive: {
    backgroundColor: "#15B2BF",
  },
  buttonContainer: {
    alignItems: "flex-end",
  },
  skipButtonText: {
    color: "#666",
    fontSize: 14,
    fontFamily: "Lato-Regular",
  },
  nextButton: {
    backgroundColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Lato-Bold",
  },
})

