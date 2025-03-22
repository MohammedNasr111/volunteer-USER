"use client"
import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { ArrowLeft } from "lucide-react-native"
import { useFonts } from "expo-font"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { auth, db } from "./firebase/config"

// Define the frequency options
const frequencyOptions = [
  {
    id: "weekly",
    title: "Once a week",
    description: "Heavily involved in volunteering",
  },
  {
    id: "few_times_month",
    title: "A few times a month",
    description: "Actively involved in volunteering",
  },
  {
    id: "monthly",
    title: "Once a month",
    description: "Frequently volunteering",
  },
  {
    id: "few_times_year",
    title: "A few times a year",
    description: "Participate in a few events annually",
  },
]

export default function FrequencyScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { fromCauses } = params

  const [selectedFrequency, setSelectedFrequency] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [previousCauses, setPreviousCauses] = useState<string[]>([])

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
  })

  // Fetch previously selected causes if user navigates back
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = auth.currentUser?.uid
        if (userId) {
          const userDoc = await getDoc(doc(db, "users", userId))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.cause_preferences) {
              setPreviousCauses(userData.cause_preferences)
            }
            if (userData.frequency_preference) {
              setSelectedFrequency(userData.frequency_preference)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    fetchUserData()
  }, [])

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  const handleSelectFrequency = (frequencyId: string) => {
    setSelectedFrequency(frequencyId)
  }

  const handleNext = async () => {
    if (!selectedFrequency) return

    try {
      setLoading(true)
      const userId = auth.currentUser?.uid

      if (userId) {
        // Save selected frequency to Firestore
        await updateDoc(doc(db, "users", userId), {
          frequency_preference: selectedFrequency,
        })
      }

      // Navigate to location screen instead of home
      router.push({ pathname: "/location" as any })
    } catch (error) {
      console.error("Error saving frequency preference:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    // Navigate to location screen instead of home
    router.push({ pathname: "/location" as any })
  }

  const handleBack = () => {
    router.push({
      pathname: "/causes" as any,
      params: { previouslySelected: JSON.stringify(previousCauses) },
    })
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>

        {/* Pagination dots */}
        <View style={styles.paginationContainer}>
          <View style={styles.paginationDot} />
          <View style={[styles.paginationDot, styles.activeDot]} />
          <View style={styles.paginationDot} />
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>How often do you want to volunteer?</Text>
      <Text style={styles.subtitle}>Choose how often you are thinking of volunteering.</Text>

      {/* Frequency options */}
      <ScrollView style={styles.optionsContainer} contentContainerStyle={styles.optionsContent}>
        {frequencyOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.frequencyOption, selectedFrequency === option.id && styles.frequencyOptionSelected]}
            onPress={() => handleSelectFrequency(option.id)}
          >
            <Text style={[styles.frequencyTitle, selectedFrequency === option.id && styles.frequencyTitleSelected]}>
              {option.title}
            </Text>
            <Text
              style={[
                styles.frequencyDescription,
                selectedFrequency === option.id && styles.frequencyDescriptionSelected,
              ]}
            >
              {option.description}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom buttons */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.nextButton, selectedFrequency ? styles.nextButtonActive : {}]}
          onPress={handleNext}
          disabled={!selectedFrequency || loading}
        >
          <Text style={[styles.nextButtonText, selectedFrequency ? styles.nextButtonTextActive : {}]}>Next</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  optionsContainer: {
    flex: 1,
  },
  optionsContent: {
    paddingBottom: 20,
  },
  frequencyOption: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 30,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  frequencyOptionSelected: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  frequencyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
  },
  frequencyTitleSelected: {
    color: "#fff",
  },
  frequencyDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  frequencyDescriptionSelected: {
    color: "#fff",
  },
  bottomContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  nextButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 30,
    height: 50,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  nextButtonActive: {
    backgroundColor: "#000",
  },
  nextButtonText: {
    color: "#999",
    fontSize: 16,
    fontWeight: "bold",
  },
  nextButtonTextActive: {
    color: "#fff",
  },
  skipText: {
    color: "#666",
    fontSize: 14,
    marginTop: 10,
  },
})