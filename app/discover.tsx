"use client"
import { useState, useEffect, useCallback } from "react"
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
  Image,
  Modal,
  Alert,
} from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { Search, ArrowLeft, ChevronDown, X, Check, Heart, MapPin, RefreshCw } from "lucide-react-native"
import {
  collection,
  query,
  getDocs,
  getDoc,
  orderBy,
  limit,
  doc,
  where,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore"
import { db, auth } from "./firebase/config"
import { useFonts } from "expo-font"
import type { Opportunity } from "../components/opportunity-card"
import { ref, get } from "firebase/database"
import { realtimeDb } from "./firebase/config"
import { useLocationContext } from "../contexts/LocationContext"
import { Linking } from "react-native"

// Define the filter options
const filterOptions = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "this-week", label: "This Week" },
  { id: "weekend", label: "Weekend" },
  { id: "virtual", label: "Virtual" },
]

// Define distance options for location filter
const distanceOptions = [
  { id: "5", label: "5 km" },
  { id: "10", label: "10 km" },
  { id: "15", label: "15 km" },
  { id: "20", label: "20 km+" },
]

// Define cause types
const causeTypes = [
  { id: "environment", label: "Environment" },
  { id: "technology", label: "Technology" },
  { id: "community", label: "Community" },
  { id: "women", label: "Women" },
  { id: "animals", label: "Animals" },
  { id: "food", label: "Food" },
  { id: "arts", label: "Arts & Culture" },
  { id: "elderly", label: "Elderly" },
  { id: "health", label: "Health" },
  { id: "sports", label: "Sports & Recreation" },
  { id: "disaster", label: "Disaster Relief" },
  { id: "youth", label: "Youth" },
  { id: "education", label: "Education" },
  { id: "politics", label: "Politics" },
  { id: "race", label: "Race & Ethnicity" },
]

export default function DiscoverScreen() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState("Kuala Lumpur")
  const [savedCauses, setSavedCauses] = useState<string[]>([])

  // Filter states
  const [showLocationFilter, setShowLocationFilter] = useState(false)
  const [showSortFilter, setShowSortFilter] = useState(false)
  const [showCausesFilter, setShowCausesFilter] = useState(false)
  const [selectedDistance, setSelectedDistance] = useState("")
  const [selectedCauses, setSelectedCauses] = useState<string[]>([])
  const [sortOption, setSortOption] = useState("newest")
  const [refreshingLocation, setRefreshingLocation] = useState(false)

  // Get location context
  const {
    currentLocation,
    isLocationEnabled,
    requestLocationPermission,
    calculateDistanceFromUser,
    filterByDistance,
    refreshLocation,
  } = useLocationContext()

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
    "AbhayaLibre-ExtraBold": require("../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
  })

  // Function to fetch saved causes
  const fetchSavedCauses = useCallback(async () => {
    if (!auth.currentUser) return

    try {
      // Get saved causes from Firestore
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const savedOpportunities = userData.saved_opportunities || []
        setSavedCauses(savedOpportunities)
      }
    } catch (error) {
      console.error("Error fetching saved causes:", error)
    }
  }, [])

  // Function to toggle saved cause
  const toggleSavedCause = async (causeId: string) => {
    if (!auth.currentUser) {
      // Redirect to login or show login prompt
      alert("Please login to save causes")
      return
    }

    try {
      const userRef = doc(db, "users", auth.currentUser.uid)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        const userData = userDoc.data()
        const savedOpportunities = userData.saved_opportunities || []

        if (savedOpportunities.includes(causeId)) {
          // Remove from saved causes
          await updateDoc(userRef, {
            saved_opportunities: arrayRemove(causeId),
          })
          setSavedCauses(savedCauses.filter((id) => id !== causeId))
        } else {
          // Add to saved causes
          await updateDoc(userRef, {
            saved_opportunities: arrayUnion(causeId),
          })
          setSavedCauses([...savedCauses, causeId])
        }
      }
    } catch (error) {
      console.error("Error toggling saved cause:", error)
    }
  }

  // Function to fetch opportunities
  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true)

      // Get current date to filter out past causes
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      // Create a base query that only gets current and future causes
      const opportunitiesQuery = query(
        collection(db, "causes"),
        where("date", ">=", today.toISOString().split("T")[0]),
        orderBy("date", "asc"),
        limit(50),
      )

      const opportunitiesSnapshot = await getDocs(opportunitiesQuery)

      const opportunitiesList = await Promise.all(
        opportunitiesSnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data()

          // Get organization data if needed
          let orgName = data.organizationName || ""
          let orgLogo = data.organizationLogo || ""

          if (data.createdBy && (!orgName || !orgLogo)) {
            try {
              const orgDocRef = doc(db, "admins", data.createdBy)
              const orgDoc = await getDoc(orgDocRef)
              const orgData = orgDoc.data() as { organizationName?: string; photoURL?: string }
              if (!orgName && orgData?.organizationName) {
                orgName = orgData.organizationName
              }
              if (!orgLogo && orgData?.photoURL) {
                orgLogo = orgData.photoURL
              }
            } catch (error) {
              console.error("Error fetching organization data:", error)
            }
          }

          // Get real-time participant count
          let participantsCount = data.registeredCount || 0
          try {
            const countRef = ref(realtimeDb, `causes/${docSnapshot.id}/participantsCount`)
            const countSnapshot = await get(countRef)
            if (countSnapshot.exists()) {
              participantsCount = countSnapshot.val() || 0
            }
          } catch (error) {
            console.error("Error fetching participant count:", error)
          }

          // Calculate distance from user if location is available
          let distanceFromUser = null
          if (currentLocation && data.location?.coordinates?.lat && data.location?.coordinates?.lng) {
            distanceFromUser = calculateDistanceFromUser(data.location.coordinates.lat, data.location.coordinates.lng)
          }

          return {
            id: docSnapshot.id,
            name: data.name || "",
            imageUrl: data.imageUrl || "",
            date: data.date || "",
            time: data.time || "",
            city: data.city || "",
            volunteers: data.volunteers || "0",
            organizationName: orgName,
            organizationLogo: orgLogo,
            createdBy: data.createdBy || "",
            description: data.description || "",
            registeredCount: participantsCount,
            causeTypes: data.causeTypes || [],
            location: data.location || null,
            distanceFromUser: distanceFromUser,
          }
        }),
      )

      setOpportunities(opportunitiesList)
      setFilteredOpportunities(opportunitiesList)
    } catch (error) {
      console.error("Error fetching opportunities:", error)
    } finally {
      setLoading(false)
    }
  }, [currentLocation, calculateDistanceFromUser])

  // Initial data loading
  useEffect(() => {
    fetchOpportunities()
    fetchSavedCauses()
  }, [fetchOpportunities, fetchSavedCauses])

  // Apply filters when search query, active filter, or other filters change
  useEffect(() => {
    if (opportunities.length === 0) return

    let filtered = [...opportunities]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (opp) =>
          opp.name.toLowerCase().includes(query) ||
          (opp.organizationName?.toLowerCase() || "").includes(query) ||
          (opp.description?.toLowerCase() || "").includes(query),
      )
    }

    // Apply time filter
    if (activeFilter !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfWeek = new Date(today)
      endOfWeek.setDate(today.getDate() + 7)

      const saturday = new Date(today)
      saturday.setDate(today.getDate() + (6 - today.getDay()))
      const sunday = new Date(saturday)
      sunday.setDate(saturday.getDate() + 1)

      filtered = filtered.filter((opp) => {
        if (!opp.date) return false
        const oppDate = new Date(opp.date)

        switch (activeFilter) {
          case "today":
            return oppDate.toDateString() === today.toDateString()
          case "this-week":
            return oppDate >= today && oppDate < endOfWeek
          case "weekend":
            return (
              oppDate.toDateString() === saturday.toDateString() || oppDate.toDateString() === sunday.toDateString()
            )
          case "virtual":
            return opp.city?.toLowerCase().includes("virtual") || false
          default:
            return true
        }
      })
    }

    // Apply cause type filter
    if (selectedCauses.length > 0) {
      filtered = filtered.filter((opp) => {
        if (!opp.causeTypes || opp.causeTypes.length === 0) return false
        return selectedCauses.some((cause) =>
          (opp.causeTypes || []).map((c: string) => c.toLowerCase()).includes(cause.toLowerCase()),
        )
      })
    }

    // Apply distance filter
    if (selectedDistance && currentLocation) {
      const maxDistance = selectedDistance === "20" ? 1000 : Number.parseInt(selectedDistance) // If 20km+, use a large value

      filtered = filtered.filter((opp) => {
        // Skip causes without location data
        if (!opp.location?.coordinates?.lat || !opp.location?.coordinates?.lng) {
          return false
        }

        // Calculate distance if not already calculated
        let distance = opp.distanceFromUser
        if (distance === null || distance === undefined) {
          distance = calculateDistanceFromUser(opp.location.coordinates.lat, opp.location.coordinates.lng)
        }

        // If distance couldn't be calculated, exclude the cause
        if (distance === null) return false

        // Include the cause if it's within the selected distance
        return distance <= maxDistance
      })
    }

    // Apply sort
    if (sortOption === "newest") {
      filtered.sort((a, b) => {
        if (!a.date || !b.date) return 0
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
    } else if (sortOption === "oldest") {
      filtered.sort((a, b) => {
        if (!a.date || !b.date) return 0
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      })
    } else if (sortOption === "distance" && currentLocation) {
      // Sort by distance from user
      filtered.sort((a, b) => {
        const distA =
          a.distanceFromUser !== null && a.distanceFromUser !== undefined
            ? a.distanceFromUser
            : Number.POSITIVE_INFINITY
        const distB =
          b.distanceFromUser !== null && b.distanceFromUser !== undefined
            ? b.distanceFromUser
            : Number.POSITIVE_INFINITY
        return distA - distB
      })
    }

    setFilteredOpportunities(filtered)
  }, [
    opportunities,
    searchQuery,
    activeFilter,
    selectedDistance,
    selectedCauses,
    sortOption,
    currentLocation,
    calculateDistanceFromUser,
  ])

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  const handleSearch = (text: string) => {
    setSearchQuery(text)
  }

  const handleFilterChange = (filterId: string) => {
    setActiveFilter(filterId)
  }

  const handleOpportunityPress = (opportunityId: string) => {
    router.push(`/opportunity/${opportunityId}` as any)
  }

  const toggleLocationFilter = async () => {
    // If location is not enabled, request permission first
    if (!isLocationEnabled) {
      const granted = await requestLocationPermission()
      if (!granted) {
        Alert.alert(
          "Location Permission Required",
          "To filter causes by distance, please enable location permissions.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        )
        return
      }
    }

    setShowLocationFilter(!showLocationFilter)
    setShowSortFilter(false)
    setShowCausesFilter(false)
  }

  const toggleSortFilter = () => {
    setShowSortFilter(!showSortFilter)
    setShowLocationFilter(false)
    setShowCausesFilter(false)
  }

  const toggleCausesFilter = () => {
    setShowCausesFilter(!showCausesFilter)
    setShowLocationFilter(false)
    setShowSortFilter(false)
  }

  const handleSelectDistance = (distance: string) => {
    if (selectedDistance === distance) {
      // If clicking the same distance, unselect it
      setSelectedDistance("")
    } else {
      setSelectedDistance(distance)
    }
    setShowLocationFilter(false)
  }

  const handleSelectSort = (sort: string) => {
    setSortOption(sort)
    setShowSortFilter(false)
  }

  const handleToggleCause = (causeId: string) => {
    if (selectedCauses.includes(causeId)) {
      setSelectedCauses(selectedCauses.filter((id) => id !== causeId))
    } else {
      setSelectedCauses([...selectedCauses, causeId])
    }
  }

  const handleApplyCauses = () => {
    setShowCausesFilter(false)
  }

  const handleClearFilters = () => {
    setSelectedDistance("")
    setSelectedCauses([])
    setSortOption("newest")
    setActiveFilter("all")
    setSearchQuery("")
  }

  const handleRefreshLocation = async () => {
    setRefreshingLocation(true)
    try {
      await refreshLocation()
      // After location is refreshed, refetch opportunities to update distances
      await fetchOpportunities()
    } catch (error) {
      console.error("Error refreshing location:", error)
    } finally {
      setRefreshingLocation(false)
    }
  }

  // Custom opportunity card for search results
  const renderSearchResultItem = ({ item }: { item: Opportunity }) => {
    // Format date (e.g., "Tuesday, August 19")
    const formatDate = (dateString?: string) => {
      if (!dateString) return ""
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    }

    // Format time (e.g., "07:00 - 12:30 PM")
    const formatTime = (timeString?: string) => {
      if (!timeString) return ""
      return timeString
    }

    // Get spots text
    const maxSpots = Number.parseInt(item.volunteers || "0")
    const registeredCount = item.registeredCount || 0
    const spotsText = `${registeredCount}/${maxSpots} spots open`

    // Check if cause is saved
    const isSaved = savedCauses.includes(item.id)

    // Display distance if available
    const distanceText =
      item.distanceFromUser !== null && item.distanceFromUser !== undefined
        ? `${item.distanceFromUser.toFixed(1)} km away`
        : ""

    return (
      <View style={styles.resultCard}>
        <View style={styles.resultContent}>
          <Text style={styles.resultTitle}>{item.name}</Text>

          <View style={styles.organizationRow}>
            {item.organizationLogo ? (
              <Image source={{ uri: item.organizationLogo }} style={styles.orgLogo} />
            ) : (
              <View style={styles.orgLogoPlaceholder} />
            )}
            <Text style={styles.organizationName}>{item.organizationName}</Text>
          </View>

          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
          <Text style={styles.timeText}>{formatTime(item.time)}</Text>

          <View style={styles.detailsRow}>
            <Text style={styles.spotsText}>{spotsText}</Text>

            {distanceText && (
              <View style={styles.distanceContainer}>
                <MapPin size={12} color="#15B2BF" />
                <Text style={styles.distanceText}>{distanceText}</Text>
              </View>
            )}
          </View>
        </View>

        <Image
          source={item.imageUrl ? { uri: item.imageUrl } : require("../assets/images/placeholder.png")}
          style={styles.resultImage}
        />

        <TouchableOpacity
          style={[styles.heartButton, isSaved && styles.heartButtonActive]}
          onPress={() => toggleSavedCause(item.id)}
        >
          <Heart size={20} color={isSaved ? "#fff" : "#666"} fill={isSaved ? "#FF4081" : "none"} />
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header with aligned title and back button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Searching Causes</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshLocation} disabled={refreshingLocation}>
          <RefreshCw size={22} color="#15B2BF" style={refreshingLocation ? styles.refreshingIcon : {}} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Causes in ${userLocation}`}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
            <X size={18} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter options */}
      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[styles.filterButton, selectedDistance ? styles.activeFilterButton : {}]}
          onPress={toggleLocationFilter}
        >
          <Text style={[styles.filterButtonText, selectedDistance ? styles.activeFilterText : {}]}>
            Location {selectedDistance ? `(${selectedDistance} km)` : ""}
          </Text>
          <ChevronDown size={16} color={selectedDistance ? "#15B2BF" : "#666"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            sortOption !== "newest" ? styles.activeFilterButton : {},
            { paddingHorizontal: 10 }, // Reduce horizontal padding specifically for Sort button
          ]}
          onPress={toggleSortFilter}
        >
          <Text style={[styles.filterButtonText, sortOption !== "newest" ? styles.activeFilterText : {}]}>Sort</Text>
          <ChevronDown size={16} color={sortOption !== "newest" ? "#15B2BF" : "#666"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedCauses.length > 0 ? styles.activeFilterButton : {}]}
          onPress={toggleCausesFilter}
        >
          <Text style={[styles.filterButtonText, selectedCauses.length > 0 ? styles.activeFilterText : {}]}>
            Causes {selectedCauses.length > 0 ? `(${selectedCauses.length})` : ""}
          </Text>
          <ChevronDown size={16} color={selectedCauses.length > 0 ? "#15B2BF" : "#666"} />
        </TouchableOpacity>
      </View>

      {/* Location Filter Modal */}
      <Modal
        visible={showLocationFilter}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationFilter(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLocationFilter(false)}>
          <View style={[styles.filterModal, styles.locationFilterModal]}>
            <Text style={styles.filterModalTitle}>Select Distance</Text>
            {distanceOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.filterOption, selectedDistance === option.id ? styles.selectedFilterOption : {}]}
                onPress={() => handleSelectDistance(option.id)}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    selectedDistance === option.id ? styles.selectedFilterOptionText : {},
                  ]}
                >
                  {option.label}
                </Text>
                {selectedDistance === option.id && <Check size={18} color="#15B2BF" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sort Filter Modal */}
      <Modal visible={showSortFilter} transparent animationType="fade" onRequestClose={() => setShowSortFilter(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSortFilter(false)}>
          <View style={[styles.filterModal, styles.sortFilterModal]}>
            <Text style={styles.filterModalTitle}>Sort By</Text>
            <TouchableOpacity
              style={[styles.filterOption, sortOption === "newest" ? styles.selectedFilterOption : {}]}
              onPress={() => handleSelectSort("newest")}
            >
              <Text style={[styles.filterOptionText, sortOption === "newest" ? styles.selectedFilterOptionText : {}]}>
                Newest First
              </Text>
              {sortOption === "newest" && <Check size={18} color="#15B2BF" />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterOption, sortOption === "oldest" ? styles.selectedFilterOption : {}]}
              onPress={() => handleSelectSort("oldest")}
            >
              <Text style={[styles.filterOptionText, sortOption === "oldest" ? styles.selectedFilterOptionText : {}]}>
                Oldest First
              </Text>
              {sortOption === "oldest" && <Check size={18} color="#15B2BF" />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterOption, sortOption === "distance" ? styles.selectedFilterOption : {}]}
              onPress={() => handleSelectSort("distance")}
            >
              <Text style={[styles.filterOptionText, sortOption === "distance" ? styles.selectedFilterOptionText : {}]}>
                Distance (Nearest First)
              </Text>
              {sortOption === "distance" && <Check size={18} color="#15B2BF" />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Causes Filter Modal */}
      <Modal
        visible={showCausesFilter}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCausesFilter(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCausesFilter(false)}>
          <View style={[styles.filterModal, styles.causesFilterModal]}>
            <Text style={styles.filterModalTitle}>Select Causes</Text>
            <ScrollView style={styles.causesScrollView}>
              {causeTypes.map((cause) => (
                <TouchableOpacity
                  key={cause.id}
                  style={[styles.filterOption, selectedCauses.includes(cause.id) ? styles.selectedFilterOption : {}]}
                  onPress={() => handleToggleCause(cause.id)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedCauses.includes(cause.id) ? styles.selectedFilterOptionText : {},
                    ]}
                  >
                    {cause.label}
                  </Text>
                  {selectedCauses.includes(cause.id) && <Check size={18} color="#15B2BF" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.applyButton} onPress={handleApplyCauses}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Opportunities List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15B2BF" />
        </View>
      ) : (
        <>
          {filteredOpportunities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>Please try searching for something else or adjust your filters.</Text>
              {(searchQuery || selectedDistance || selectedCauses.length > 0 || activeFilter !== "all") && (
                <TouchableOpacity style={styles.clearFiltersButton} onPress={handleClearFilters}>
                  <Text style={styles.clearFiltersText}>Clear All Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredOpportunities}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleOpportunityPress(item.id)}>
                  {renderSearchResultItem({ item })}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.opportunitiesList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
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
    paddingTop: 60, // Increased from 45 to 60 for more spacing from the top
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // Removed the border bottom
  },
  backButton: {
    width: 40,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  refreshingIcon: {
    opacity: 0.5,
    transform: [{ rotate: "45deg" }],
  },
  headerTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 22,
    textAlign: "center",
    flex: 1,
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
  clearButton: {
    padding: 5,
  },
  filtersRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: "center",
    gap: 8, // Small gap between buttons
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    // Add drop shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3, // For Android shadow
    // Remove minWidth to let buttons size naturally based on content
  },
  activeFilterButton: {
    borderColor: "#15B2BF",
    backgroundColor: "#E0F7FA",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#666",
    marginRight: 5,
  },
  activeFilterText: {
    color: "#15B2BF",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterModal: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "80%",
    maxHeight: "80%",
  },
  locationFilterModal: {
    position: "absolute",
    top: 150,
    left: "10%",
  },
  sortFilterModal: {
    position: "absolute",
    top: 150,
    left: "10%",
  },
  causesFilterModal: {
    position: "absolute",
    top: 150,
    left: "10%",
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#15B2BF",
  },
  filterOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedFilterOption: {
    backgroundColor: "#E0F7FA",
  },
  filterOptionText: {
    fontSize: 16,
    color: "#333",
  },
  selectedFilterOptionText: {
    color: "#15B2BF",
    fontWeight: "500",
  },
  causesScrollView: {
    maxHeight: 300,
  },
  applyButton: {
    backgroundColor: "#15B2BF",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 15,
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  opportunitiesList: {
    padding: 15,
    paddingBottom: 80, // Extra space for bottom navigation
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  clearFiltersButton: {
    backgroundColor: "#15B2BF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  clearFiltersText: {
    color: "#fff",
    fontWeight: "bold",
  },
  resultCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#eee",
    position: "relative",
  },
  resultContent: {
    flex: 1,
    paddingRight: 10,
  },
  resultTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 16,
    marginBottom: 5,
  },
  organizationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  orgLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  orgLogoPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  organizationName: {
    fontSize: 14,
    color: "#666",
  },
  dateText: {
    fontSize: 12,
    color: "#333",
  },
  timeText: {
    fontSize: 12,
    color: "#666",
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  spotsText: {
    fontSize: 12,
    color: "#15B2BF",
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  distanceText: {
    fontSize: 12,
    color: "#15B2BF",
    marginLeft: 3,
  },
  resultImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginLeft: 10,
  },
  heartButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  heartButtonActive: {
    backgroundColor: "rgba(240, 100, 150, 0.8)",
  },
  disabledButton: {
    backgroundColor: "#ddd",
  },
})
