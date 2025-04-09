"use client"
import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, Linking } from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { ArrowLeft, MapPin, Check } from "lucide-react-native"
import { useFonts } from "expo-font"
import { doc, updateDoc } from "firebase/firestore"
import { auth, db } from "./firebase/config"
import { useLocationContext } from "../contexts/LocationContext"

// Define the location permission states
enum LocationState {
  INITIAL = "initial",
  PERMISSION_DIALOG = "permission_dialog",
  SUCCESS = "success",
}

export default function LocationScreen() {
  const router = useRouter()
  const [locationState, setLocationState] = useState<LocationState>(LocationState.INITIAL)
  const [loading, setLoading] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)

  // Use the location context
  const { currentLocation, isLocationEnabled, requestLocationPermission } = useLocationContext()

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
  })

  useEffect(() => {
    // Check if location permissions are already granted
    if (isLocationEnabled && currentLocation) {
      setLocationState(LocationState.SUCCESS)
    }
  }, [isLocationEnabled, currentLocation])

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  const handleAllowLocation = async () => {
    setLoading(true)

    try {
      const granted = await requestLocationPermission()
      if (granted) {
        setLocationState(LocationState.SUCCESS)
      } else {
        // Permission denied
        handlePermissionDenied()
      }
    } catch (error) {
      console.error("Error in location permission flow:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionDenied = () => {
    if (Platform.OS === "ios") {
      Alert.alert(
        "Location Permission Required",
        "Please enable location permissions in your device settings to find volunteer opportunities near you.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ],
      )
    } else {
      Alert.alert(
        "Location Permission Required",
        "Please enable location permissions to find volunteer opportunities near you.",
        [{ text: "OK" }],
      )
    }
  }

  const updateUserLocationPreference = async (enabled: boolean, backgroundEnabled = false) => {
    try {
      const userId = auth.currentUser?.uid
      if (userId) {
        await updateDoc(doc(db, "users", userId), {
          location_enabled: enabled,
          background_location_enabled: backgroundEnabled,
          // Don't mark onboarding as completed here, we still need to show the tour
        })
      }
    } catch (error) {
      console.error("Error updating location preference:", error)
    }
  }

  const handleMaybeLater = async () => {
    // Update user preference to indicate they declined location
    await updateUserLocationPreference(false, false)
    // Navigate to onboarding instead of home
    router.replace("/onboarding" as any)
  }

  const handleFindOpportunities = () => {
    // Navigate to onboarding instead of home
    router.replace("/onboarding" as any)
  }

  const renderInitialScreen = () => (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>

        {/* Pagination dots */}
        <View style={styles.paginationContainer}>
          <View style={styles.paginationDot} />
          <View style={styles.paginationDot} />
          <View style={[styles.paginationDot, styles.activeDot]} />
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>Where are you looking to volunteer?</Text>
      <Text style={[styles.subtitle, { fontFamily: "Alata-Regular" }]}>
        Choose to enable location services to see what volunteer opportunities are in your area.
      </Text>

      {/* Location Icon */}
      <View style={styles.iconContainer}>
        <MapPin size={80} color="#000" />
      </View>

      {/* Bottom buttons */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.allowButton} onPress={handleAllowLocation} disabled={loading}>
          <Text style={styles.allowButtonText}>Allow Location</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleMaybeLater}>
          <Text style={styles.maybeLaterText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderSuccessScreen = () => (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>

        {/* Pagination dots */}
        <View style={styles.paginationContainer}>
          <View style={styles.paginationDot} />
          <View style={styles.paginationDot} />
          <View style={[styles.paginationDot, styles.activeDot]} />
        </View>
      </View>

      {/* Success message */}
      <Text style={styles.successTitle}>Great! We've found some great opportunities near you. Let's get started.</Text>

      {/* Location Icon with checkmark */}
      <View style={styles.iconContainer}>
        <View style={styles.successIconContainer}>
          <MapPin size={80} color="#000" />
          <View style={styles.checkmarkContainer}>
            <Check size={24} color="#fff" />
          </View>
        </View>
      </View>

      {/* Find opportunities button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.findButton} onPress={handleFindOpportunities}>
          <Text style={styles.findButtonText}>Find Volunteer Opportunities</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  // Render the appropriate screen based on state
  return <>{locationState === LocationState.SUCCESS ? renderSuccessScreen() : renderInitialScreen()}</>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  backButton: {
    marginRight: "auto",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    marginRight: 24, // To offset the back button width
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#15B2BF",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    fontFamily: "Alata-Regular",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Alata-Regular",
    fontSize: 14,
    color: "#666",
    marginBottom: 30,
  },
  successTitle: {
    fontFamily: "Alata-Regular",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
  },
  iconContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  successIconContainer: {
    position: "relative",
  },
  checkmarkContainer: {
    position: "absolute",
    bottom: 0,
    right: -10,
    backgroundColor: "#15B2BF",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomContainer: {
    marginTop: "auto",
    alignItems: "center",
    marginBottom: 20,
  },
  allowButton: {
    backgroundColor: "#000",
    borderRadius: 30,
    height: 50,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  allowButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  findButton: {
    backgroundColor: "#000",
    borderRadius: 30,
    height: 50,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  findButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  maybeLaterText: {
    color: "#666",
    fontSize: 14,
    marginTop: 10,
  },
})
