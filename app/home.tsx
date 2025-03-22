"use client"
import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { Search, MapPin } from "lucide-react-native"
import { collection, query, getDocs, orderBy, limit, getDoc, doc, where } from "firebase/firestore"
import { auth, db } from "./firebase/config"
import { useFonts } from "expo-font"
import BottomNavigation from "../components/bottom-navigation"
import OpportunityCard, { type Opportunity } from "../components/opportunity-card"
import CauseCard, { type Cause } from "../components/cause-card"
import LocationCard, { type Location } from "../components/location-card"

// Define the tab options
const tabs = [
  { id: "causes", label: "Causes" },
  { id: "organization", label: "Organization" },
]

// Define city image mapping
interface CityImageMap {
  [key: string]: any
}

// Define cause image mapping
interface CauseImageMap {
  [key: string]: any
}

export default function HomeScreen() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("causes")
  const [searchQuery, setSearchQuery] = useState("")
  const [userLocation, setUserLocation] = useState("Kuala Lumpur, KUL")
  const [loading, setLoading] = useState(true)
  const [newOpportunities, setNewOpportunities] = useState<Opportunity[]>([])
  const [popularOpportunities, setPopularOpportunities] = useState<Opportunity[]>([])
  const [cities, setCities] = useState<Location[]>([])
  const [userCauses, setUserCauses] = useState<Cause[]>([])

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
    "AbhayaLibre-ExtraBold": require("../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
  })

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        setLoading(true)

        // Get current date to filter only current/future opportunities
        const now = new Date()

        // Fetch new opportunities (most recently created)
        const newOppsQuery = query(collection(db, "causes"), orderBy("createdAt", "desc"), limit(4))
        const newOppsSnapshot = await getDocs(newOppsQuery)
        const newOppsData = newOppsSnapshot.docs
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

        setNewOpportunities(newOppsData as Opportunity[])

        // Fetch popular opportunities (most volunteers)
        const popularOppsQuery = query(collection(db, "causes"), orderBy("volunteers", "desc"), limit(4))
        const popularOppsSnapshot = await getDocs(popularOppsQuery)
        const popularOppsData = popularOppsSnapshot.docs
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

        setPopularOpportunities(popularOppsData as Opportunity[])
      } catch (error) {
        console.error("Error fetching opportunities:", error)
        setNewOpportunities([])
        setPopularOpportunities([])
      } finally {
        setLoading(false)
      }
    }

    fetchOpportunities()
  }, [])

  // Add this to your useEffect or create a new useEffect
  useEffect(() => {
    const fetchCities = async () => {
      try {
        // Define city images from your assets folder
        const cityImages: CityImageMap = {
          "Kuala Lumpur": require("../assets/images/Kuala Lumpur.png"),
          "George Town": require("../assets/images/George Town.png"),
          "Johor Bahru": require("../assets/images/Johor Bahru.png"),
          Ipoh: require("../assets/images/Ipoh.png"),
          "Shah Alam": require("../assets/images/Shah Alam.png"),
          "Petaling Jaya": require("../assets/images/Petaling Jaya.png"),
          Kuching: require("../assets/images/Kuching.png"),
          "Kota Kinabalu": require("../assets/images/Kota Kinabalu.png"),
          Seremban: require("../assets/images/Seremban.png"),
          "Malacca City": require("../assets/images/Malacca City.png"),
          "Alor Setar": require("../assets/images/Alor Setar.png"),
          Kuantan: require("../assets/images/Kuantan.png"),
          Miri: require("../assets/images/Miri.png"),
          Sandakan: require("../assets/images/Sandakan.png"),
          Taiping: require("../assets/images/Taiping.png"),
        }

        // Get current date to filter only current/future opportunities
        const now = new Date()

        // For each city, count opportunities in that location
        const citiesWithCounts = await Promise.all(
          Object.keys(cityImages).map(async (cityName) => {
            // Query opportunities for this city
            const cityOppsQuery = query(collection(db, "causes"), where("city", "==", cityName))
            const snapshot = await getDocs(cityOppsQuery)

            // Filter to only include current and future opportunities
            const currentOpportunities = snapshot.docs.filter((doc) => {
              const data = doc.data()
              try {
                const opportunityDate = data.date ? new Date(data.date) : null
                return opportunityDate && opportunityDate >= now
              } catch (e) {
                return false
              }
            })

            return {
              id: cityName.toLowerCase().replace(/\s+/g, "-"), // Convert "Kuala Lumpur" to "kuala-lumpur"
              name: cityName,
              image: cityImages[cityName],
              count: `${currentOpportunities.length} Opportunities`, // Dynamic count based on actual data
            }
          }),
        )

        // Sort cities by opportunity count (highest first)
        citiesWithCounts.sort((a, b) => {
          const countA = Number.parseInt(a.count.split(" ")[0])
          const countB = Number.parseInt(b.count.split(" ")[0])
          return countB - countA
        })

        // Take top cities or all if less than 4
        setCities(citiesWithCounts.slice(0, 4))
      } catch (error) {
        console.error("Error fetching cities:", error)
        setCities([])
      }
    }

    fetchCities()
  }, [])

  useEffect(() => {
    const fetchUserCauses = async () => {
      try {
        const userId = auth.currentUser?.uid
        if (userId) {
          // Get user's selected causes
          const userDoc = await getDoc(doc(db, "users", userId))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.cause_preferences && userData.cause_preferences.length > 0) {
              // Map cause names to your existing image assets
              const causeImageMap: CauseImageMap = {
                Environment: require("../assets/images/Environment.png"),
                Technology: require("../assets/images/Technology.png"),
                Community: require("../assets/images/Community.png"),
                Women: require("../assets/images/Women.png"),
                Animals: require("../assets/images/Animals.png"),
                Food: require("../assets/images/Food.png"),
                "Arts & Culture": require("../assets/images/Arts.png"),
                Elderly: require("../assets/images/Elderly.png"),
                Health: require("../assets/images/Health.png"),
                "Sports & Recreation": require("../assets/images/Sports.png"),
                "Disaster Relief": require("../assets/images/Disaster Relief.png"),
                Youth: require("../assets/images/Youth.png"),
                Education: require("../assets/images/Education.png"),
                Politics: require("../assets/images/Politics.png"),
                "Race & Ethnicity": require("../assets/images/Race.png"),
              }

              // Convert user preferences to cause objects
              const userCausePrefs = userData.cause_preferences.map((causeId: string) => {
                // Map cause ID to a proper name and image
                const causeName = causeId.charAt(0).toUpperCase() + causeId.slice(1).replace(/_/g, " ")
                let causeImage

                try {
                  // Try to load the image, but provide a fallback if it fails
                  causeImage = causeImageMap[causeName] || require("../assets/images/placeholder.png")
                } catch (error) {
                  console.warn(`Could not load image for cause: ${causeName}`, error)
                  causeImage = null
                }

                return {
                  id: causeId,
                  name: causeName,
                  image: causeImage,
                }
              })

              setUserCauses(userCausePrefs)
            } else {
              setUserCauses([])
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user causes:", error)
        setUserCauses([])
      }
    }

    fetchUserCauses()
  }, [])

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
  }

  const handleSearch = () => {
    // For now, just log the search query
    console.log("Searching for:", searchQuery)
    // In a real app, you'd navigate to a search results page
  }

  const handleUpdateLocation = () => {
    // For now, just log that location update was requested
    console.log("Update location requested")
    // In a real app, you'd navigate to a location update screen
  }

  const handleChangePreferences = () => {
    // Navigate to preferences screen
    router.push("/causes" as any)
  }

  const handleOpportunityPress = (opportunityId: string) => {
    // Navigate to the opportunity details
    router.push(`/opportunity/${opportunityId}` as any)
  }

  const handleCausePress = (causeId: string) => {
    // For now, just log the cause ID
    console.log("Cause pressed:", causeId)
    // In a real app, you'd navigate to cause-specific opportunities
  }

  const handleCityPress = (cityId: string, cityName: string) => {
    // Navigate to city-specific opportunities
    router.push({
      pathname: "/city-opportunities" as any,
      params: { cityId, cityName },
    })
  }

  // Render the city cards
  const renderCityItem = ({ item }: { item: Location }) => {
    // Make sure the location has a valid image
    const locationImage = item.image || require("../assets/images/placeholder.png")

    return (
      <LocationCard location={{ ...item, image: locationImage }} onPress={() => handleCityPress(item.id, item.name)} />
    )
  }

  // In the return statement, reorder the elements to have the toggle first, then search bar
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Add a spacer view at the top */}
      <View style={styles.statusBarSpacer} />

      {/* Header with toggle tabs - Moved to the top with proper spacing */}
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => handleTabChange(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search bar - Now below the toggle */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Find Volunteer Opportunities"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
      </View>

      {/* The rest of the content remains the same */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Explore Near You Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Explore Near You</Text>
          <View style={styles.locationHeader}>
            <View style={styles.locationContainer}>
              <MapPin size={16} color="#666" />
              <Text style={styles.locationText}>{userLocation}</Text>
            </View>
            <TouchableOpacity style={styles.updateButton} onPress={handleUpdateLocation}>
              <Text style={styles.updateButtonText}>Update</Text>
            </TouchableOpacity>
          </View>

          {/* Cities horizontal scroll */}
          <FlatList
            horizontal
            data={cities}
            renderItem={renderCityItem}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.citiesContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No cities available</Text>
              </View>
            }
          />
        </View>

        {/* Volunteer with your favorite causes */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Volunteer with your favorite causes</Text>
            <View style={styles.basedOnContainer}>
              <Text style={styles.basedOnText}>based on</Text>
              <View style={styles.preferencesRow}>
                <Text style={styles.preferencesText}>Your Cause Preferences</Text>
                <TouchableOpacity onPress={handleChangePreferences}>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* User's selected causes */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.causesScrollView}>
            {userCauses.length > 0 ? (
              userCauses.map((cause) => (
                <CauseCard key={cause.id} cause={cause} onPress={() => handleCausePress(cause.id)} />
              ))
            ) : (
              <View style={styles.emptyCausesContainer}>
                <Text style={styles.emptyCausesText}>No preferences selected</Text>
                <TouchableOpacity onPress={handleChangePreferences}>
                  <Text style={styles.addPreferencesText}>Add preferences</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Discover New Causes */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Discover New Causes</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#15B2BF" style={styles.loader} />
          ) : newOpportunities.length === 0 ? (
            <View style={styles.emptyOpportunitiesContainer}>
              <Text style={styles.emptyOpportunitiesText}>No new opportunities available</Text>
            </View>
          ) : (
            <View style={styles.opportunitiesContainer}>
              {newOpportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onPress={() => handleOpportunityPress(opportunity.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Engage in Popular Causes */}
        <View style={[styles.sectionContainer, styles.lastSection]}>
          <Text style={styles.sectionTitle}>Engage in Popular Causes</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#15B2BF" style={styles.loader} />
          ) : popularOpportunities.length === 0 ? (
            <View style={styles.emptyOpportunitiesContainer}>
              <Text style={styles.emptyOpportunitiesText}>No popular opportunities available</Text>
            </View>
          ) : (
            <View style={styles.opportunitiesContainer}>
              {popularOpportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onPress={() => handleOpportunityPress(opportunity.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="home" />
    </SafeAreaView>
  )
}

// Change the SafeAreaView style to include paddingTop
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
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 25,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 25,
  },
  activeTab: {
    backgroundColor: "#000",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 45,
    backgroundColor: "#f5f5f5",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#eee",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  lastSection: {
    marginBottom: 100, // Extra space for bottom navigation
  },
  sectionTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 20,
    marginBottom: 10,
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    marginLeft: 5,
    fontSize: 14,
    color: "#666",
  },
  updateButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  updateButtonText: {
    color: "#15B2BF",
    fontSize: 14,
    fontWeight: "500",
  },
  citiesContainer: {
    paddingRight: 20,
  },
  sectionHeaderRow: {
    marginBottom: 5,
  },
  basedOnContainer: {
    marginTop: 5,
    marginBottom: 10,
  },
  basedOnText: {
    fontSize: 12,
    color: "#666",
  },
  preferencesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  preferencesText: {
    fontSize: 14,
    fontWeight: "500",
  },
  changeText: {
    color: "#15B2BF",
    fontSize: 14,
  },
  causesScrollView: {
    marginBottom: 10,
  },
  opportunitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  loader: {
    marginVertical: 20,
  },
  emptyContainer: {
    width: 150,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    marginRight: 15,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  emptyCausesContainer: {
    padding: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCausesText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  addPreferencesText: {
    fontSize: 14,
    color: "#15B2BF",
    fontWeight: "500",
  },
  emptyOpportunitiesContainer: {
    padding: 20,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  emptyOpportunitiesText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
})

