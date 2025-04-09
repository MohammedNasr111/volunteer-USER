"use client"
import { useState, useEffect, useCallback } from "react"
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, SafeAreaView } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { ArrowLeft, Calendar, Users } from "lucide-react-native"
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore"
import { db } from "../firebase/config"
import { useFonts } from "expo-font"
import OpportunityCard, { type Opportunity } from "../../components/opportunity-card"
import { StyleSheet } from "react-native"
import { auth } from "../firebase/config"

interface OrganizationOpportunity extends Opportunity {
  isPast?: boolean
}

interface OrganizationDetails {
  id: string
  name: string
  logo?: string
  description?: string
  location?: string
  email?: string
  phone?: string
  website?: string
  foundedYear?: string
  mission?: string
  verified?: boolean
  causesCount?: number
  volunteersCount?: number
  firstName?: string
  lastName?: string
}

export default function OrganizationScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const [organization, setOrganization] = useState<OrganizationDetails | null>(null)
  const [causes, setCauses] = useState<OrganizationOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("current")

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../../assets/fonts/AbhayaLibre-Regular.ttf"),
    "AbhayaLibre-ExtraBold": require("../../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
  })

  // Fetch organization details and causes
  const fetchOrganizationData = useCallback(async () => {
    try {
      setLoading(true)
      if (!id) return
      
      // Check if user is authenticated before fetching
      if (!auth.currentUser) {
        console.log("Skipping organization data fetch - user not authenticated")
        return
      }

      // Fetch organization details
      const orgDoc = await getDoc(doc(db, "admins", id as string))
      interface OrgData {
        organizationName?: string
        photoURL?: string
        foundedDate?: string
        createdAt?: string
        organizationDescription?: string
        workEmail?: string
        email?: string
        contactNumber?: string
        website?: string
        missionStatement?: string
        verified?: boolean
        firstName?: string
        lastName?: string
      }

      let orgData: OrgData = {}
      let orgName = ""
      let orgLogo = ""

      if (orgDoc.exists()) {
        orgData = orgDoc.data() as OrgData
        orgName = orgData.organizationName || "Unknown Organization"
        orgLogo = orgData.photoURL || ""

        // Format the foundedDate or fall back to createdAt if foundedDate is not available
        let foundedDate = "N/A"
        if (orgData.foundedDate) {
          try {
            const date = new Date(orgData.foundedDate)
            foundedDate = date.toISOString().split("T")[0] // Format as YYYY-MM-DD
          } catch (e) {
            console.error("Error formatting founded date:", e)
          }
        } else if (orgData.createdAt) {
          try {
            const date = new Date(orgData.createdAt)
            foundedDate = date.toISOString().split("T")[0] // Format as YYYY-MM-DD
          } catch (e) {
            console.error("Error formatting date:", e)
          }
        }

        setOrganization({
          id: orgDoc.id,
          name: orgName,
          logo: orgLogo || undefined,
          description: orgData.organizationDescription || "No description available",
          email: orgData.workEmail || orgData.email || undefined,
          phone: orgData.contactNumber || undefined,
          website: orgData.website || undefined,
          foundedYear: foundedDate,
          mission: orgData.missionStatement || undefined,
          verified: orgData.verified || false,
          firstName: orgData.firstName || undefined,
          lastName: orgData.lastName || undefined,
        })
      }

      // Fetch causes created by this organization
      const causesQuery = query(collection(db, "causes"), where("createdBy", "==", id))
      const causesSnapshot = await getDocs(causesQuery)

      // Get current date to filter current vs past causes
      const now = new Date()

      const causesData = causesSnapshot.docs.map((doc) => {
        const data = doc.data()

        // Parse the date string to a Date object
        let causeDate
        try {
          causeDate = data.date ? new Date(data.date) : null
        } catch (e) {
          causeDate = null
        }

        // Store the organization data directly in the cause object
        return {
          id: doc.id,
          name: data.name || "",
          imageUrl: data.imageUrl || "",
          date: data.date || "",
          time: data.time || "",
          city: data.city || "",
          volunteers: data.volunteers || "0",
          organizationName: orgName,
          organizationLogo: orgLogo,
          description: data.description || "",
          registeredCount: data.registered_users?.length || 0,
          isPast: causeDate && causeDate < now,
        } as OrganizationOpportunity
      })

      setCauses(causesData)
    } catch (error) {
      console.error("Error fetching organization data:", error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchOrganizationData()
  }, [fetchOrganizationData])

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#15B2BF" />
      </View>
    )
  }

  if (!organization) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Organization not found</Text>
      </View>
    )
  }

  // Filter causes based on active tab
  const filteredCauses = causes.filter((cause: OrganizationOpportunity) =>
    activeTab === "current" ? !cause.isPast : cause.isPast,
  )

  const handleCausePress = (causeId: string) => {
    router.push(`/opportunity/${causeId}` as any)
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Add a spacer view at the top */}
      <View style={styles.statusBarSpacer} />

      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organization</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Organization Profile */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <Image
              source={organization.logo ? { uri: organization.logo } : require("../../assets/images/placeholder.png")}
              style={styles.logo}
            />
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.organizationName}>{organization.name}</Text>
                {organization.verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Organization Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Calendar size={18} color="#15B2BF" />
              <Text style={styles.statValue}>{organization.foundedYear || "N/A"}</Text>
              <Text style={styles.statLabel}>Founded</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Users size={18} color="#15B2BF" />
              <Text style={styles.statValue}>{causes.length}</Text>
              <Text style={styles.statLabel}>Causes</Text>
            </View>
          </View>

          {/* Organization Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>{organization.description}</Text>
          </View>

          {/* Mission Statement */}
          {organization.mission && (
            <View style={styles.missionContainer}>
              <Text style={styles.sectionTitle}>Our Mission</Text>
              <Text style={styles.missionText}>{organization.mission}</Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Causes Section */}
        <View style={styles.causesSection}>
          <Text style={styles.sectionTitle}>Causes</Text>

          {/* Tabs for Current/Past Causes */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "current" && styles.activeTab]}
              onPress={() => setActiveTab("current")}
            >
              <Text style={[styles.tabText, activeTab === "current" && styles.activeTabText]}>Current</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "past" && styles.activeTab]}
              onPress={() => setActiveTab("past")}
            >
              <Text style={[styles.tabText, activeTab === "past" && styles.activeTabText]}>Past</Text>
            </TouchableOpacity>
          </View>

          {/* Causes List */}
          {filteredCauses.length > 0 ? (
            <View style={styles.causesContainer}>
              {filteredCauses.map((cause) => (
                <OpportunityCard key={cause.id} opportunity={cause} onPress={() => handleCausePress(cause.id)} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyCausesContainer}>
              <Text style={styles.emptyCausesText}>
                No {activeTab === "current" ? "current" : "past"} causes available
              </Text>
            </View>
          )}
        </View>

        {/* Contact Information */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactInfo}>
            {organization.firstName && organization.lastName && (
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>Name:</Text>
                <Text style={styles.contactValue}>{`${organization.firstName} ${organization.lastName}`}</Text>
              </View>
            )}
            {organization.email && (
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>Email:</Text>
                <Text style={styles.contactValue}>{organization.email}</Text>
              </View>
            )}
            {organization.phone && (
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>Phone:</Text>
                <Text style={styles.contactValue}>{organization.phone}</Text>
              </View>
            )}
            {organization.website && (
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>Website:</Text>
                <Text style={styles.contactValue}>{organization.website}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 22,
    color: "#15B2BF",
    textAlign: "center",
    flex: 1,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileSection: {
    paddingHorizontal: 20,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  organizationName: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 20,
    marginRight: 8,
  },
  verifiedBadge: {
    backgroundColor: "#15B2BF",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#ddd",
    marginHorizontal: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: "Alata-Regular",
    fontSize: 18,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#333",
  },
  missionContainer: {
    marginBottom: 20,
  },
  missionText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#333",
    fontStyle: "italic",
  },
  divider: {
    height: 8,
    backgroundColor: "#f5f5f5",
    marginVertical: 20,
  },
  causesSection: {
    paddingHorizontal: 20,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 25,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 25,
  },
  activeTab: {
    backgroundColor: "#15B2BF",
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
  causesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  emptyCausesContainer: {
    padding: 30,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  emptyCausesText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  contactSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  contactInfo: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 15,
  },
  contactItem: {
    flexDirection: "row",
    marginBottom: 10,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: "bold",
    width: 70,
  },
  contactValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  bottomSpacing: {
    height: 100,
  },
})

