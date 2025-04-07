"use client"
import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
} from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { Edit2, LogOut, ArrowLeft, Info, X, Calendar, Clock } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { auth, db, storage } from "./firebase/config"
import { signOut } from "firebase/auth"
import { useFonts } from "expo-font"
import BottomNavigation from "../components/bottom-navigation"
import type { Opportunity } from "../components/opportunity-card"
import * as ImagePicker from "expo-image-picker"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { useFocusEffect } from "@react-navigation/native"
import { getDatabase, ref as realtimeRef, onValue } from "firebase/database"

// Get screen width
const screenWidth = Dimensions.get("window").width

// Add a global update function at the top of the file, after imports
declare global {
  var updateProfileData: ((data: any) => void) | null
}

// Initialize Firebase Realtime Database
const realtimeDb = getDatabase()

// Update the rank system to change the Platinum color to a gradient
const rankSystem = [
  { name: "Silver", minLevel: 1, maxLevel: 9, colors: ["#C0C0C0", "#E8E8E8"] as readonly [string, string] },
  { name: "Gold", minLevel: 10, maxLevel: 29, colors: ["#FFD700", "#FFC107"] as readonly [string, string] },
  { name: "Platinum", minLevel: 30, maxLevel: 59, colors: ["#4f6e75", "#6e8a91"] as readonly [string, string] },
  { name: "Emerald", minLevel: 60, maxLevel: 89, colors: ["#50C878", "#2E8B57"] as readonly [string, string] },
  { name: "Ruby", minLevel: 90, maxLevel: 129, colors: ["#E0115F", "#9B111E"] as readonly [string, string] },
  { name: "Diamond", minLevel: 130, maxLevel: 179, colors: ["#B9F2FF", "#1E90FF"] as readonly [string, string] },
  { name: "Elite", minLevel: 180, maxLevel: 1000, colors: ["#8A2BE2", "#FF00FF"] as readonly [string, string] },
]

// Define the tab options
const tabs = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "saved", label: "Saved" },
]

// Define the props interface for CompactOpportunityCard
interface CompactOpportunityCardProps {
  opportunity: Opportunity
  onPress: (opportunityId: string) => void
}

// Create a compact version of the OpportunityCard for the grid layout
const CompactOpportunityCard = ({ opportunity, onPress }: CompactOpportunityCardProps) => {
  const [orgName, setOrgName] = useState(opportunity.organizationName || "")
  const [orgLogo, setOrgLogo] = useState(opportunity.organizationLogo || "")
  const [registeredCount, setRegisteredCount] = useState(opportunity.registeredCount || 0)

  useEffect(() => {
    // Fetch organization data if needed
    if (opportunity.createdBy && typeof opportunity.createdBy === "string" && (!orgName || !orgLogo)) {
      const fetchOrgData = async () => {
        try {
          const orgDoc = await getDoc(doc(db, "admins", opportunity.createdBy as string))
          if (orgDoc.exists()) {
            const orgData = orgDoc.data()
            if (orgData.organizationName) {
              setOrgName(orgData.organizationName)
            }
            if (orgData.photoURL) {
              setOrgLogo(orgData.photoURL)
            }
          }
        } catch (error) {
          console.error("Error fetching organization data:", error)
        }
      }
      fetchOrgData()
    }
  }, [opportunity.createdBy, orgName, orgLogo])

  useEffect(() => {
    // Fetch real-time participant count from Firebase Realtime Database
    if (opportunity.id) {
      const participantsCountRef = realtimeRef(realtimeDb, `causes/${opportunity.id}/participantsCount`)

      // Set up a listener for real-time updates
      const unsubscribe = onValue(participantsCountRef, (snapshot) => {
        const count = snapshot.val() || 0
        setRegisteredCount(count)
      })

      // Clean up the listener when the component unmounts
      return () => unsubscribe()
    }
  }, [opportunity.id])

  // Format date for display (e.g., "Tue, 8 Apr • 08:00")
  const formatDateAndTime = (dateString?: string, timeString?: string) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)

      // Format day and date (e.g., "Tue, 8 Apr")
      const day = date.toLocaleDateString("en-US", { weekday: "short" })
      const dayNum = date.getDate()
      const month = date.toLocaleDateString("en-US", { month: "short" })

      // Extract start time from timeString if available
      let startTime = ""
      if (timeString) {
        const timeParts = timeString.split(" - ")
        if (timeParts.length > 0) {
          startTime = timeParts[0].trim()
        }
      }

      return `${day}, ${dayNum} ${month} • ${startTime}`
    } catch (e) {
      console.error("Error formatting date:", e)
      return dateString
    }
  }

  // Calculate duration from time string
  const calculateDuration = (timeString?: string) => {
    if (!timeString || !timeString.includes("-")) return "4 hrs"

    try {
      const [startTimeStr, endTimeStr] = timeString.split("-").map((t) => t.trim())

      // Parse start time
      let startHour = 0
      let startMinute = 0
      const startMatch = startTimeStr.match(/(\d+):(\d+)(?:\s*(AM|PM))?/i)

      if (startMatch) {
        startHour = Number.parseInt(startMatch[1], 10)
        startMinute = Number.parseInt(startMatch[2], 10)

        // Handle AM/PM for start time
        const startPeriod = startMatch[3]?.toUpperCase()
        if (startPeriod === "PM" && startHour < 12) startHour += 12
        if (startPeriod === "AM" && startHour === 12) startHour = 0
      }

      // Parse end time
      let endHour = 0
      let endMinute = 0
      const endMatch = endTimeStr.match(/(\d+):(\d+)(?:\s*(AM|PM))?/i)

      if (endMatch) {
        endHour = Number.parseInt(endMatch[1], 10)
        endMinute = Number.parseInt(endMatch[2], 10)

        // Handle AM/PM for end time
        const endPeriod = endMatch[3]?.toUpperCase()
        if (endPeriod === "PM" && endHour < 12) endHour += 12
        if (endPeriod === "AM" && endHour === 12) endHour = 0
      }

      // Calculate duration in hours
      const startMinutes = startHour * 60 + startMinute
      const endMinutes = endHour * 60 + endMinute

      // Handle case where end time is on the next day
      const durationMinutes =
        endMinutes >= startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes

      const durationHours = durationMinutes / 60

      // Format the duration
      return durationHours % 1 === 0 ? `${durationHours} hrs` : `${durationHours.toFixed(1)} hrs`
    } catch (error) {
      console.error("Error calculating duration:", error)
      return "4 hrs" // Fallback
    }
  }

  // Get the display name and logo for the organization
  const displayOrgName = orgName || opportunity.organizationName || "Unknown Organization"
  const displayOrgLogo = orgLogo || opportunity.organizationLogo

  // Calculate the volunteers count
  const maxVolunteers = Number.parseInt(opportunity.volunteers || "0", 10)
  const volunteersText = `${registeredCount}/${maxVolunteers} joined`

  // Get the duration
  const duration = calculateDuration(opportunity.time)

  return (
    <TouchableOpacity style={styles.compactCard} onPress={() => onPress(opportunity.id)} activeOpacity={0.7}>
      <View style={styles.compactImageContainer}>
        <Image
          source={opportunity.imageUrl ? { uri: opportunity.imageUrl } : require("../assets/images/placeholder.png")}
          style={styles.compactImage}
        />

        {/* Date Badge with Calendar Icon */}
        <View style={styles.compactDateBadge}>
          <Calendar size={12} color="#000" style={styles.compactCalendarIcon} />
          <Text style={styles.compactDateText}>{formatDateAndTime(opportunity.date, opportunity.time)}</Text>
        </View>

        {/* Duration Badge with Clock Icon */}
        <View style={styles.compactDurationBadge}>
          <Clock size={12} color="#000" style={styles.compactClockIcon} />
          <Text style={styles.compactDurationText}>{duration}</Text>
        </View>
      </View>

      <View style={styles.compactContent}>
        <Text style={styles.compactTitle} numberOfLines={2}>
          {opportunity.name}
        </Text>

        {/* Organization */}
        <View style={styles.compactOrgRow}>
          {displayOrgLogo ? (
            <Image source={{ uri: displayOrgLogo }} style={styles.compactOrgLogo} />
          ) : (
            <View style={styles.compactOrgLogoPlaceholder} />
          )}
          <Text style={styles.compactOrgName} numberOfLines={1}>
            {displayOrgName}
          </Text>
        </View>

        <View style={styles.joinedCountContainer}>
          <Text style={styles.joinedCountText}>{volunteersText}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function ProfileScreen() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("upcoming")
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loadingOpportunities, setLoadingOpportunities] = useState(false)
  const [experienceLevel, setExperienceLevel] = useState(0)
  const [rank, setRank] = useState(rankSystem[0])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showRankInfo, setShowRankInfo] = useState(false)

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
    "AbhayaLibre-ExtraBold": require("../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
  })

  const fetchOpportunities = useCallback(async (userId: string, tabType: string) => {
    try {
      setLoadingOpportunities(true)
      let opportunitiesList: Opportunity[] = []
      const now = new Date()

      if (tabType === "upcoming" || tabType === "past") {
        // Get user's registered opportunities
        const userDoc = await getDoc(doc(db, "users", userId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          const registeredOpportunityIds = userData.registered_opportunities || []

          if (registeredOpportunityIds.length > 0) {
            // Fetch each opportunity
            const opportunitiesPromises = registeredOpportunityIds.map(async (oppId: string) => {
              const oppDoc = await getDoc(doc(db, "causes", oppId))
              if (oppDoc.exists()) {
                const oppData = oppDoc.data()
                const oppDate = new Date(oppData.date)

                // Filter based on tab type
                if ((tabType === "upcoming" && oppDate >= now) || (tabType === "past" && oppDate < now)) {
                  return {
                    id: oppDoc.id,
                    name: oppData.name || "",
                    imageUrl: oppData.imageUrl || "",
                    date: oppData.date || "",
                    time: oppData.time || "",
                    city: oppData.city || "",
                    volunteers: oppData.volunteers || "0",
                    organizationName: oppData.organizationName || "",
                    organizationLogo: oppData.organizationLogo || "",
                    description: oppData.description || "",
                    registeredCount: oppData.registeredCount || 0,
                    createdBy: oppData.createdBy || "", // Add createdBy field
                  }
                }
              }
              return null
            })

            const results = await Promise.all(opportunitiesPromises)
            opportunitiesList = results.filter(Boolean) as Opportunity[]

            // Sort by date (oldest first)
            opportunitiesList.sort((a, b) => {
              // Handle potential undefined dates with fallback to empty string
              const dateA = a.date ? new Date(a.date).getTime() : 0
              const dateB = b.date ? new Date(b.date).getTime() : 0
              return dateA - dateB // Sort in ascending order (oldest first)
            })
          }
        }
      } else if (tabType === "saved") {
        // Get user's saved opportunities
        const userDoc = await getDoc(doc(db, "users", userId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          const savedOpportunityIds = userData.saved_opportunities || []

          if (savedOpportunityIds.length > 0) {
            // Fetch each opportunity
            const opportunitiesPromises = savedOpportunityIds.map(async (oppId: string) => {
              const oppDoc = await getDoc(doc(db, "causes", oppId))
              if (oppDoc.exists()) {
                const oppData = oppDoc.data()
                return {
                  id: oppDoc.id,
                  name: oppData.name || "",
                  imageUrl: oppData.imageUrl || "",
                  date: oppData.date || "",
                  time: oppData.time || "",
                  city: oppData.city || "",
                  volunteers: oppData.volunteers || "0",
                  organizationName: oppData.organizationName || "",
                  organizationLogo: oppData.organizationLogo || "",
                  description: oppData.description || "",
                  registeredCount: oppData.registeredCount || 0,
                  createdBy: oppData.createdBy || "", // Add createdBy field
                }
              }
              return null
            })

            const results = await Promise.all(opportunitiesPromises)
            opportunitiesList = results.filter(Boolean) as Opportunity[]

            // Sort by date (oldest first)
            opportunitiesList.sort((a, b) => {
              // Handle potential undefined dates with fallback to empty string
              const dateA = a.date ? new Date(a.date).getTime() : 0
              const dateB = b.date ? new Date(b.date).getTime() : 0
              return dateA - dateB // Sort in ascending order (oldest first)
            })
          }
        }
      }

      setOpportunities(opportunitiesList)
    } catch (error) {
      console.error("Error fetching opportunities:", error)
    } finally {
      setLoadingOpportunities(false)
    }
  }, [])

  // In the ProfileScreen component, add this inside the component but outside any other functions:
  useEffect(() => {
    // Create a global function that the edit profile page can call to update our state
    global.updateProfileData = (newData) => {
      // Only update if the data is different to prevent unnecessary re-renders
      setUserData((prevData: any) => {
        if (JSON.stringify(prevData) === JSON.stringify(newData)) {
          return prevData // No change needed
        }
        return newData
      })

      // Also update other derived state
      if (newData.registered_opportunities) {
        const level = newData.registered_opportunities.length * 2
        setExperienceLevel(level)

        // Determine rank based on level
        const userRank = rankSystem.find((r) => level >= r.minLevel && level <= r.maxLevel) || rankSystem[0]
        setRank(userRank)
      }

      // Refresh opportunities if needed
      if (auth.currentUser?.uid) {
        fetchOpportunities(auth.currentUser.uid, activeTab)
      }
    }

    // Clean up the global function when component unmounts
    return () => {
      global.updateProfileData = null
    }
  }, [activeTab, fetchOpportunities]) // Include activeTab in dependencies since we use it in the function

  const fetchUserData = async () => {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) {
        router.replace("/splash")
        return
      }

      const userDoc = await getDoc(doc(db, "users", userId))
      if (userDoc.exists()) {
        const data = userDoc.data()
        setUserData(data)

        // Calculate experience level based on registered opportunities
        // Each opportunity gives 2 points
        const registeredOpportunities = data.registered_opportunities || []
        const level = registeredOpportunities.length * 2
        setExperienceLevel(level)

        // Determine rank based on level
        const userRank = rankSystem.find((r) => level >= r.minLevel && level <= r.maxLevel) || rankSystem[0]
        setRank(userRank)

        // Fetch opportunities based on active tab
        fetchOpportunities(userId, activeTab)
      } else {
        console.error("User document not found")
        router.replace("/splash")
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [router, fetchOpportunities, activeTab])

  // Add this useEffect to refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Profile screen focused - refreshing data")
      // Only fetch opportunities when the screen is focused, not the full user data
      if (auth.currentUser?.uid) {
        fetchOpportunities(auth.currentUser.uid, activeTab)
      }
      return () => {
        // Cleanup function when screen loses focus (optional)
      }
    }, [fetchOpportunities, activeTab]),
  )

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    if (auth.currentUser?.uid) {
      fetchOpportunities(auth.currentUser.uid, tabId)
    }
  }

  const handleEditProfile = () => {
    router.push("/edit-profile" as any)
  }

  const handleSignOut = async () => {
    try {
      // First navigate to splash screen, then sign out
      router.replace("/splash")
      // Add a small delay before signing out to ensure navigation completes
      setTimeout(() => {
        signOut(auth).catch((error) => {
          console.error("Error signing out:", error)
        })
      }, 100)
    } catch (error) {
      console.error("Error during sign out process:", error)
    }
  }

  const handleFindMoreCauses = () => {
    router.push("/home" as any)
  }

  const handleOpportunityPress = (opportunityId: string) => {
    router.push(`/opportunity/${opportunityId}` as any)
  }

  const pickImage = async () => {
    try {
      // Request permission to access the photo library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant permission to access your photos")
        return
      }

      // Launch the image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as ImagePicker.MediaTypeOptions,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0]
        await uploadProfileImage(selectedImage.uri)
      }
    } catch (error) {
      console.error("Error picking image:", error)
      Alert.alert("Error", "Failed to pick image")
    }
  }

  const uploadProfileImage = async (uri: string) => {
    try {
      setUploadingImage(true)
      const userId = auth.currentUser?.uid

      if (!userId) {
        throw new Error("User not authenticated")
      }

      // Create a blob from the image URI
      const response = await fetch(uri)
      const blob = await response.blob()

      // Create a reference to the storage location
      const storageRef = ref(storage, `users/${userId}/profile`)

      // Upload the blob
      await uploadBytes(storageRef, blob)

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef)

      // Update the user's profile in Firestore
      await updateDoc(doc(db, "users", userId), {
        photoURL: downloadURL,
      })

      // Update local state
      setUserData((prev: any) => ({
        ...prev,
        photoURL: downloadURL,
      }))

      Alert.alert("Success", "Profile picture updated successfully")
    } catch (error) {
      console.error("Error uploading image:", error)
      Alert.alert("Error", "Failed to upload profile picture")
    } finally {
      setUploadingImage(false)
    }
  }

  const toggleRankInfo = () => {
    setShowRankInfo(!showRankInfo)
  }

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#15B2BF" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Add a spacer view at the top */}
      <View style={styles.statusBarSpacer} />

      {/* Header with back button */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          <TouchableOpacity onPress={pickImage} disabled={uploadingImage}>
            {uploadingImage ? (
              <View style={styles.profileImage}>
                <ActivityIndicator size="large" color="#15B2BF" />
              </View>
            ) : (
              <Image
                source={userData?.photoURL ? { uri: userData.photoURL } : require("../assets/images/placeholder.png")}
                style={styles.profileImage}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.userInfoContainer}>
          <Text style={styles.userName}>{`${userData?.firstName || ""} ${userData?.lastName || ""}`}</Text>
          <Text style={styles.userEmail}>{userData?.email || ""}</Text>

          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Edit2 size={20} color="#6750A4" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Experience and Rank */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Experience Level:</Text>
          <View style={styles.levelContainer}>
            <Text style={styles.levelText}>Lvl {experienceLevel}</Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>
            Rank:
            <TouchableOpacity onPress={toggleRankInfo} style={styles.infoIconButton}>
              <Info size={14} color="#fff" />
            </TouchableOpacity>
          </Text>
          <LinearGradient colors={rank.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.rankBadge}>
            <Text style={styles.rankText}>{rank.name}</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <LogOut size={18} color="#fff" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Your Events Section */}
      <Text style={styles.sectionTitle}>Your Causes</Text>

      {/* Tab Navigation */}
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

      {/* Horizontal line to separate tabs from content */}
      <View style={styles.horizontalLine} />

      {/* Opportunities List */}
      {loadingOpportunities ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15B2BF" />
        </View>
      ) : opportunities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No {activeTab} causes found</Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <FlatList
            key={`opportunities-${activeTab}`} // Add a key that changes when the tab changes
            data={opportunities}
            renderItem={({ item }) => <CompactOpportunityCard opportunity={item} onPress={handleOpportunityPress} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.opportunitiesContent}
            numColumns={2} // Change to 2 columns
            columnWrapperStyle={styles.columnWrapper} // Add style for columns
          />
        </View>
      )}

      {/* Find More Causes Button */}
      {opportunities.length === 0 && (
        <TouchableOpacity style={styles.findMoreButton} onPress={handleFindMoreCauses}>
          <Text style={styles.findMoreText}>Find More Causes</Text>
        </TouchableOpacity>
      )}

      {/* Rank Info Modal */}
      {showRankInfo && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rank System</Text>
              <TouchableOpacity style={styles.closeButton} onPress={toggleRankInfo}>
                <X size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Earn ranks by participating in volunteer opportunities</Text>

            <ScrollView style={styles.ranksList}>
              {rankSystem.map((rankItem, index) => (
                <View key={index} style={styles.rankItem}>
                  <LinearGradient
                    colors={rankItem.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.rankItemBadge}
                  >
                    <Text style={styles.rankItemText}>{rankItem.name}</Text>
                  </LinearGradient>
                  <Text style={styles.rankItemLevel}>
                    Level {rankItem.minLevel} - {rankItem.maxLevel}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <Text style={styles.modalFooter}>Each volunteer opportunity completed earns you 2 experience points</Text>
          </View>
        </View>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="profile" />
    </SafeAreaView>
  )
}

// Update the styles to match the home page layout
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  statusBarSpacer: {
    height: 40,
    backgroundColor: "#fff",
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
    position: "relative",
  },
  profileImageContainer: {
    position: "relative",
    marginRight: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  editImageButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#15B2BF",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  userInfoContainer: {
    flex: 1,
    position: "relative",
  },
  userName: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 20,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
  },
  editButton: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ECE6F0",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#15B2BF",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#fff",
    marginHorizontal: 15,
  },
  statLabel: {
    fontSize: 14,
    marginRight: 8,
    color: "#fff",
  },
  levelContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#15B2BF",
  },
  rankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF4757",
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: 15,
    width: 140,
    height: 40,
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  signOutText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },
  horizontalLine: {
    height: 1,
    backgroundColor: "#eee",
    marginTop: 10,
    marginBottom: 15,
    width: "100%",
  },
  sectionTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 20,
    marginBottom: 15,
    color: "#15B2BF",
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginHorizontal: 20,
    marginBottom: 10,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: "#15B2BF",
    borderColor: "#15B2BF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "500",
  },
  opportunitiesContainer: {
    flex: 1,
    width: "100%", // Take full width
  },
  opportunitiesContent: {
    paddingBottom: 80, // Add padding at the bottom for the navigation bar
    paddingHorizontal: 15, // Add horizontal padding
  },
  cardContainer: {
    width: "100%", // Each card takes full width
    marginBottom: 15,
    alignSelf: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  findMoreButton: {
    backgroundColor: "#000",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginVertical: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  findMoreText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  infoIconButton: {
    marginLeft: 5,
    padding: 2,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 22,
    color: "#15B2BF",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  ranksList: {
    maxHeight: 300,
  },
  rankItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  rankItemBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    minWidth: 100,
    alignItems: "center",
  },
  rankItemText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  rankItemLevel: {
    fontSize: 14,
    color: "#333",
  },
  modalFooter: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 15,
    textAlign: "center",
  },
  contentContainer: {
    flex: 1,
  },
  // New styles for the grid layout
  columnWrapper: {
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  compactCard: {
    width: (screenWidth - 50) / 2, // Calculate width for 2 columns with spacing
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    marginBottom: 15,
  },
  compactImageContainer: {
    position: "relative",
    width: "100%",
    height: 120,
  },
  compactImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  compactDateBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  compactDateText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "500",
  },
  compactDurationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  compactDurationText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "500",
  },
  compactContent: {
    padding: 10,
  },
  compactTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 14,
    marginBottom: 6,
    height: 36, // Fixed height for 2 lines
  },
  compactOrgRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  compactOrgLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 4,
  },
  compactOrgLogoPlaceholder: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    marginRight: 4,
  },
  compactOrgName: {
    fontSize: 11,
    color: "#666",
    flex: 1,
  },
  compactVolunteers: {
    fontSize: 11,
    color: "#15B2BF",
    fontWeight: "500",
    marginTop: 4, // Add some spacing above the count
  },
  joinedCountContainer: {
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  joinedCountText: {
    fontSize: 11,
    color: "#15B2BF",
    fontWeight: "bold",
  },
  compactCalendarIcon: {
    marginRight: 4,
  },
  compactClockIcon: {
    marginRight: 4,
  },
})

