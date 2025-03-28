"use client"
import { useState, useEffect, type SetStateAction, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { Search, MapPin } from "lucide-react-native"
import {
  collection,
  query,
  getDocs,
  getDoc,
  doc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore"
import { auth, db } from "./firebase/config"
import { useFonts } from "expo-font"
import BottomNavigation from "../components/bottom-navigation"
import OpportunityCard, { type Opportunity } from "../components/opportunity-card"
import CauseCard, { type Cause } from "../components/cause-card"
import LocationCard, { type Location } from "../components/location-card"
import NGOFooter from "../components/ngo-footer"
import OrganizationCard, { type Organization } from "../components/organization-card"

// Define the tab options
const tabs = [
  { id: "causes", label: "Causes" },
  { id: "organization", label: "Organization" },
]

// Define types for Firestore data
interface CauseData {
  name?: string
  imageUrl?: string
  date?: string
  time?: string
  city?: string
  volunteers?: string
  organizationName?: string
  organizationLogo?: string
  createdBy?: string
  description?: string
  registeredCount?: number
  createdAt?: string
  causeTypes?: string[]
  registered_users?: string[]
}

interface OrgData {
  organizationName?: string
  photoURL?: string
  organizationDescription?: string
  location?: string
  verified?: boolean
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
  const [isFiltered, setIsFiltered] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loadingOrganizations, setLoadingOrganizations] = useState(false)

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
    "AbhayaLibre-ExtraBold": require("../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
  })

  // Function to fetch organizations
  const fetchOrganizations = useCallback(async () => {
    try {
      setLoadingOrganizations(true)

      // Fetch organizations from the admins collection
      const orgsQuery = query(collection(db, "admins"))
      const orgsSnapshot = await getDocs(orgsQuery)

      const orgsData = await Promise.all(
        orgsSnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data() as OrgData

          // Count causes for this organization
          const causesQuery = query(collection(db, "causes"), where("createdBy", "==", docSnapshot.id))
          const causesSnapshot = await getDocs(causesQuery)

          return {
            id: docSnapshot.id,
            name: data.organizationName || "Unknown Organization",
            logo: data.photoURL || null,
            description: data.organizationDescription || "No description available",
            location: data.location || null,
            verified: data.verified || false,
            causesCount: causesSnapshot.docs.length,
          } as Organization
        }),
      )

      // Sort organizations by causesCount (most active first)
      orgsData.sort((a: Organization, b: Organization) => (b.causesCount || 0) - (a.causesCount || 0))

      setOrganizations(orgsData)
    } catch (error) {
      console.error("Error fetching organizations:", error)
      setOrganizations([])
    } finally {
      setLoadingOrganizations(false)
    }
  }, [])

  // Function to fetch opportunities based on user preferences
  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true)

      // Get current date to filter only current/future opportunities
      const now = new Date()

      // First, get the user's cause preferences
      const userId = auth.currentUser?.uid
      let userCausePreferences: string[] = []

      if (userId) {
        const userDoc = await getDoc(doc(db, "users", userId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          userCausePreferences = userData.cause_preferences || []
        }
      }

      // If user has cause preferences, filter opportunities by those causes
      let newOppsQuery
      let popularOppsQuery

      if (userCausePreferences.length > 0) {
        console.log("User has preferences:", userCausePreferences)

        // Check if the causes in Firestore might be stored with different casing
        // Try a more general query first to see what data we get
        newOppsQuery = query(collection(db, "causes"))
        popularOppsQuery = query(collection(db, "causes"))

        // We'll filter the results in memory after fetching
        const newOppsSnapshot = await getDocs(newOppsQuery)
        console.log(`Retrieved ${newOppsSnapshot.docs.length} total causes documents`)

        // Now filter in memory based on cause types
        const newOppsData = await Promise.all(
          newOppsSnapshot.docs
            .filter((docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
              const data = docSnapshot.data() as CauseData
              const docCauseTypes = data.causeTypes || []

              // Check if any of the user's preferences match this document's cause types
              // Use case-insensitive comparison
              const hasMatchingCause = userCausePreferences.some((pref) => {
                return docCauseTypes.some(
                  (docType: string) => typeof docType === "string" && docType.toLowerCase() === pref.toLowerCase(),
                )
              })

              if (hasMatchingCause) {
                console.log(`Document ${docSnapshot.id} matches user preferences`)
              }

              return hasMatchingCause
            })
            .map(async (docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
              const data = docSnapshot.data() as CauseData
              // Parse the date string to a Date object
              let opportunityDate: Date | null = null
              try {
                opportunityDate = data.date ? new Date(data.date) : null
              } catch (e) {
                opportunityDate = null
              }

              // Only include future opportunities
              if (opportunityDate && opportunityDate < now) {
                return null // Skip past opportunities
              }

              // Fetch organization data if createdBy is available
              let orgName = data.organizationName || ""
              let orgLogo = data.organizationLogo || ""

              if (data.createdBy && (!orgName || !orgLogo)) {
                try {
                  const orgDoc = await getDoc(doc(db, "admins", data.createdBy))
                  if (orgDoc.exists()) {
                    const orgData = orgDoc.data() as OrgData
                    if (!orgName && orgData.organizationName) {
                      orgName = orgData.organizationName
                    }
                    if (!orgLogo && orgData.photoURL) {
                      orgLogo = orgData.photoURL
                    }
                  }
                } catch (error) {
                  console.error("Error fetching organization data:", error)
                }
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
                registeredCount: data.registeredCount || 0,
                createdAt: data.createdAt || "",
              } as Opportunity
            }),
        )

        // Filter out null entries and sort
        const filteredNewOppsData = newOppsData.filter(Boolean) as Opportunity[]

        // Sort the results in memory
        filteredNewOppsData.sort((a, b) => {
          if (!a || !b) return 0
          // Sort by createdAt in descending order (newest first)
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateB - dateA
        })

        // Limit to 4 items after sorting
        setNewOpportunities(filteredNewOppsData.slice(0, 4))
        console.log(`Filtered to ${filteredNewOppsData.length} matching opportunities`)

        // Do the same for popular opportunities
        const popularOppsSnapshot = await getDocs(popularOppsQuery)
        const popularOppsData = await Promise.all(
          popularOppsSnapshot.docs
            .filter((docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
              const data = docSnapshot.data() as CauseData
              const docCauseTypes = data.causeTypes || []

              // Check if any of the user's preferences match this document's cause types
              return userCausePreferences.some((pref) =>
                docCauseTypes.some(
                  (docType: string) => typeof docType === "string" && docType.toLowerCase() === pref.toLowerCase(),
                ),
              )
            })
            .map(async (docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
              // Same mapping logic as above
              const data = docSnapshot.data() as CauseData
              let opportunityDate: Date | null = null
              try {
                opportunityDate = data.date ? new Date(data.date) : null
              } catch (e) {
                opportunityDate = null
              }

              if (opportunityDate && opportunityDate < now) {
                return null
              }

              // Fetch organization data if createdBy is available
              let orgName = data.organizationName || ""
              let orgLogo = data.organizationLogo || ""

              if (data.createdBy && (!orgName || !orgLogo)) {
                try {
                  const orgDoc = await getDoc(doc(db, "admins", data.createdBy))
                  if (orgDoc.exists()) {
                    const orgData = orgDoc.data() as OrgData
                    if (!orgName && orgData.organizationName) {
                      orgName = orgData.organizationName
                    }
                    if (!orgLogo && orgData.photoURL) {
                      orgLogo = orgData.photoURL
                    }
                  }
                } catch (error) {
                  console.error("Error fetching organization data:", error)
                }
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
                registeredCount: data.registeredCount || 0,
                createdAt: data.createdAt || "",
              } as Opportunity
            }),
        )

        // Filter out null entries and sort
        const filteredPopularOppsData = popularOppsData.filter(Boolean) as Opportunity[]

        // Sort by volunteers count in memory
        filteredPopularOppsData.sort((a, b) => {
          if (!a || !b) return 0
          const volunteersA = Number.parseInt(a.volunteers || "0")
          const volunteersB = Number.parseInt(b.volunteers || "0")
          return volunteersB - volunteersA
        })

        setPopularOpportunities(filteredPopularOppsData.slice(0, 4))
      } else {
        // If no preferences, show all opportunities
        newOppsQuery = query(collection(db, "causes"))
        popularOppsQuery = query(collection(db, "causes"))
        console.log("No user preferences found, showing all opportunities")

        // Fetch new opportunities
        const newOppsSnapshot = await getDocs(newOppsQuery)
        console.log(`Retrieved ${newOppsSnapshot.docs.length} documents from new opportunities query`)

        const newOppsData = await Promise.all(
          newOppsSnapshot.docs.map(async (docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
            const data = docSnapshot.data() as CauseData
            // Parse the date string to a Date object
            let opportunityDate: Date | null = null
            try {
              opportunityDate = data.date ? new Date(data.date) : null
            } catch (e) {
              opportunityDate = null
            }

            // Only include future opportunities
            if (opportunityDate && opportunityDate < now) {
              return null // Skip past opportunities
            }

            // Fetch organization data if createdBy is available
            let orgName = data.organizationName || ""
            let orgLogo = data.organizationLogo || ""

            if (data.createdBy && (!orgName || !orgLogo)) {
              try {
                const orgDoc = await getDoc(doc(db, "admins", data.createdBy))
                if (orgDoc.exists()) {
                  const orgData = orgDoc.data() as OrgData
                  if (!orgName && orgData.organizationName) {
                    orgName = orgData.organizationName
                  }
                  if (!orgLogo && orgData.photoURL) {
                    orgLogo = orgData.photoURL
                  }
                }
              } catch (error) {
                console.error("Error fetching organization data:", error)
              }
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
              registeredCount: data.registeredCount || 0,
              createdAt: data.createdAt || "",
            } as Opportunity
          }),
        )

        // Filter out null entries and sort
        const filteredNewOppsData = newOppsData.filter(Boolean) as Opportunity[]

        // Sort the results in memory
        filteredNewOppsData.sort((a, b) => {
          if (!a || !b) return 0
          // Sort by createdAt in descending order (newest first)
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateB - dateA
        })

        // Limit to 4 items after sorting
        setNewOpportunities(filteredNewOppsData.slice(0, 4))

        // Fetch popular opportunities
        const popularOppsSnapshot = await getDocs(popularOppsQuery)
        console.log(`Retrieved ${popularOppsSnapshot.docs.length} documents from popular opportunities query`)

        const popularOppsData = await Promise.all(
          popularOppsSnapshot.docs.map(async (docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
            const data = docSnapshot.data() as CauseData
            // Parse the date string to a Date object
            let opportunityDate: Date | null = null
            try {
              opportunityDate = data.date ? new Date(data.date) : null
            } catch (e) {
              opportunityDate = null
            }

            // Only include future opportunities
            if (opportunityDate && opportunityDate < now) {
              return null // Skip past opportunities
            }

            // Fetch organization data if createdBy is available
            let orgName = data.organizationName || ""
            let orgLogo = data.organizationLogo || ""

            if (data.createdBy && (!orgName || !orgLogo)) {
              try {
                const orgDoc = await getDoc(doc(db, "admins", data.createdBy))
                if (orgDoc.exists()) {
                  const orgData = orgDoc.data() as OrgData
                  if (!orgName && orgData.organizationName) {
                    orgName = orgData.organizationName
                  }
                  if (!orgLogo && orgData.photoURL) {
                    orgLogo = orgData.photoURL
                  }
                }
              } catch (error) {
                console.error("Error fetching organization data:", error)
              }
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
              registeredCount: data.registeredCount || 0,
              createdAt: data.createdAt || "",
            } as Opportunity
          }),
        )

        // Filter out null entries and sort
        const filteredPopularOppsData = popularOppsData.filter(Boolean) as Opportunity[]

        // Sort by volunteers count in memory
        filteredPopularOppsData.sort((a, b) => {
          if (!a || !b) return 0
          const volunteersA = Number.parseInt(a.volunteers || "0")
          const volunteersB = Number.parseInt(b.volunteers || "0")
          return volunteersB - volunteersA
        })

        // Limit to 4 items after sorting
        setPopularOpportunities(filteredPopularOppsData.slice(0, 4))
      }

      setIsFiltered(userCausePreferences.length > 0)
    } catch (error) {
      console.error("Error fetching opportunities:", error)
      setNewOpportunities([])
      setPopularOpportunities([])
    } finally {
      setLoading(false)
    }
  }, [auth.currentUser?.uid])

  // Function to fetch cities
  const fetchCities = useCallback(async () => {
    try {
      // Define city images from your assets folder
      const cityImages: { [key: string]: any } = {
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

      // Get user's cause preferences
      const userId = auth.currentUser?.uid
      let userCausePreferences: string[] = []

      if (userId) {
        const userDoc = await getDoc(doc(db, "users", userId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          userCausePreferences = userData.cause_preferences || []
        }
      }

      // For each city, count opportunities in that location that match user preferences
      const citiesWithCounts = await Promise.all(
        Object.keys(cityImages).map(async (cityName) => {
          // Get all opportunities for this city first
          const cityOppsQuery = query(collection(db, "causes"), where("city", "==", cityName))

          const snapshot = await getDocs(cityOppsQuery)
          console.log(`City ${cityName}: Retrieved ${snapshot.docs.length} total opportunities`)

          // Filter to only include current and future opportunities that match user preferences
          const currentOpportunities = snapshot.docs.filter((docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
            const data = docSnapshot.data() as CauseData

            // Check date first
            try {
              const opportunityDate = data.date ? new Date(data.date) : null
              if (!opportunityDate || opportunityDate < now) {
                return false
              }
            } catch (e) {
              return false
            }

            // If user has preferences, check if this opportunity matches any of them
            if (userCausePreferences.length > 0) {
              const docCauseTypes = data.causeTypes || []
              return userCausePreferences.some((pref) =>
                docCauseTypes.some(
                  (docType: string) => typeof docType === "string" && docType.toLowerCase() === pref.toLowerCase(),
                ),
              )
            }

            // If no user preferences, include all current/future opportunities
            return true
          })

          console.log(`City ${cityName}: Filtered to ${currentOpportunities.length} matching opportunities`)

          return {
            id: cityName.toLowerCase().replace(/\s+/g, "-"),
            name: cityName,
            image: cityImages[cityName],
            count: `${currentOpportunities.length} Opportunities`,
          }
        }),
      )

      // Sort cities by opportunity count (highest first)
      citiesWithCounts.sort((a: Location, b: Location) => {
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
  }, [auth.currentUser?.uid])

  // Function to fetch user causes
  const fetchUserCauses = useCallback(async () => {
    try {
      const userId = auth.currentUser?.uid
      if (userId) {
        // Get user's selected causes
        const userDoc = await getDoc(doc(db, "users", userId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.cause_preferences && userData.cause_preferences.length > 0) {
            // Create a proper mapping of cause IDs to images
            const causeImageMap: Record<string, any> = {
              environment: require("../assets/images/Environment.png"),
              technology: require("../assets/images/Technology.png"),
              community: require("../assets/images/Community.png"),
              women: require("../assets/images/Women.png"),
              animals: require("../assets/images/Animals.png"),
              food: require("../assets/images/Food.png"),
              arts: require("../assets/images/Arts.png"),
              elderly: require("../assets/images/Elderly.png"),
              health: require("../assets/images/Health.png"),
              sports: require("../assets/images/Sports.png"),
              disaster: require("../assets/images/Disaster Relief.png"),
              youth: require("../assets/images/Youth.png"),
              education: require("../assets/images/Education.png"),
              politics: require("../assets/images/Politics.png"),
              race: require("../assets/images/Race.png"),
            }

            // Convert user preferences to cause objects with proper image mapping
            const userCausePrefs = userData.cause_preferences.map((causeId: string) => {
              // Normalize the cause ID to lowercase for consistent lookup
              const normalizedCauseId = causeId.toLowerCase()

              // Map cause ID to a proper name with correct capitalization and formatting
              let causeName = ""
              switch (normalizedCauseId) {
                case "arts":
                  causeName = "Arts & Culture"
                  break
                case "sports":
                  causeName = "Sports & Recreation"
                  break
                case "disaster":
                  causeName = "Disaster Relief"
                  break
                case "race":
                  causeName = "Race & Ethnicity"
                  break
                default:
                  // Default capitalization for other causes
                  causeName = normalizedCauseId.charAt(0).toUpperCase() + normalizedCauseId.slice(1)
              }

              // Use the normalized cause ID to look up the image
              const causeImage = causeImageMap[normalizedCauseId] || require("../assets/images/placeholder.png")

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
  }, [auth.currentUser?.uid])

  // Function to refresh all data
  const refreshData = useCallback(async () => {
    setLoading(true)
    try {
      if (activeTab === "causes") {
        await Promise.all([fetchUserCauses(), fetchOpportunities(), fetchCities()])
      } else {
        await fetchOrganizations()
      }
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setLoading(false)
    }
  }, [fetchUserCauses, fetchOpportunities, fetchCities, fetchOrganizations, activeTab])

  // Initial data loading
  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Add this useEffect to refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Home screen focused - refreshing data")
      refreshData()
      return () => {
        // Cleanup function when screen loses focus (optional)
      }
    }, [refreshData]),
  )

  // Effect to load organizations when tab changes to "organization"
  useEffect(() => {
    if (activeTab === "organization" && organizations.length === 0) {
      fetchOrganizations()
    }
  }, [activeTab, organizations.length, fetchOrganizations])

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  const handleTabChange = (tabId: SetStateAction<string>) => {
    setActiveTab(tabId)
  }

  const handleSearch = () => {
    // Navigate to discover page with search query
    router.push({
      pathname: "/discover",
      params: { query: searchQuery },
    } as any)
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

  const handleCityPress = (cityId: any, cityName: any) => {
    // Navigate to city-specific opportunities
    router.push({
      pathname: "/city-opportunities",
      params: { cityId, cityName },
    } as any)
  }

  const handleOrganizationPress = (organizationId: string) => {
    // Navigate to organization details
    router.push(`/organization/${organizationId}` as any)
  }

  // Render the city cards
  const renderCityItem = ({ item }: { item: Location }) => {
    // Make sure the location has a valid image
    const locationImage = item.image || require("../assets/images/placeholder.png")

    return (
      <LocationCard location={{ ...item, image: locationImage }} onPress={() => handleCityPress(item.id, item.name)} />
    )
  }

  // Render the organization view
  const renderOrganizationsView = () => {
    if (loadingOrganizations) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15B2BF" />
        </View>
      )
    }

    if (organizations.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No organizations available</Text>
        </View>
      )
    }

    return (
      <View style={styles.organizationsContainer}>
        <Text style={styles.sectionTitle}>Organizations</Text>
        <Text style={styles.organizationsSubtitle}>Discover organizations creating volunteer opportunities</Text>

        {organizations.map((org) => (
          <OrganizationCard key={org.id} organization={org} onPress={() => handleOrganizationPress(org.id)} />
        ))}
      </View>
    )
  }

  // Render the causes view
  const renderCausesView = () => {
    return (
      <>
        {/* Explore Near You Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{isFiltered ? "Explore Causes Near You" : "Explore Near You"}</Text>
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
          <Text style={styles.sectionTitle}>{isFiltered ? "Discover New Causes For You" : "Discover New Causes"}</Text>
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
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            {isFiltered ? "Popular Causes You Might Like" : "Engage in Popular Causes"}
          </Text>
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
      </>
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
      <TouchableOpacity style={styles.searchContainer} onPress={handleSearch}>
        <Search size={20} color="#999" style={styles.searchIcon} />
        <Text style={styles.searchPlaceholder}>
          {activeTab === "causes" ? "Find Volunteer Opportunities" : "Search Organizations"}
        </Text>
      </TouchableOpacity>

      {/* The rest of the content remains the same */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Render different content based on active tab */}
        {activeTab === "causes" ? renderCausesView() : renderOrganizationsView()}

        {/* NGO Footer - Added at the bottom before the last section spacing */}
        <NGOFooter />

        {/* Add extra space at the bottom for the navigation bar */}
        <View style={styles.lastSection} />
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
  searchPlaceholder: {
    flex: 1,
    color: "#999",
    fontSize: 14,
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
    height: 100, // Extra space for bottom navigation
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
  organizationsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  organizationsSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
})

