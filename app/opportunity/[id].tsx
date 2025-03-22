"use client"
import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Linking,
  Platform,
  Dimensions,
} from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { ArrowLeft, Calendar, MapPin, Heart, Share2, Mail, Info } from "lucide-react-native"
import MapView, { Marker } from "react-native-maps"
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  type Timestamp,
} from "firebase/firestore"
import { auth, db } from "../firebase/config"
import { useFonts } from "expo-font"

// Define the participant type
interface Participant {
  id: string
  name: string
  avatar?: string
  joinedAt: Timestamp | Date
}

// Define the contact person type
interface ContactPerson {
  id: string
  firstName: string
  lastName: string
  email: string
  avatar?: string
  organizationName: string
}

// Define the schedule item type
interface ScheduleItem {
  time: string
  activity: string
}

// Define the location type
interface Location {
  address: string
  coordinates: {
    lat: number
    lng: number
  }
}

// Define the opportunity type with expanded fields
interface Opportunity {
  id: string
  name: string
  imageUrl?: string
  date: string
  time: string
  location?: Location
  city?: string
  description?: string
  disclaimer?: string
  volunteers?: string
  maxParticipants?: number
  registeredCount?: number
  organizationName?: string
  organizationLogo?: string
  participants?: Participant[]
  contactPerson?: ContactPerson
  schedule?: string
  causeTypes?: string[]
  isFull?: boolean
  createdAt?: Timestamp | Date
  registered_users?: string[]
}

export default function OpportunityDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRegistered, setIsRegistered] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [similarOpportunities, setSimilarOpportunities] = useState<Opportunity[]>([])
  const [showAllParticipants, setShowAllParticipants] = useState(false)
  const [contactPerson, setContactPerson] = useState<ContactPerson | null>(null)

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../../assets/fonts/AbhayaLibre-Regular.ttf"),
    "AbhayaLibre-ExtraBold": require("../../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
  })

  // Fetch opportunity details
  const fetchOpportunityDetails = useCallback(async () => {
    try {
      if (!id) return

      // Fetch opportunity details
      const opportunityDoc = await getDoc(doc(db, "causes", id as string))
      if (opportunityDoc.exists()) {
        const data = opportunityDoc.data()

        // Get participants with their details
        let participants: Participant[] = []
        if (data.registered_users && Array.isArray(data.registered_users)) {
          // Fetch user details for each registered user
          const userPromises = data.registered_users.map(async (userId: string) => {
            try {
              const userDoc = await getDoc(doc(db, "users", userId))
              if (userDoc.exists()) {
                const userData = userDoc.data()
                return {
                  id: userId,
                  name: `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
                  avatar: userData.avatar || null,
                  joinedAt: userData.joinedAt || new Date(),
                }
              }
              return null
            } catch (e) {
              console.error("Error fetching user data:", e)
              return null
            }
          })

          const userResults = await Promise.all(userPromises)
          participants = userResults.filter(Boolean) as Participant[]
        }

        // Get contact person details (creator of the cause)
        if (data.createdBy) {
          try {
            // Now that we've updated the security rules, we can fetch the admin document
            const contactDoc = await getDoc(doc(db, "admins", data.createdBy))
            if (contactDoc.exists()) {
              const contactData = contactDoc.data()
              setContactPerson({
                id: data.createdBy,
                firstName: contactData.firstName || "",
                lastName: contactData.lastName || "",
                email: contactData.workEmail || contactData.email || "",
                avatar: contactData.photoURL || null,
                organizationName: contactData.organizationName || "",
              })
            } else {
              // Fallback to basic info if admin document doesn't exist
              setContactPerson({
                id: data.createdBy,
                firstName: data.contactFirstName || "Contact",
                lastName: data.contactLastName || "Person",
                email: data.contactEmail || "contact@organization.com",
                avatar: data.contactPhotoURL || null,
                organizationName: data.organizationName || "",
              })
            }
          } catch (e) {
            console.error("Error fetching contact person:", e)
            // Fallback to basic info if there's an error
            setContactPerson({
              id: data.createdBy,
              firstName: data.contactFirstName || "Contact",
              lastName: data.contactLastName || "Person",
              email: data.contactEmail || "contact@organization.com",
              avatar: data.contactPhotoURL || null,
              organizationName: data.organizationName || "",
            })
          }
        } else {
          // Set default contact info if not available
          setContactPerson({
            id: "default",
            firstName: "Contact",
            lastName: "Person",
            email: "contact@organization.com",
            avatar: undefined,
            organizationName: data.organizationName || "",
          })
        }

        // Calculate if the opportunity is full
        const maxParticipants = Number.parseInt(data.volunteers || "0")
        const registeredCount = data.registered_users?.length || 0
        const isFull = registeredCount >= maxParticipants

        // Parse location data
        const location = {
          address: data.location?.address || "",
          coordinates: {
            lat: data.location?.coordinates?.lat || 0,
            lng: data.location?.coordinates?.lng || 0,
          },
        }

        setOpportunity({
          id: opportunityDoc.id,
          name: data.name || "",
          imageUrl: data.imageUrl || "",
          date: data.date || "",
          time: data.time || "",
          description: data.description || "",
          disclaimer: data.disclaimer || "",
          location: location,
          city: data.city || "",
          maxParticipants: maxParticipants,
          registeredCount: registeredCount,
          organizationName: data.organizationName || "",
          organizationLogo: data.organizationLogo || "",
          participants: participants,
          schedule: data.schedule || "",
          causeTypes: data.causeTypes || [],
          isFull: isFull,
          createdAt: data.createdAt || new Date(),
          registered_users: data.registered_users || [],
        })

        // If the opportunity is full, fetch similar opportunities
        if (isFull) {
          fetchSimilarOpportunities(data.city, data.causeTypes)
        }
      } else {
        Alert.alert("Error", "Opportunity not found")
        router.back()
      }

      // Check if user is registered
      const userId = auth.currentUser?.uid
      if (userId) {
        const userDoc = await getDoc(doc(db, "users", userId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setIsRegistered(userData.registered_opportunities?.includes(id) || false)
          setIsSaved(userData.saved_opportunities?.includes(id) || false)
        }
      }
    } catch (error) {
      console.error("Error fetching opportunity details:", error)
      Alert.alert("Error", "Failed to load opportunity details")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  // Fetch similar opportunities
  const fetchSimilarOpportunities = async (city?: string, causeTypes?: string[]) => {
    try {
      // Build query based on available filters
      let opportunitiesQuery = query(collection(db, "causes"))

      if (city) {
        opportunitiesQuery = query(opportunitiesQuery, where("city", "==", city))
      }

      if (causeTypes && causeTypes.length > 0) {
        // Try to find opportunities with at least one matching cause type
        opportunitiesQuery = query(opportunitiesQuery, where("causeTypes", "array-contains-any", causeTypes))
      }

      const snapshot = await getDocs(opportunitiesQuery)

      // Get current date to filter only future opportunities
      const now = new Date()

      // Filter and map the results
      const opportunities = snapshot.docs
        .filter((doc) => doc.id !== id) // Exclude current opportunity
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
            return null
          }

          // Check if opportunity is full
          const maxParticipants = Number.parseInt(data.volunteers || "0")
          const registeredCount = data.registered_users?.length || 0
          const isFull = registeredCount >= maxParticipants

          // Only include opportunities that aren't full
          if (isFull) {
            return null
          }

          return {
            id: doc.id,
            name: data.name || "",
            imageUrl: data.imageUrl || "",
            date: data.date || "",
            time: data.time || "",
            city: data.city || "",
            maxParticipants: maxParticipants,
            registeredCount: registeredCount,
            organizationName: data.organizationName || "",
          }
        })
        .filter(Boolean) // Remove null entries

      // Limit to 3 similar opportunities
      setSimilarOpportunities(opportunities.slice(0, 3) as Opportunity[])
    } catch (error) {
      console.error("Error fetching similar opportunities:", error)
    }
  }

  useEffect(() => {
    fetchOpportunityDetails()
  }, [fetchOpportunityDetails])

  // Add this useEffect after your existing useEffects
  useEffect(() => {
    // This helps with map rendering issues in Android emulators
    if (Platform.OS === "android") {
      const timeout = setTimeout(() => {
        if (opportunity?.location?.coordinates) {
          // Force a re-render of the map by creating a new reference
          // Use type assertion to ensure TypeScript knows this is an Opportunity
          setOpportunity((prev) => {
            if (!prev) return null
            return { ...prev } as Opportunity
          })
        }
      }, 500)

      return () => clearTimeout(timeout)
    }
  }, [opportunity?.location])

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#15B2BF" />
      </View>
    )
  }

  const handleRegister = async () => {
    try {
      setRegistering(true)
      const userId = auth.currentUser?.uid
      if (!userId) {
        Alert.alert("Error", "You must be logged in to register")
        return
      }

      if (!opportunity) {
        Alert.alert("Error", "Opportunity details not available")
        return
      }

      // Check if spots are available
      const maxParticipants = opportunity.maxParticipants || 0
      const registeredCount = opportunity.registeredCount || 0
      const spotsLeft = maxParticipants - registeredCount

      if (spotsLeft <= 0 && !isRegistered) {
        Alert.alert("Sorry, this opportunity is full", "Would you like to see similar opportunities?", [
          { text: "No, thanks", style: "cancel" },
          {
            text: "Yes, please",
            onPress: () => {
              // Fetch similar opportunities if not already loaded
              if (similarOpportunities.length === 0) {
                fetchSimilarOpportunities(opportunity.city, opportunity.causeTypes)
              }
              // Show similar opportunities
              setShowAllParticipants(true)
            },
          },
        ])
        return
      }

      if (isRegistered) {
        // Unregister
        await updateDoc(doc(db, "users", userId), {
          registered_opportunities: arrayRemove(id),
        })

        // Update opportunity registered users list
        await updateDoc(doc(db, "causes", id as string), {
          registered_users: arrayRemove(userId),
        })

        setIsRegistered(false)

        // Update local state
        setOpportunity((prev) => {
          if (!prev) return null

          const updatedRegisteredUsers = prev.registered_users?.filter((uid) => uid !== userId) || []

          return {
            ...prev,
            registeredCount: updatedRegisteredUsers.length,
            isFull: false,
            registered_users: updatedRegisteredUsers,
            participants: prev.participants?.filter((p) => p.id !== userId),
          }
        })

        Alert.alert("Success", "You have unregistered from this opportunity")
      } else {
        // Get user data for participant info
        const userDoc = await getDoc(doc(db, "users", userId))
        let userName = "Volunteer"
        let userAvatar = null

        if (userDoc.exists()) {
          const userData = userDoc.data()
          userName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim()
          userAvatar = userData.avatar
        }

        // Register
        await updateDoc(doc(db, "users", userId), {
          registered_opportunities: arrayUnion(id),
        })

        // Update opportunity registered users list
        await updateDoc(doc(db, "causes", id as string), {
          registered_users: arrayUnion(userId),
        })

        setIsRegistered(true)

        // Update local state
        setOpportunity((prev) => {
          if (!prev) return null

          const updatedRegisteredUsers = [...(prev.registered_users || []), userId]
          const newRegisteredCount = updatedRegisteredUsers.length
          const newIsFull = newRegisteredCount >= (prev.maxParticipants || 0)

          // Create new participant
          const newParticipant: Participant = {
            id: userId,
            name: userName,
            avatar: userAvatar,
            joinedAt: new Date(),
          }

          return {
            ...prev,
            registeredCount: newRegisteredCount,
            isFull: newIsFull,
            registered_users: updatedRegisteredUsers,
            participants: [...(prev.participants || []), newParticipant],
          }
        })

        Alert.alert("Success", "You have registered for this opportunity")
      }
    } catch (error) {
      console.error("Error registering for opportunity:", error)
      Alert.alert("Error", "Failed to register for this opportunity")
    } finally {
      setRegistering(false)
    }
  }

  const handleSave = async () => {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) {
        Alert.alert("Error", "You must be logged in to save opportunities")
        return
      }

      if (isSaved) {
        // Unsave
        await updateDoc(doc(db, "users", userId), {
          saved_opportunities: arrayRemove(id),
        })
        setIsSaved(false)
      } else {
        // Save
        await updateDoc(doc(db, "users", userId), {
          saved_opportunities: arrayUnion(id),
        })
        setIsSaved(true)
      }
    } catch (error) {
      console.error("Error saving opportunity:", error)
      Alert.alert("Error", "Failed to save this opportunity")
    }
  }

  const handleShare = () => {
    // Implement share functionality
    Alert.alert("Share", "Sharing functionality will be implemented here")
  }

  const handleContactEmail = () => {
    if (!contactPerson?.email) {
      Alert.alert("Error", "Contact email not available")
      return
    }

    Linking.openURL(`mailto:${contactPerson.email}?subject=Question about ${opportunity?.name}`)
  }

  const handleOpenMap = () => {
    if (!opportunity?.location?.coordinates) {
      Alert.alert("Error", "Location coordinates not available")
      return
    }

    const { lat, lng } = opportunity.location.coordinates
    const label = encodeURIComponent(opportunity.location.address || opportunity.name || "Event Location")

    let url
    if (Platform.OS === "ios") {
      url = `maps:0,0?q=${label}@${lat},${lng}`
    } else {
      url = `geo:0,0?q=${lat},${lng}(${label})`
    }

    Linking.openURL(url)
  }

  const handleAddToCalendar = () => {
    Alert.alert("Calendar", "Calendar integration will be implemented here")
  }

  // Format the date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long" as const,
        year: "numeric" as const,
        month: "long" as const,
        day: "numeric" as const,
      }
      return date.toLocaleDateString("en-US", options)
    } catch (error) {
      return dateString
    }
  }

  // Parse schedule string into items
  const parseSchedule = (scheduleString: string) => {
    if (!scheduleString) return []

    // Split by line breaks or semicolons
    const items = scheduleString.split(/[\n;]/).filter((item) => item.trim().length > 0)

    return items.map((item) => {
      // Try to match the format "HH:MM AM - HH:MM AM: Activity"
      const timeRangeMatch = item.match(/^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M):\s*(.+)$/i)
      if (timeRangeMatch) {
        return {
          time: `${timeRangeMatch[1]} - ${timeRangeMatch[2]}`,
          activity: timeRangeMatch[3].trim(),
        }
      }

      // Try to match the format shown in the first image: "06:30 AM - 07:00 AM: Registration & Warm-up"
      const dashMatch = item.match(/^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M):\s*(.+)$/i)
      if (dashMatch) {
        return {
          time: `${dashMatch[1]} - ${dashMatch[2]}`,
          activity: dashMatch[3].trim(),
        }
      }

      // Fallback for any other format
      const parts = item.split(":")
      if (parts.length >= 2) {
        return {
          time: parts[0].trim(),
          activity: parts.slice(1).join(":").trim(),
        }
      }

      return { time: "", activity: item.trim() }
    })
  }

  if (!opportunity) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Opportunity not found</Text>
      </View>
    )
  }

  // Use default values for potentially undefined properties
  const maxParticipants = opportunity.maxParticipants || 0
  const registeredCount = opportunity.registeredCount || 0
  const spotsLeft = maxParticipants - registeredCount
  const isFull = spotsLeft <= 0
  const scheduleItems = parseSchedule(opportunity.schedule || "")

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Add a spacer view at the top */}
      <View style={styles.statusBarSpacer} />

      {/* Header with title */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{opportunity.name}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Organization Info */}
        <View style={styles.organizationSection}>
          <View style={styles.organizationContainer}>
            <Image
              source={
                contactPerson?.avatar ? { uri: contactPerson.avatar } : require("../../assets/images/placeholder.png")
              }
              style={styles.organizationLogo}
            />
            <View style={styles.organizationInfo}>
              <Text style={styles.organizationName}>
                {contactPerson?.organizationName || opportunity.organizationName}
              </Text>
              <Text style={styles.organizationType}>Nonprofit Organization</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.actionIconButton} onPress={handleSave}>
              <Heart size={20} color={isSaved ? "#FF4757" : "#000"} fill={isSaved ? "#FF4757" : "none"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconButton} onPress={handleShare}>
              <Share2 size={20} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Join Button */}
        <TouchableOpacity
          style={[
            styles.joinButton,
            isRegistered ? styles.cancelButton : isFull && !isRegistered ? styles.disabledButton : {},
          ]}
          onPress={handleRegister}
          disabled={registering || (isFull && !isRegistered)}
        >
          {registering ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.joinButtonText}>
              {isRegistered ? "Cancel Registration" : isFull && !isRegistered ? "Event Full" : "Join & Sign Up"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Date and Time */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Date and Time</Text>
          <View style={styles.dateTimeContainer}>
            <Calendar size={20} color="#000" style={styles.sectionIcon} />
            <View style={styles.dateTimeContent}>
              <Text style={styles.dateText}>{formatDate(opportunity.date)}</Text>
              <Text style={styles.timeText}>{opportunity.time}</Text>
            </View>
            <TouchableOpacity style={styles.calendarButton} onPress={handleAddToCalendar}>
              <Text style={styles.calendarButtonText}>Add to Calendar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* What you'll be doing */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>What you'll be doing</Text>
          <Text style={styles.descriptionText}>{opportunity.description}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Location */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationContainer}>
            <MapPin size={20} color="#000" style={styles.sectionIcon} />
            <View style={styles.locationContent}>
              <Text style={styles.locationName}>{opportunity.city}</Text>
              <Text style={styles.locationAddress}>{opportunity.location?.address}</Text>
              <Text style={styles.parkingText}>Street Car Parking Available</Text>
            </View>
          </View>

          {/* Map View - Adjust size in styles.mapContainer */}
          {opportunity.location?.coordinates && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: opportunity.location.coordinates.lat,
                  longitude: opportunity.location.coordinates.lng,
                  latitudeDelta: 0.01, // Adjust this value to control zoom level
                  longitudeDelta: 0.01, // Adjust this value to control zoom level
                }}
                provider="google"
                zoomEnabled={true}
                zoomControlEnabled={true}
                minZoomLevel={10} // Minimum zoom level
                maxZoomLevel={20} // Maximum zoom level
                rotateEnabled={false}
                scrollEnabled={true} // Enable scrolling/panning
                pitchEnabled={true} // Enable tilting
                loadingEnabled={true}
                loadingIndicatorColor="#15B2BF"
                loadingBackgroundColor="#f9f9f9"
              >
                <Marker
                  coordinate={{
                    latitude: opportunity.location.coordinates.lat,
                    longitude: opportunity.location.coordinates.lng,
                  }}
                  title={opportunity.name}
                  description={opportunity.location.address}
                />
              </MapView>
              <TouchableOpacity style={styles.mapOverlay} onPress={handleOpenMap}>
                <Text style={styles.viewMapText}>View Map</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Attendees */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Attendees</Text>
            {opportunity.participants && opportunity.participants.length > 0 && (
              <TouchableOpacity onPress={() => setShowAllParticipants(!showAllParticipants)}>
                <Text style={styles.seeAllText}>
                  {showAllParticipants ? "Hide" : `See all ${opportunity.participants.length}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {opportunity.participants && opportunity.participants.length > 0 ? (
            <View style={styles.attendeesContainer}>
              <View style={styles.avatarsRow}>
                {opportunity.participants
                  .slice(0, showAllParticipants ? opportunity.participants.length : 3)
                  .map((participant, index) => (
                    <View key={participant.id || index} style={styles.avatarContainer}>
                      <Image
                        source={
                          participant.avatar
                            ? { uri: participant.avatar }
                            : require("../../assets/images/placeholder.png")
                        }
                        style={styles.avatar}
                      />
                      <Text style={styles.participantName} numberOfLines={1}>
                        {participant.name}
                      </Text>
                    </View>
                  ))}

                {!showAllParticipants && opportunity.participants.length > 3 && (
                  <TouchableOpacity style={styles.moreAvatarsButton} onPress={() => setShowAllParticipants(true)}>
                    <Text style={styles.moreAvatarsText}>+{opportunity.participants.length - 3}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.spotsLeftText}>{isFull ? "This event is full" : `${spotsLeft} spots left`}</Text>
            </View>
          ) : (
            <View style={styles.noAttendeesContainer}>
              <Text style={styles.noAttendeesText}>Be the first to join this opportunity!</Text>
              <Text style={styles.spotsLeftText}>{`${maxParticipants} spots available`}</Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Schedule */}
        {scheduleItems.length > 0 && (
          <>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Schedule</Text>
              <View style={styles.scheduleContainer}>
                {scheduleItems.map((item, index) => (
                  <View key={index} style={styles.scheduleItem}>
                    <View style={styles.bulletPoint} />
                    <Text style={styles.scheduleText}>
                      {item.time}: {item.activity}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />
          </>
        )}

        {/* Contact */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.contactSubtitle}>Reach out to our event coordinator for additional questions.</Text>

          <View style={styles.contactPersonContainer}>
            <Image
              source={
                contactPerson?.avatar ? { uri: contactPerson.avatar } : require("../../assets/images/placeholder.png")
              }
              style={styles.contactAvatar}
            />
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>
                {contactPerson ? `${contactPerson.firstName} ${contactPerson.lastName}` : "Event Coordinator"}
              </Text>
              <Text style={styles.contactRole}>{contactPerson?.organizationName || opportunity.organizationName}</Text>
            </View>
            <View style={styles.contactActions}>
              <TouchableOpacity style={styles.contactButton} onPress={handleContactEmail}>
                <Mail size={24} color="#15B2BF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Things to know */}
        {opportunity.disclaimer && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Things to know</Text>
            <View style={styles.requirementsContainer}>
              <View style={styles.requirementItem}>
                <Info size={16} color="#666" style={styles.requirementIcon} />
                <Text style={styles.requirementText}>{opportunity.disclaimer}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Bottom Join Button (for easy access after scrolling) */}
        <TouchableOpacity
          style={[
            styles.joinButton,
            styles.bottomJoinButton,
            isRegistered ? styles.cancelButton : isFull && !isRegistered ? styles.disabledButton : {},
          ]}
          onPress={handleRegister}
          disabled={registering || (isFull && !isRegistered)}
        >
          {registering ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.joinButtonText}>
              {isRegistered ? "Cancel Registration" : isFull && !isRegistered ? "Event Full" : "Join & Sign Up"}
            </Text>
          )}
        </TouchableOpacity>
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
  organizationSection: {
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  organizationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  organizationLogo: {
    width: 51, // Changed from 40 to 51
    height: 51, // Changed from 40 to 51
    borderRadius: 25.5, // Adjusted to half of width/height
    marginRight: 10,
  },
  organizationInfo: {
    flex: 1,
  },
  organizationName: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 16, // Increased from 16
    marginBottom: 2,
    fontWeight: "bold", // Added to make it more prominent
  },
  organizationType: {
    fontSize: 12,
    color: "#666",
  },
  actionButtonsContainer: {
    flexDirection: "row",
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  joinButton: {
    backgroundColor: "#15B2BF",
    borderRadius: 30,
    height: 37, // Changed from 50 to 37
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 20,
    width: 142, // Added width specification
    alignSelf: "center", // Center the button
    // Add shadow properties
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // For Android shadow
  },
  cancelButton: {
    backgroundColor: "#FF4757",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  bottomJoinButton: {
    marginTop: 20,
    marginBottom: 40,
    height: 37, // Ensure this matches the joinButton height
    // Add shadow properties
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // For Android shadow
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 15,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontFamily: "Alata-Regular",
    fontSize: 18,
    marginBottom: 15,
  },
  sectionIcon: {
    marginRight: 10,
  },
  dateTimeContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dateTimeContent: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: "#666",
  },
  calendarButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  calendarButtonText: {
    color: "#15B2BF",
    fontSize: 14,
    fontWeight: "500",
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  locationContent: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  parkingText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  mapContainer: {
    height: Dimensions.get("window").height * 0.3, // 30% of screen height
    width: "100%",
    maxWidth: 400, // Maximum width as requested
    alignSelf: "center", // Center the map if it's smaller than the screen
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    marginBottom: 15,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  mapImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  mapOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewMapText: {
    color: "#15B2BF",
    fontSize: 14,
    fontWeight: "500",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  seeAllText: {
    color: "#15B2BF",
    fontSize: 14,
    fontWeight: "500",
  },
  attendeesContainer: {
    marginBottom: 10,
  },
  avatarsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  avatarContainer: {
    alignItems: "center",
    marginRight: 15,
    marginBottom: 10,
    width: 60,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 5,
  },
  participantName: {
    fontSize: 12,
    textAlign: "center",
    width: "100%",
  },
  moreAvatarsButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  moreAvatarsText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
  },
  spotsLeftText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  noAttendeesContainer: {
    alignItems: "center",
    padding: 20,
  },
  noAttendeesText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
  },
  scheduleContainer: {
    marginBottom: 10,
    paddingLeft: 10,
  },
  scheduleItem: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "flex-start",
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#000",
    marginRight: 10,
    marginTop: 6,
  },
  scheduleText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#333",
  },
  contactSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  contactPersonContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 15,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  contactRole: {
    fontSize: 14,
    color: "#666",
  },
  contactActions: {
    flexDirection: "row",
  },
  contactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  requirementsContainer: {
    marginBottom: 10,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  requirementIcon: {
    marginRight: 10,
  },
  requirementText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
})

