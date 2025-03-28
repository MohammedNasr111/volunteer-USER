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
import { Search, Filter, ArrowLeft } from "lucide-react-native"
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "./firebase/config"
import { useFonts } from "expo-font"
import OpportunityCard, { type Opportunity } from "../components/opportunity-card"

// Define the filter options
const filterOptions = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "this-week", label: "This Week" },
  { id: "weekend", label: "Weekend" },
  { id: "virtual", label: "Virtual" },
]

export default function DiscoverScreen() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
    "AbhayaLibre-ExtraBold": require("../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
  })

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        // Create a base query
        const opportunitiesQuery = query(collection(db, "causes"), orderBy("date", "asc"), limit(20))

        // Apply filters if needed
        // This is a simplified example - in a real app, you'd implement more complex filtering
        if (activeFilter === "today") {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)

          // You would add where clauses here for date filtering
        }

        const opportunitiesSnapshot = await getDocs(opportunitiesQuery)
        const opportunitiesList = opportunitiesSnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            name: data.name || "",
            imageUrl: data.imageUrl || "",
            date: data.date || "",
            time: data.time || "",
            city: data.city || "",
            volunteers: data.volunteers || "0",
            organizationName: data.organizationName || "",
            organizationLogo: data.organizationLogo || "",
            createdBy: data.createdBy || "",
            description: data.description || "",
            registeredCount: data.registeredCount || 0,
            createdAt: data.createdAt || "",
          }
        })

        setOpportunities(opportunitiesList)
      } catch (error) {
        console.error("Error fetching opportunities:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchOpportunities()
  }, [activeFilter])

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  const handleSearch = () => {
    // For now, just log the search query
    console.log("Searching for:", searchQuery)
    // In a real app, you'd navigate to a search results page
  }

  const handleFilterChange = (filterId: string) => {
    setActiveFilter(filterId)
    setLoading(true)
  }

  const handleOpportunityPress = (opportunityId: string) => {
    // For now, just log the opportunity ID
    console.log("Opportunity pressed:", opportunityId)
    // In a real app, you'd navigate to the opportunity details
    router.push(`/opportunity/${opportunityId}` as any)
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discover</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Find Volunteer Opportunities"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#15B2BF" />
        </TouchableOpacity>
      </View>

      {/* Filter options */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filterOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.filterOption, activeFilter === option.id && styles.activeFilterOption]}
            onPress={() => handleFilterChange(option.id)}
          >
            <Text style={[styles.filterOptionText, activeFilter === option.id && styles.activeFilterOptionText]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Opportunities list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15B2BF" />
        </View>
      ) : (
        <FlatList
          data={opportunities}
          renderItem={({ item }) => (
            <View style={styles.opportunityCardWrapper}>
              <OpportunityCard opportunity={item} onPress={() => handleOpportunityPress(item.id)} />
            </View>
          )}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.opportunitiesList}
          columnWrapperStyle={styles.opportunitiesRow}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No opportunities found</Text>
              <Text style={styles.emptySubtext}>Try changing your filters or check back later</Text>
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
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 24,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 10,
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
  filterButton: {
    padding: 5,
  },
  filtersContainer: {
    maxHeight: 50,
    marginBottom: 10,
  },
  filtersContent: {
    paddingHorizontal: 15,
  },
  filterOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  activeFilterOption: {
    backgroundColor: "#15B2BF",
  },
  filterOptionText: {
    fontSize: 14,
    color: "#666",
  },
  activeFilterOptionText: {
    color: "#fff",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  opportunitiesList: {
    padding: 10,
    paddingBottom: 20, // Reduced padding since we don't have bottom navigation
  },
  opportunitiesRow: {
    justifyContent: "space-between",
  },
  opportunityCardWrapper: {
    width: "48%",
    marginBottom: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
})



