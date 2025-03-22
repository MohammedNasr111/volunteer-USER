"use client"
import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "./firebase/config"
import { useFonts } from "expo-font"
import BottomNavigation from "../components/bottom-navigation"
import OpportunityCard, { type Opportunity } from "../components/opportunity-card"

export default function HistoryScreen() {
  const router = useRouter()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
    "AbhayaLibre-ExtraBold": require("../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
  })

  useEffect(() => {
    const fetchPastOpportunities = async () => {
      try {
        setLoading(true)
        const userId = auth.currentUser?.uid

        if (!userId) {
          router.replace("/login")
          return
        }

        // Get user's registered opportunities
        const userDoc = await getDoc(doc(db, "users", userId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          const registeredOpportunityIds = userData.registered_opportunities || []
          const now = new Date()

          if (registeredOpportunityIds.length > 0) {
            // Fetch each opportunity
            const opportunitiesPromises = registeredOpportunityIds.map(async (oppId: string) => {
              const oppDoc = await getDoc(doc(db, "causes", oppId))
              if (oppDoc.exists()) {
                const oppData = oppDoc.data()
                const oppDate = new Date(oppData.date)

                // Only include past opportunities
                if (oppDate < now) {
                  return {
                    id: oppDoc.id,
                    name: oppData.name || "",
                    imageUrl: oppData.imageUrl || "",
                    date: oppData.date || "",
                    time: oppData.time || "",
                    city: oppData.city || "",
                    volunteers: oppData.volunteers || "0",
                    organizationName: oppData.organizationName || "",
                    description: oppData.description || "",
                    registeredCount: oppData.registeredCount || 0,
                  }
                }
              }
              return null
            })

            const results = await Promise.all(opportunitiesPromises)
            const pastOpportunities = results.filter(Boolean) as Opportunity[]

            // Sort by date (most recent first)
            pastOpportunities.sort((a, b) => {
              const dateA = new Date(a.date).getTime()
              const dateB = new Date(b.date).getTime()
              return dateB - dateA
            })

            setOpportunities(pastOpportunities)
          }
        }
      } catch (error) {
        console.error("Error fetching past opportunities:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPastOpportunities()
  }, [router])

  const handleOpportunityPress = (opportunityId: string) => {
    router.push(`/opportunity/${opportunityId}` as any)
  }

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Add a spacer view at the top */}
      <View style={styles.statusBarSpacer} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
      </View>

      {/* Opportunities List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15B2BF" />
        </View>
      ) : (
        <FlatList
          data={opportunities}
          renderItem={({ item }) => (
            <OpportunityCard opportunity={item} onPress={() => handleOpportunityPress(item.id)} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.opportunitiesList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Image source={require("../assets/images/placeholder.png")} style={styles.emptyImage} />
              <Text style={styles.emptyTitle}>No Past Causes</Text>
              <Text style={styles.emptyText}>You haven't participated in any volunteer opportunities yet.</Text>
              <TouchableOpacity style={styles.exploreButton} onPress={() => router.push("/home" as any)}>
                <Text style={styles.exploreButtonText}>Find Causes</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="history" />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  statusBarSpacer: {
    height: 60,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  opportunitiesList: {
    padding: 20,
    paddingBottom: 80, // Extra space for bottom navigation
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 50,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
    opacity: 0.7,
  },
  emptyTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 22,
    marginBottom: 10,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  exploreButton: {
    backgroundColor: "#15B2BF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
})

