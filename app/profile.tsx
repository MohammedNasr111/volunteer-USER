"use client"
import { useState, useEffect } from "react"
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
} from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { Edit2, LogOut, ArrowLeft } from "lucide-react-native"
import { LinearGradient } from "expo-linear-gradient"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { auth, db, storage } from "./firebase/config"
import { signOut } from "firebase/auth"
import { useFonts } from "expo-font"
import BottomNavigation from "../components/bottom-navigation"
import OpportunityCard, { type Opportunity } from "../components/opportunity-card"
import * as ImagePicker from "expo-image-picker"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"

// Add a global update function at the top of the file, after imports
declare global {
  var updateProfileData: ((data: any) => void) | null
}

// Define the rank system
const rankSystem = [
  { name: "Silver", minLevel: 1, maxLevel: 9, colors: ["#C0C0C0", "#E8E8E8"] as readonly [string, string] },
  { name: "Gold", minLevel: 10, maxLevel: 29, colors: ["#FFD700", "#FFC107"] as readonly [string, string] },
  { name: "Platinum", minLevel: 30, maxLevel: 59, colors: ["#E5E4E2", "#A9A9A9"] as readonly [string, string] },
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

  // In the ProfileScreen component, add this inside the component but outside any other functions:
  useEffect(() => {
    // Create a global function that the edit profile page can call to update our state
    global.updateProfileData = (newData) => {
      setUserData(newData)

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
  }, [activeTab]) // Include activeTab in dependencies since we use it in the function

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
    "AbhayaLibre-ExtraBold": require("../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
  })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = auth.currentUser?.uid
        if (!userId) {
          router.replace("/login")
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
          router.replace("/login")
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  const fetchOpportunities = async (userId: string, tabType: string) => {
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
                    description: oppData.description || "",
                    registeredCount: oppData.registeredCount || 0,
                  }
                }
              }
              return null
            })

            const results = await Promise.all(opportunitiesPromises)
            opportunitiesList = results.filter(Boolean) as Opportunity[]
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
                  description: oppData.description || "",
                  registeredCount: oppData.registeredCount || 0,
                }
              }
              return null
            })

            const results = await Promise.all(opportunitiesPromises)
            opportunitiesList = results.filter(Boolean) as Opportunity[]
          }
        }
      }

      setOpportunities(opportunitiesList)
    } catch (error) {
      console.error("Error fetching opportunities:", error)
    } finally {
      setLoadingOpportunities(false)
    }
  }

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
      await signOut(auth)
      router.replace("/splash")
    } catch (error) {
      console.error("Error signing out:", error)
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
          <Text style={styles.statLabel}>Rank:</Text>
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
        <ScrollView style={styles.opportunitiesContainer}>
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onPress={() => handleOpportunityPress(opportunity.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Find More Causes Button */}
      {opportunities.length === 0 && (
        <TouchableOpacity style={styles.findMoreButton} onPress={handleFindMoreCauses}>
          <Text style={styles.findMoreText}>Find More Causes</Text>
        </TouchableOpacity>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="profile" />
    </SafeAreaView>
  )
}

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
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginHorizontal: 20,
    paddingVertical: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statDivider: {
    width: 20,
  },
  statLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  levelContainer: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
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
    marginBottom: 20,
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
    paddingHorizontal: 20,
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
})



