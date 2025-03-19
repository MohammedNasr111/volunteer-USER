"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList } from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { ArrowLeft, Check } from "lucide-react-native"
import { useFonts } from "expo-font"
import { doc, updateDoc } from "firebase/firestore"
import { auth, db } from "./firebase/config"

// Define the causes data
const causesData = [
  { id: "environment", name: "Environment", image: require("../assets/images/Environment.png") },
  { id: "technology", name: "Technology", image: require("../assets/images/Technology.png") },
  { id: "community", name: "Community", image: require("../assets/images/Community.png") },
  { id: "women", name: "Women", image: require("../assets/images/Women.png") },
  { id: "animals", name: "Animals", image: require("../assets/images/Animals.png") },
  { id: "food", name: "Food", image: require("../assets/images/Food.png") },
  { id: "arts", name: "Arts & Culture", image: require("../assets/images/Arts.png") },
  { id: "elderly", name: "Elderly", image: require("../assets/images/Elderly.png") },
  { id: "health", name: "Health", image: require("../assets/images/Health.png") },
  { id: "sports", name: "Sports & Recreation", image: require("../assets/images/Sports.png") },
  { id: "disaster", name: "Disaster Relief", image: require("../assets/images/Disaster Relief.png") },
  { id: "youth", name: "Youth", image: require("../assets/images/Youth.png") },
  { id: "education", name: "Education", image: require("../assets/images/Education.png") },
  { id: "politics", name: "Politics", image: require("../assets/images/Politics.png") },
  { id: "race", name: "Race & Ethnicity", image: require("../assets/images/Race.png") },
]

export default function CausesScreen() {
  const router = useRouter()
  const [selectedCauses, setSelectedCauses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
  })

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  const toggleCause = (causeId: string) => {
    if (selectedCauses.includes(causeId)) {
      setSelectedCauses(selectedCauses.filter((id) => id !== causeId))
    } else {
      setSelectedCauses([...selectedCauses, causeId])
    }
  }

  const handleNext = async () => {
    if (selectedCauses.length === 0) return

    try {
      setLoading(true)
      const userId = auth.currentUser?.uid

      if (userId) {
        // Save selected causes to Firestore
        await updateDoc(doc(db, "users", userId), {
          cause_preferences: selectedCauses,
          onboarding_completed: true,
        })
      }

      // Navigate to home screen
      router.replace("/home")
    } catch (error) {
      console.error("Error saving preferences:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    router.replace("/home")
  }

  const renderCauseItem = ({ item }: { item: (typeof causesData)[0] }) => {
    const isSelected = selectedCauses.includes(item.id)

    return (
      <TouchableOpacity
        style={[styles.causeItem, isSelected && styles.causeItemSelected]}
        onPress={() => toggleCause(item.id)}
      >
        <Image source={item.image} style={styles.causeImage} />
        {isSelected && (
          <View style={styles.checkIconContainer}>
            <Check size={20} color="#fff" />
          </View>
        )}
        <Text style={styles.causeName}>{item.name}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>

        {/* Pagination dots */}
        <View style={styles.paginationContainer}>
          <View style={[styles.paginationDot, styles.activeDot]} />
          <View style={styles.paginationDot} />
          <View style={styles.paginationDot} />
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>What Causes are you interested in?</Text>
      <Text style={styles.subtitle}>
        Select one or multiple causes to help us identify relevant opportunities for you!
      </Text>

      {/* Causes grid */}
      <FlatList
        data={causesData}
        renderItem={renderCauseItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.causesGrid}
      />

      {/* Bottom buttons */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.nextButton, selectedCauses.length > 0 ? styles.nextButtonActive : {}]}
          onPress={handleNext}
          disabled={selectedCauses.length === 0 || loading}
        >
          <Text style={[styles.nextButtonText, selectedCauses.length > 0 ? styles.nextButtonTextActive : {}]}>
            Next
          </Text>
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
    marginBottom: 20,
  },
  causesGrid: {
    paddingBottom: 20,
  },
  causeItem: {
    width: 105.54,
    height: 111.14,
    margin: 5,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  causeItemSelected: {
    borderWidth: 2,
    borderColor: "#15B2BF",
    backgroundColor: "rgba(21, 178, 191, 0.2)",
  },
  causeImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  checkIconContainer: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "#15B2BF",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  causeName: {
    position: "absolute",
    bottom: 8,
    left: 8,
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bottomContainer: {
    marginTop: "auto",
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

