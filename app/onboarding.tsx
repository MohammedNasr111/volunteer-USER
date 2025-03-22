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

const { width, height } = Dimensions.get("window")

// Define the onboarding screens
const onboardingScreens = [
  {
    id: "home",
    title: "Welcome to Volunteer Connect!",
    description:
      "This is your home page where you can discover and join causes and organizations you're interested in!",
    highlightArea: "bottomNav",
  },
  {
    id: "toggle",
    title: "Explore by causes or organizations",
    description:
      "Toggle here to discover by Causes or Organization, to find your ideal volunteer experience. You can sign up for causes through both, this just speeds up and tailors your search!",
    highlightArea: "toggle",
  },
  {
    id: "search",
    title: "Search for Causes by Name",
    description: "If you know what cause you're looking for, search the cause name and then filter the results.",
    highlightArea: "search",
  },
  {
    id: "explore",
    title: "Browse Recommended Causes",
    description: "Based on your preferences, we've curated some awesome causes that you might be interested in.",
    highlightArea: "explore",
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

  const renderHomeScreen = () => (
    <View style={styles.screenContainer}>
      {/* Faded UI */}
      <View style={styles.fadedContent}>
        {/* Toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleButton}>
            <Text style={styles.toggleTextActive}>Cause</Text>
            <Text style={styles.toggleTextInactive}>Organization</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchText}>Find Volunteer Opportunities</Text>
          </View>
        </View>

        {/* Explore Section */}
        <View style={styles.exploreContainer}>
          <Text style={styles.exploreTitle}>Explore Near You</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationText}>Kuala Lumpur, KUL</Text>
            <Text style={styles.updateText}>Update</Text>
          </View>
        </View>
      </View>

      {/* Highlighted Bottom Navigation */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>
          <View style={styles.navItem}>
            <View style={styles.navIconActive} />
            <Text style={styles.navTextActive}>Home</Text>
          </View>
          <View style={styles.navItem}>
            <View style={styles.navIcon} />
            <Text style={styles.navText}>History</Text>
          </View>
          <View style={styles.navItem}>
            <View style={styles.navIcon} />
            <Text style={styles.navText}>Notifications</Text>
          </View>
          <View style={styles.navItem}>
            <View style={styles.navIcon} />
            <Text style={styles.navText}>Profile</Text>
          </View>
        </View>
      </View>

      {/* Tooltip */}
      <View style={styles.tooltipContainer}>
        <Text style={styles.tooltipTitle}>{onboardingScreens[currentScreen].title}</Text>
        <Text style={styles.tooltipDescription}>{onboardingScreens[currentScreen].description}</Text>

        {/* Pagination */}
        <View style={styles.paginationContainer}>
          {onboardingScreens.map((_, index) => (
            <View key={index} style={[styles.paginationDot, currentScreen === index && styles.paginationDotActive]} />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  const renderToggleScreen = () => (
    <View style={styles.screenContainer}>
      {/* Faded UI */}
      <View style={styles.fadedContent}>
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchText}>Find Volunteer Opportunities</Text>
          </View>
        </View>

        {/* Explore Section */}
        <View style={styles.exploreContainer}>
          <Text style={styles.exploreTitle}>Explore Near You</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationText}>Kuala Lumpur, KUL</Text>
            <Text style={styles.updateText}>Update</Text>
          </View>
        </View>

        {/* Bottom Navigation */}
        <View style={styles.bottomNavContainer}>
          <View style={styles.bottomNav}>
            <View style={styles.navItem}>
              <View style={styles.navIcon} />
              <Text style={styles.navText}>Home</Text>
            </View>
            <View style={styles.navItem}>
              <View style={styles.navIcon} />
              <Text style={styles.navText}>History</Text>
            </View>
            <View style={styles.navItem}>
              <View style={styles.navIcon} />
              <Text style={styles.navText}>Notifications</Text>
            </View>
            <View style={styles.navItem}>
              <View style={styles.navIcon} />
              <Text style={styles.navText}>Profile</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Highlighted Toggle */}
      <View style={styles.highlightedToggleContainer}>
        <View style={styles.toggleButton}>
          <View style={styles.activeToggle}>
            <Text style={styles.activeToggleText}>Cause</Text>
          </View>
          <View style={styles.inactiveToggle}>
            <Text style={styles.inactiveToggleText}>Organization</Text>
          </View>
        </View>
      </View>

      {/* Tooltip */}
      <View style={[styles.tooltipContainer, styles.tooltipToggle]}>
        <Text style={styles.tooltipTitle}>{onboardingScreens[currentScreen].title}</Text>
        <Text style={styles.tooltipDescription}>{onboardingScreens[currentScreen].description}</Text>

        {/* Pagination */}
        <View style={styles.paginationContainer}>
          {onboardingScreens.map((_, index) => (
            <View key={index} style={[styles.paginationDot, currentScreen === index && styles.paginationDotActive]} />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  const renderSearchScreen = () => (
    <View style={styles.screenContainer}>
      {/* Faded UI */}
      <View style={styles.fadedContent}>
        {/* Toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleButton}>
            <Text style={styles.toggleTextActive}>Cause</Text>
            <Text style={styles.toggleTextInactive}>Organization</Text>
          </View>
        </View>

        {/* Explore Section */}
        <View style={styles.exploreContainer}>
          <Text style={styles.exploreTitle}>Explore Near You</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationText}>Kuala Lumpur, KUL</Text>
            <Text style={styles.updateText}>Update</Text>
          </View>
        </View>

        {/* Bottom Navigation */}
        <View style={styles.bottomNavContainer}>
          <View style={styles.bottomNav}>
            <View style={styles.navItem}>
              <View style={styles.navIcon} />
              <Text style={styles.navText}>Home</Text>
            </View>
            <View style={styles.navItem}>
              <View style={styles.navIcon} />
              <Text style={styles.navText}>History</Text>
            </View>
            <View style={styles.navItem}>
              <View style={styles.navIcon} />
              <Text style={styles.navText}>Notifications</Text>
            </View>
            <View style={styles.navItem}>
              <View style={styles.navIcon} />
              <Text style={styles.navText}>Profile</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Highlighted Search Bar */}
      <View style={styles.highlightedSearchContainer}>
        <View style={styles.highlightedSearchBar}>
          <Text style={styles.highlightedSearchText}>Find Volunteer Opportunities</Text>
        </View>
      </View>

      {/* Tooltip */}
      <View style={[styles.tooltipContainer, styles.tooltipSearch]}>
        <Text style={styles.tooltipTitle}>{onboardingScreens[currentScreen].title}</Text>
        <Text style={styles.tooltipDescription}>{onboardingScreens[currentScreen].description}</Text>

        {/* Pagination */}
        <View style={styles.paginationContainer}>
          {onboardingScreens.map((_, index) => (
            <View key={index} style={[styles.paginationDot, currentScreen === index && styles.paginationDotActive]} />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  const renderExploreScreen = () => (
    <View style={styles.screenContainer}>
      {/* Faded UI */}
      <View style={styles.fadedContent}>
        {/* Toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleButton}>
            <Text style={styles.toggleTextActive}>Cause</Text>
            <Text style={styles.toggleTextInactive}>Organization</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchText}>Find Volunteer Opportunities</Text>
          </View>
        </View>

        {/* Bottom Navigation */}
        <View style={styles.bottomNavContainer}>
          <View style={styles.bottomNav}>
            <View style={styles.navItem}>
              <View style={styles.navIcon} />
              <Text style={styles.navText}>Home</Text>
            </View>
            <View style={styles.navItem}>
              <View style={styles.navIcon} />
              <Text style={styles.navText}>History</Text>
            </View>
            <View style={styles.navItem}>
              <View style={styles.navIcon} />
              <Text style={styles.navText}>Notifications</Text>
            </View>
            <View style={styles.navItem}>
              <View style={styles.navIcon} />
              <Text style={styles.navText}>Profile</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Highlighted Explore Section */}
      <View style={styles.highlightedExploreContainer}>
        <Text style={styles.highlightedExploreTitle}>Explore Near You</Text>
        <View style={styles.highlightedLocationRow}>
          <Text style={styles.highlightedLocationText}>Kuala Lumpur, KUL</Text>
          <Text style={styles.highlightedUpdateText}>Update</Text>
        </View>
      </View>

      {/* Tooltip */}
      <View style={[styles.tooltipContainer, styles.tooltipExplore]}>
        <Text style={styles.tooltipTitle}>{onboardingScreens[currentScreen].title}</Text>
        <Text style={styles.tooltipDescription}>{onboardingScreens[currentScreen].description}</Text>

        {/* Pagination */}
        <View style={styles.paginationContainer}>
          {onboardingScreens.map((_, index) => (
            <View key={index} style={[styles.paginationDot, currentScreen === index && styles.paginationDotActive]} />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.finishButton} onPress={completeOnboarding}>
            <Text style={styles.finishButtonText}>Finish</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  // Render the appropriate screen based on current index
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 0:
        return renderHomeScreen()
      case 1:
        return renderToggleScreen()
      case 2:
        return renderSearchScreen()
      case 3:
        return renderExploreScreen()
      default:
        return renderHomeScreen()
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.statusBarSpacer} />
      {renderCurrentScreen()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  statusBarSpacer: {
    height: Platform.OS === "android" ? RNStatusBar.currentHeight || 40 : 40,
  },
  screenContainer: {
    flex: 1,
    position: "relative",
  },
  fadedContent: {
    flex: 1,
    opacity: 0.3,
  },
  toggleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: "center",
  },
  toggleButton: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 25,
    padding: 4,
    width: 240,
  },
  toggleTextActive: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 8,
    backgroundColor: "#000",
    color: "#fff",
    borderRadius: 25,
    fontWeight: "bold",
  },
  toggleTextInactive: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 8,
    color: "#666",
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  searchBar: {
    backgroundColor: "#f5f5f5",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  searchText: {
    color: "#999",
    fontSize: 14,
  },
  exploreContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  exploreTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 20,
    marginBottom: 10,
  },
  locationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationText: {
    fontSize: 14,
    color: "#666",
  },
  updateText: {
    color: "#15B2BF",
    fontSize: 14,
  },
  bottomNavContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  bottomNav: {
    flexDirection: "row",
    height: 70,
    paddingBottom: 10,
  },
  navItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 10,
  },
  navIcon: {
    width: 24,
    height: 24,
    backgroundColor: "#ccc",
    borderRadius: 12,
    marginBottom: 4,
  },
  navIconActive: {
    width: 24,
    height: 24,
    backgroundColor: "#15B2BF",
    borderRadius: 12,
    marginBottom: 4,
  },
  navText: {
    fontSize: 12,
    color: "#666",
  },
  navTextActive: {
    fontSize: 12,
    color: "#15B2BF",
    fontWeight: "500",
  },
  tooltipContainer: {
    position: "absolute",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    margin: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tooltipTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 18,
    marginBottom: 10,
  },
  tooltipDescription: {
    fontFamily: "AbhayaLibre-Regular",
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: "#15B2BF",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  skipButtonText: {
    color: "#666",
    fontSize: 14,
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
  },
  finishButton: {
    backgroundColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  finishButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  // Highlighted elements styles
  highlightedToggleContainer: {
    position: "absolute",
    top: 15,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  activeToggle: {
    flex: 1,
    backgroundColor: "#000",
    borderRadius: 25,
    paddingVertical: 8,
    alignItems: "center",
  },
  activeToggleText: {
    color: "#fff",
    fontWeight: "bold",
  },
  inactiveToggle: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  inactiveToggleText: {
    color: "#666",
  },
  highlightedSearchContainer: {
    position: "absolute",
    top: 80,
    left: 20,
    right: 20,
  },
  highlightedSearchBar: {
    backgroundColor: "#f5f5f5",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#15B2BF",
  },
  highlightedSearchText: {
    color: "#999",
    fontSize: 14,
  },
  highlightedExploreContainer: {
    position: "absolute",
    top: 140,
    left: 20,
    right: 20,
  },
  highlightedExploreTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 20,
    marginBottom: 10,
    color: "#000",
  },
  highlightedLocationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  highlightedLocationText: {
    fontSize: 14,
    color: "#666",
  },
  highlightedUpdateText: {
    color: "#15B2BF",
    fontSize: 14,
  },
  // Tooltip positioning for different screens
  tooltipToggle: {
    top: 100,
  },
  tooltipSearch: {
    top: 150,
  },
  tooltipExplore: {
    top: 200,
  },
})

