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
import { useRouter, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { ArrowLeft, Calendar, MapPin } from "lucide-react-native"
import { collection, query, getDocs, where } from "firebase/firestore"
import { db } from "./firebase/config"
import { useFonts } from "expo-font"
import OpportunityCard, { type Opportunity } from "../components/opportunity-card"

export default function CityOpportunitiesScreen() {
  const router = useRouter()
  const { cityId, cityName } = useLocalSearchParams()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
    "AbhayaLibre-ExtraBold": require("../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
  })

  useEffect(() => {
    const fetchCityOpportunities = async () => {
      try {
        setLoading(true)

        // Get current date to filter only current/future opportunities
        const now = new Date()

        // Query opportunities for this city
        const cityOppsQuery = query(collection(db, "causes"), where("city", "==", cityName))

        const snapshot = await getDocs(cityOppsQuery)

        // Filter to only include current and future opportunities
        const currentOpportunities = snapshot.docs
          .map((doc) => {
            const data = doc.data()
            // Parse the date string to a Date object
            let opportunityDate
            try {
              opportunityDate = data.date ? new Date(data.date) : null
            } catch (e) {
              opportunityDate = null
            }

            // Only include future opportunities
            if (opportunityDate && opportunityDate < now) {
              return null // Skip past opportunities
            }

            return {
              id: doc.id,
              name: data.name || "",
              imageUrl: data.imageUrl || "",
              date: data.date || "",
              time: data.time || "",
              city: data.city || "",
              volunteers: data.volunteers || "0",
              organizationName: data.organizationName || "",
              description: data.description || "",
              registeredCount: data.registeredCount || 0,
            }
          })
          .filter(Boolean) // Remove null entries (past opportunities)

        setOpportunities(currentOpportunities as Opportunity[])
      } catch (error) {
        console.error("Error fetching city opportunities:", error)
        setOpportunities([])
      } finally {
        setLoading(false)
      }
    }

    if (cityName) {
      fetchCityOpportunities()
    }
  }, [cityName])

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  const handleOpportunityPress = (opportunityId: string) => {
    router.push(`/opportunity/${opportunityId}` as any)
  }

  // Format the city name for display
  const formattedCityName = typeof cityName === "string" ? cityName : "City"

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Add a spacer view at the top */}
      <View style={styles.statusBarSpacer} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{formattedCityName}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* City Info */}
      <View style={styles.cityInfoContainer}>
        <View style={styles.locationContainer}>
          <MapPin size={16} color="#666" />
          <Text style={styles.locationText}>{formattedCityName}</Text>
        </View>
        <View style={styles.dateContainer}>
          <Calendar size={16} color="#666" />
          <Text style={styles.dateText}>Current & Upcoming Opportunities</Text>
        </View>
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
              <Text style={styles.emptyTitle}>No Opportunities Found</Text>
              <Text style={styles.emptyText}>
                There are currently no volunteer opportunities available in {formattedCityName}.
              </Text>
              <Text style={styles.emptySubtext}>Check back later or explore opportunities in other cities.</Text>
              <TouchableOpacity style={styles.exploreButton} onPress={() => router.back()}>
                <Text style={styles.exploreButtonText}>Explore Other Cities</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  statusBarSpacer: {
    height: 60, // Increased from 40 to 60 for more spacing from the system bar
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 24,
    textAlign: "center",
  },
  placeholder: {
    width: 34, // Same width as back button for balanced layout
  },
  cityInfoContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    marginLeft: 5,
    fontSize: 14,
    color: "#666",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    marginLeft: 5,
    fontSize: 14,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  opportunitiesList: {
    padding: 20,
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
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

