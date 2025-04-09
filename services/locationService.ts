"use client"

import * as Location from "expo-location"
import { useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

// Define types for location data
export interface LocationData {
  latitude: number
  longitude: number
  timestamp: number
}

// Define the return type for our hook
export interface UseLocationResult {
  location: LocationData | null
  errorMsg: string | null
  requestPermission: () => Promise<boolean>
  startLocationUpdates: () => Promise<void>
  stopLocationUpdates: () => void
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number
  forceLocationUpdate: () => Promise<void> // Added new function to force update
}

// Key for storing location in AsyncStorage
const LOCATION_STORAGE_KEY = "user_last_location"

/**
 * Custom hook to handle location services
 */
export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null)

  // Load last known location from storage on mount
  useEffect(() => {
    const loadSavedLocation = async () => {
      try {
        const savedLocation = await AsyncStorage.getItem(LOCATION_STORAGE_KEY)
        if (savedLocation) {
          setLocation(JSON.parse(savedLocation))
        }
      } catch (error) {
        console.error("Error loading saved location:", error)
      }
    }

    loadSavedLocation()
  }, [])

  // Function to request location permissions
  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied")
        return false
      }

      // Get current location immediately after permission is granted
      await forceLocationUpdate()
      return true
    } catch (error) {
      console.error("Error requesting location permission:", error)
      setErrorMsg("Error requesting location permission")
      return false
    }
  }

  // Force an immediate location update
  const forceLocationUpdate = async (): Promise<void> => {
    try {
      // Use high accuracy and no caching
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      })

      console.log("Current location updated:", currentLocation.coords)

      const locationData: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        timestamp: new Date().getTime(),
      }

      setLocation(locationData)

      // Save to AsyncStorage
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData))
    } catch (error) {
      console.error("Error getting current location:", error)
      setErrorMsg("Error getting current location")
    }
  }

  // Start receiving location updates
  const startLocationUpdates = async (): Promise<void> => {
    try {
      // Check if we already have permission
      const { status } = await Location.getForegroundPermissionsAsync()
      if (status !== "granted") {
        const permissionGranted = await requestPermission()
        if (!permissionGranted) return
      }

      // Stop any existing subscription
      if (locationSubscription) {
        locationSubscription.remove()
      }

      // Force an immediate location update first
      await forceLocationUpdate()

      // Start watching position with higher accuracy and more frequent updates
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (newLocation) => {
          console.log("Location update received:", newLocation.coords)

          const locationData: LocationData = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            timestamp: new Date().getTime(),
          }

          setLocation(locationData)

          // Save to AsyncStorage
          AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData)).catch((err) =>
            console.error("Error saving location to storage:", err),
          )
        },
      )

      setLocationSubscription(subscription)
    } catch (error) {
      console.error("Error starting location updates:", error)
      setErrorMsg("Error starting location updates")
    }
  }

  // Stop location updates
  const stopLocationUpdates = (): void => {
    if (locationSubscription) {
      locationSubscription.remove()
      setLocationSubscription(null)
    }
  }

  // Calculate distance between two coordinates using the Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c // Distance in km
    return distance
  }

  // Helper function to convert degrees to radians
  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180)
  }

  return {
    location,
    errorMsg,
    requestPermission,
    startLocationUpdates,
    stopLocationUpdates,
    calculateDistance,
    forceLocationUpdate,
  }
}
