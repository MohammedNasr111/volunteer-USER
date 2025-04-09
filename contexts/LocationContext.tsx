"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext, type ReactNode } from "react"
import { Alert, Linking } from "react-native"
import { useLocation, type LocationData } from "../services/locationService"
import * as Location from "expo-location"

interface LocationContextType {
  currentLocation: LocationData | null
  errorMsg: string | null
  isLocationEnabled: boolean
  requestLocationPermission: () => Promise<boolean>
  calculateDistanceFromUser: (lat: number, lng: number) => number | null
  filterByDistance: (causes: any[], maxDistance: number) => any[]
  refreshLocation: () => Promise<void> // New function to refresh location
}

const LocationContext = createContext<LocationContextType>({
  currentLocation: null,
  errorMsg: null,
  isLocationEnabled: false,
  requestLocationPermission: async () => false,
  calculateDistanceFromUser: () => null,
  filterByDistance: (causes) => causes,
  refreshLocation: async () => {},
})

export const useLocationContext = () => useContext(LocationContext)

interface LocationProviderProps {
  children: ReactNode
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const {
    location,
    errorMsg,
    requestPermission,
    startLocationUpdates,
    stopLocationUpdates,
    calculateDistance,
    forceLocationUpdate,
  } = useLocation()

  const [isLocationEnabled, setIsLocationEnabled] = useState<boolean>(false)

  // Initialize location tracking when the app starts
  useEffect(() => {
    const initLocation = async () => {
      const { status } = await Location.getForegroundPermissionsAsync()
      if (status === "granted") {
        setIsLocationEnabled(true)
        startLocationUpdates()
      }
    }

    initLocation()

    // Cleanup function
    return () => {
      stopLocationUpdates()
    }
  }, [])

  // Request location permission
  const requestLocationPermission = async (): Promise<boolean> => {
    const granted = await requestPermission()
    if (granted) {
      setIsLocationEnabled(true)
      startLocationUpdates()
      return true
    } else {
      Alert.alert(
        "Location Permission Required",
        "To find causes near you, please enable location permissions in your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ],
      )
      return false
    }
  }

  // Force a location refresh
  const refreshLocation = async (): Promise<void> => {
    if (isLocationEnabled) {
      console.log("Forcing location refresh...")
      await forceLocationUpdate()
    } else {
      const granted = await requestLocationPermission()
      if (granted) {
        await forceLocationUpdate()
      }
    }
  }

  // Calculate distance from user's current location to a given point
  const calculateDistanceFromUser = (lat: number, lng: number): number | null => {
    if (!location) return null
    return calculateDistance(location.latitude, location.longitude, lat, lng)
  }

  // Filter causes by distance from user
  const filterByDistance = (causes: any[], maxDistance: number): any[] => {
    if (!location) return causes

    return causes.filter((cause) => {
      // Skip causes without location data
      if (!cause.location?.coordinates?.lat || !cause.location?.coordinates?.lng) {
        return false
      }

      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        cause.location.coordinates.lat,
        cause.location.coordinates.lng,
      )

      return distance <= maxDistance
    })
  }

  const value = {
    currentLocation: location,
    errorMsg,
    isLocationEnabled,
    requestLocationPermission,
    calculateDistanceFromUser,
    filterByDistance,
    refreshLocation,
  }

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}
