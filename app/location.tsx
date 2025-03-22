"use client"
import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Alert, Linking } from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { ArrowLeft, MapPin, Check } from "lucide-react-native"
import { useFonts } from "expo-font"
import { doc, updateDoc } from "firebase/firestore"
import { auth, db } from "./firebase/config"
import * as Location from "expo-location"

// Define the location permission states
enum LocationState {
  INITIAL = "initial",
  PERMISSION_DIALOG = "permission_dialog",
  SUCCESS = "success",
}

// Define the location permission types
enum LocationPermissionType {
  FOREGROUND = "foreground",
  BACKGROUND = "background",
}

export default function LocationScreen() {
  const router = useRouter()
  const [locationState, setLocationState] = useState<LocationState>(LocationState.INITIAL)
  const [permissionType, setPermissionType] = useState<LocationPermissionType>(LocationPermissionType.FOREGROUND)
  const [loading, setLoading] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
  })

  useEffect(() => {
    // Check if location permissions are already granted
    const checkLocationPermission = async () => {
      const foreground = await Location.getForegroundPermissionsAsync()

      if (foreground.status === "granted") {
        // Check for background permissions on Android
        if (Platform.OS === "android") {
          const background = await Location.getBackgroundPermissionsAsync()

          // If background permission is also granted, show success
          if (background.status === "granted") {
            updateUserLocationPreference(true, true)
            setLocationState(LocationState.SUCCESS)
            return
          }
        }

        // If only foreground permission is granted
        updateUserLocationPreference(true, false)
        setLocationState(LocationState.SUCCESS)
      }
    }

    checkLocationPermission()
  }, [])

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  const requestForegroundPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status === "granted") {
        setPermissionType(LocationPermissionType.BACKGROUND)

        // On Android, we can request background permission right away
        if (Platform.OS === "android") {
          requestBackgroundPermission()
        } else {
          // On iOS, we show our custom modal to explain the options
          setShowPermissionModal(true)
        }
      } else {
        // Permission denied
        handlePermissionDenied()
      }
    } catch (error) {
      console.error("Error requesting foreground permission:", error)
      handlePermissionDenied()
    }
  }

  const requestBackgroundPermission = async () => {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync()

      if (status === "granted") {
        // Both permissions granted
        await updateUserLocationPreference(true, true)
        setLocationState(LocationState.SUCCESS)
      } else {
        // Only foreground permission granted
        await updateUserLocationPreference(true, false)
        setLocationState(LocationState.SUCCESS)
      }
    } catch (error) {
      console.error("Error requesting background permission:", error)
      // Still mark as success with only foreground permission
      await updateUserLocationPreference(true, false)
      setLocationState(LocationState.SUCCESS)
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

  const handleAllowLocation = async () => {
    setLoading(true)

    try {
      await requestForegroundPermission()
    } catch (error) {
      console.error("Error in location permission flow:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateUserLocationPreference = async (enabled: boolean, backgroundEnabled = false) => {
    try {
      const userId = auth.currentUser?.uid
      if (userId) {
        await updateDoc(doc(db, "users", userId), {
          location_enabled: enabled,
          background_location_enabled: backgroundEnabled,
          onboarding_completed: true,
        })
      }
    } catch (error) {
      console.error("Error updating location preference:", error)
    }
  }

  const handleMaybeLater = async () => {
    // Update user preference to indicate they declined location
    await updateUserLocationPreference(false, false)
    // Navigate to home
    router.replace("/home")
  }

  const handleFindOpportunities = () => {
    // Navigate to home
    router.replace("/home")
  }

  const handleAllowAllTime = async () => {
    setShowPermissionModal(false)
    await requestBackgroundPermission()
  }

  const handleKeepWhileInUse = async () => {
    setShowPermissionModal(false)
    // Only use foreground permission
    await updateUserLocationPreference(true, false)
    setLocationState(LocationState.SUCCESS)
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
      <Text style={styles.subtitle}>
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

  // Custom permission modal (shown when iOS user needs to choose permission level)
  const renderPermissionModal = () => (
    <Modal visible={showPermissionModal} transparent={true} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalIconContainer}>
            <MapPin size={40} color="#000" />
          </View>

          <Text style={styles.modalTitle}>Allow Volunteer&Connect to access this device's location all-the-time?</Text>

          <Text style={styles.modalDescription}>App currently can access location only while you're using the app</Text>

          <TouchableOpacity style={styles.modalOption} onPress={handleAllowAllTime}>
            <Text style={styles.modalOptionText}>Allow all the time</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalOption} onPress={handleKeepWhileInUse}>
            <Text style={styles.modalOptionText}>Keep while-in-use access</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )

  // Render the appropriate screen based on state
  return (
    <>
      {locationState === LocationState.SUCCESS ? renderSuccessScreen() : renderInitialScreen()}
      {renderPermissionModal()}
    </>
  )
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
    fontFamily: "AbhayaLibre-Regular",
    fontSize: 16,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalIconContainer: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  modalOption: {
    width: "100%",
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#0066CC",
    textAlign: "center",
  },
})

