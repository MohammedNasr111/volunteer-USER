"use client"
import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  TextInput,
  Modal,
  ScrollView,
  Alert,
} from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } from "firebase/firestore"
import { ref, onValue } from "firebase/database"
import { auth, db, realtimeDb } from "./firebase/config"
import { useFonts } from "expo-font"
import BottomNavigation from "../components/bottom-navigation"
import { ArrowLeft, Star, Clock, Share2, Bookmark, X } from "lucide-react-native"

// Tab options
type TabType = "upcoming" | "past" | "saved"
type FilterType = "cause" | "organization"

export default function HistoryScreen() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>("past")
  const [pastOpportunities, setPastOpportunities] = useState<any[]>([])
  const [upcomingOpportunities, setUpcomingOpportunities] = useState<any[]>([])
  const [savedOpportunities, setSavedOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [totalHours, setTotalHours] = useState(0)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null)
  const [feedbackText, setFeedbackText] = useState("")
  const [userRating, setUserRating] = useState(0)
  const [userProfile, setUserProfile] = useState<any>(null)
  const feedbackInputRef = useRef<TextInput>(null)
  const [participantsMap, setParticipantsMap] = useState<{ [key: string]: any[] }>({})
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false)
  const [selectedOpportunityParticipants, setSelectedOpportunityParticipants] = useState<any[]>([])
  // Add state for participants modal
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)
  const [selectedParticipants, setSelectedParticipants] = useState<any[]>([])
  const [selectedOpportunityName, setSelectedOpportunityName] = useState("")

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
    "AbhayaLibre-ExtraBold": require("../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
    "Lato-Bold": require("../assets/fonts/Lato-Bold.ttf"),
  })

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userId = auth.currentUser?.uid
        if (!userId) return

        const userDoc = await getDoc(doc(db, "users", userId))
        if (userDoc.exists()) {
          setUserProfile(userDoc.data())
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
      }
    }

    fetchUserProfile()
  }, [])

  // Calculate total volunteer hours
  const calculateTotalHours = (opportunities: any[]) => {
    let totalMinutes = 0

    opportunities.forEach((opp) => {
      if (opp.time) {
        const duration = calculateDurationInMinutes(opp.time)
        totalMinutes += duration
      }
    })

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    setTotalHours(hours)
    setTotalMinutes(minutes)
  }

  const calculateDurationInMinutes = (timeString?: string) => {
    if (!timeString || !timeString.includes("-")) return 240 // Default 4 hours (240 minutes)

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

      // Calculate duration in minutes
      const startMinutes = startHour * 60 + startMinute
      const endMinutes = endHour * 60 + endMinute

      // Handle case where end time is on the next day
      const durationMinutes =
        endMinutes >= startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes

      return durationMinutes
    } catch (error) {
      console.error("Error calculating duration:", error)
      return 240 // Default 4 hours (240 minutes)
    }
  }

  // Format duration for display
  const formatDuration = (timeString?: string) => {
    if (!timeString || !timeString.includes("-")) return "4 hrs"

    const durationMinutes = calculateDurationInMinutes(timeString)
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60

    if (minutes === 0) {
      return `${hours} hrs`
    } else {
      return `${hours}.${Math.floor(minutes / 6)} hrs` // Convert minutes to decimal (e.g., 30min = 0.5)
    }
  }

  // Format date for display
  const formatDate = (dateString?: string, timeString?: string) => {
    if (!dateString) return ""

    try {
      const date = new Date(dateString)

      // Format day of week
      const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "short" })

      // Format day and month
      const day = date.getDate()
      const month = date.toLocaleDateString("en-US", { month: "short" })

      // Extract start time if available
      let startTime = ""
      if (timeString) {
        const timeParts = timeString.split(" - ")
        if (timeParts.length > 0) {
          startTime = timeParts[0].trim()
        }
      }

      if (startTime) {
        return `${dayOfWeek}, ${day} ${month} • ${startTime}`
      } else {
        return `${dayOfWeek}, ${day} ${month}`
      }
    } catch (e) {
      console.error("Error formatting date:", e)
      return dateString
    }
  }

  // Format full date for display
  const formatFullDate = (dateString?: string, timeString?: string) => {
    if (!dateString) return ""

    try {
      const date = new Date(dateString)

      // Format day of week
      const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" })

      // Format day with ordinal suffix
      const day = date.getDate()
      const ordinalSuffix = getOrdinalSuffix(day)

      // Format month
      const month = date.toLocaleDateString("en-US", { month: "long" })

      // Extract time range if available
      let timeRange = ""
      if (timeString) {
        timeRange = timeString
      }

      if (timeRange) {
        return `${dayOfWeek}, ${month} ${day}${ordinalSuffix}, ${timeRange} PT`
      } else {
        return `${dayOfWeek}, ${month} ${day}${ordinalSuffix}`
      }
    } catch (e) {
      console.error("Error formatting full date:", e)
      return dateString
    }
  }

  // Get ordinal suffix for day (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return "th"
    switch (day % 10) {
      case 1:
        return "st"
      case 2:
        return "nd"
      case 3:
        return "rd"
      default:
        return "th"
    }
  }

  // Fetch opportunities
  useEffect(() => {
    const fetchOpportunities = async () => {
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
          const savedOpportunityIds = userData.saved_opportunities || []
          const now = new Date()

          // Fetch registered opportunities
          if (registeredOpportunityIds.length > 0) {
            const pastOppsList: any[] = []
            const upcomingOppsList: any[] = []

            // Fetch each opportunity
            const opportunitiesPromises = registeredOpportunityIds.map(async (oppId: string) => {
              const oppDoc = await getDoc(doc(db, "causes", oppId))
              if (oppDoc.exists()) {
                const oppData = oppDoc.data()
                const oppDate = new Date(oppData.date)

                // Get organization data
                let organizationName = oppData.organizationName || ""
                let organizationLogo = oppData.organizationLogo || ""

                if (oppData.createdBy) {
                  try {
                    const orgDoc = await getDoc(doc(db, "admins", oppData.createdBy))
                    if (orgDoc.exists()) {
                      const orgData = orgDoc.data()
                      organizationName = orgData.organizationName || organizationName
                      organizationLogo = orgData.photoURL || organizationLogo
                    }
                  } catch (error) {
                    console.error("Error fetching organization data:", error)
                  }
                }

                // Get ratings and feedback
                const ratingsRef = collection(db, "ratings")
                const q = query(ratingsRef, where("causeId", "==", oppId))
                const ratingsSnapshot = await getDocs(q)

                let totalRating = 0
                let ratingCount = 0
                let userHasRated = false
                let userRating = 0
                const raters: any[] = []

                ratingsSnapshot.forEach((doc) => {
                  const ratingData = doc.data()
                  totalRating += ratingData.rating
                  ratingCount++

                  if (ratingData.userId === userId) {
                    userHasRated = true
                    userRating = ratingData.rating
                  }

                  // Add rater info
                  if (ratingData.userPhotoURL) {
                    raters.push({
                      id: ratingData.userId,
                      photoURL: ratingData.userPhotoURL,
                    })
                  }
                })

                const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : "0.0"

                const opportunity = {
                  id: oppDoc.id,
                  name: oppData.name || "",
                  imageUrl: oppData.imageUrl || "",
                  date: oppData.date || "",
                  time: oppData.time || "",
                  city: oppData.city || "",
                  volunteers: oppData.volunteers || "0",
                  organizationName,
                  organizationLogo,
                  createdBy: oppData.createdBy || "",
                  description: oppData.description || "",
                  registeredCount: oppData.registeredCount || 0,
                  avgRating,
                  ratingCount,
                  userHasRated,
                  userRating,
                  raters: raters.slice(0, 5), // Limit to 5 raters
                }

                // Sort into past or upcoming
                if (oppDate < now) {
                  pastOppsList.push(opportunity)
                } else {
                  upcomingOppsList.push(opportunity)
                }

                return opportunity
              }
              return null
            })

            await Promise.all(opportunitiesPromises)

            // Sort by date (most recent first for past, soonest first for upcoming)
            pastOppsList.sort((a, b) => {
              if (!a.date) return 1
              if (!b.date) return -1
              return new Date(b.date).getTime() - new Date(a.date).getTime()
            })

            upcomingOppsList.sort((a, b) => {
              if (!a.date) return 1
              if (!b.date) return -1
              return new Date(a.date).getTime() - new Date(b.date).getTime()
            })

            setPastOpportunities(pastOppsList)
            setUpcomingOpportunities(upcomingOppsList)

            // Calculate total hours from past opportunities
            calculateTotalHours(pastOppsList)
          }

          // Fetch saved opportunities
          if (savedOpportunityIds.length > 0) {
            const savedOppsList: any[] = []

            const savedOpportunitiesPromises = savedOpportunityIds.map(async (oppId: string) => {
              const oppDoc = await getDoc(doc(db, "causes", oppId))
              if (oppDoc.exists()) {
                const oppData = oppDoc.data()

                // Get organization data
                let organizationName = oppData.organizationName || ""
                let organizationLogo = oppData.organizationLogo || ""

                if (oppData.createdBy) {
                  try {
                    const orgDoc = await getDoc(doc(db, "admins", oppData.createdBy))
                    if (orgDoc.exists()) {
                      const orgData = orgDoc.data()
                      organizationName = orgData.organizationName || organizationName
                      organizationLogo = orgData.photoURL || organizationLogo
                    }
                  } catch (error) {
                    console.error("Error fetching organization data:", error)
                  }
                }

                const opportunity = {
                  id: oppDoc.id,
                  name: oppData.name || "",
                  imageUrl: oppData.imageUrl || "",
                  date: oppData.date || "",
                  time: oppData.time || "",
                  city: oppData.city || "",
                  volunteers: oppData.volunteers || "0",
                  organizationName,
                  organizationLogo,
                  createdBy: oppData.createdBy || "",
                  description: oppData.description || "",
                  registeredCount: oppData.registeredCount || 0,
                }

                savedOppsList.push(opportunity)
                return opportunity
              }
              return null
            })

            await Promise.all(savedOpportunitiesPromises)

            // Sort by date (soonest first)
            savedOppsList.sort((a, b) => {
              if (!a.date) return 1
              if (!b.date) return -1
              return new Date(a.date).getTime() - new Date(b.date).getTime()
            })

            setSavedOpportunities(savedOppsList)
          }
        }
      } catch (error) {
        console.error("Error fetching opportunities:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchOpportunities()
  }, [router])

  // Handle opportunity press
  const handleOpportunityPress = (opportunityId: string) => {
    router.push(`/opportunity/${opportunityId}` as any)
  }

  // Handle find more causes
  const handleFindMoreCauses = () => {
    router.push("/home" as any)
  }

  // Handle provide feedback
  const handleProvideFeedback = (opportunity: any) => {
    setSelectedOpportunity(opportunity)
    setUserRating(opportunity.userRating || 0)
    setFeedbackText("")
    setFeedbackModalVisible(true)

    // Focus the input after a short delay to ensure the modal is visible
    setTimeout(() => {
      if (feedbackInputRef.current) {
        feedbackInputRef.current.focus()
      }
    }, 300)
  }

  // Submit feedback
  const submitFeedback = async () => {
    if (!selectedOpportunity || !auth.currentUser) return

    try {
      // Add or update rating
      const ratingsRef = collection(db, "ratings")
      const q = query(
        ratingsRef,
        where("causeId", "==", selectedOpportunity.id),
        where("userId", "==", auth.currentUser.uid),
      )

      const querySnapshot = await getDocs(q)
      let ratingDocId = ""

      if (querySnapshot.empty) {
        // Create new rating
        const newRatingRef = await addDoc(collection(db, "ratings"), {
          causeId: selectedOpportunity.id,
          userId: auth.currentUser.uid,
          userName: userProfile?.name || auth.currentUser.displayName || "Anonymous",
          userPhotoURL: userProfile?.photoURL || auth.currentUser.photoURL,
          rating: userRating,
          feedback: feedbackText,
          createdAt: serverTimestamp(),
        })
        ratingDocId = newRatingRef.id
      } else {
        // Update existing rating
        const ratingDoc = querySnapshot.docs[0]
        ratingDocId = ratingDoc.id
        await updateDoc(doc(db, "ratings", ratingDoc.id), {
          rating: userRating,
          feedback: feedbackText,
          updatedAt: serverTimestamp(),
        })
      }

      // Update the opportunity in state
      const updatedPastOpportunities = pastOpportunities.map((opp) => {
        if (opp.id === selectedOpportunity.id) {
          // Calculate new average rating
          const totalRating = Number.parseFloat(opp.avgRating) * opp.ratingCount
          const newRatingCount = opp.userHasRated ? opp.ratingCount : opp.ratingCount + 1
          const newTotalRating = opp.userHasRated ? totalRating - opp.userRating + userRating : totalRating + userRating
          const newAvgRating = (newTotalRating / newRatingCount).toFixed(1)

          // Add the current user to raters if not already there
          const updatedRaters = [...(opp.raters || [])]
          const userAlreadyInRaters = updatedRaters.some((rater) => rater.id === auth.currentUser?.uid)

          if (!userAlreadyInRaters && userProfile?.photoURL && auth.currentUser) {
            updatedRaters.push({
              id: auth.currentUser.uid,
              photoURL: userProfile.photoURL,
            })
          }

          return {
            ...opp,
            avgRating: newAvgRating,
            ratingCount: newRatingCount,
            userHasRated: true,
            userRating,
            raters: updatedRaters,
          }
        }
        return opp
      })

      // Update state with the new data
      setPastOpportunities(updatedPastOpportunities)

      // Update the selected opportunity to reflect changes immediately
      setSelectedOpportunity({
        ...selectedOpportunity,
        avgRating: updatedPastOpportunities.find((opp) => opp.id === selectedOpportunity.id)?.avgRating,
        ratingCount: updatedPastOpportunities.find((opp) => opp.id === selectedOpportunity.id)?.ratingCount,
        userHasRated: true,
        userRating,
      })

      // Close the modal
      setFeedbackModalVisible(false)

      // Show success message
      Alert.alert("Success", "Your feedback has been submitted successfully")
    } catch (error) {
      console.error("Error submitting feedback:", error)
      Alert.alert("Error", "Failed to submit feedback. Please try again.")
    }
  }

  // Render star rating
  const renderStarRating = (rating: number, size = 16, interactive = false) => {
    const stars = []
    const maxRating = 5

    for (let i = 1; i <= maxRating; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => interactive && setUserRating(i)}
          disabled={!interactive}
          style={{ padding: interactive ? 5 : 2 }}
        >
          <Star size={size} color={i <= rating ? "#FFD700" : "#E0E0E0"} fill={i <= rating ? "#FFD700" : "none"} />
        </TouchableOpacity>,
      )
    }

    return <View style={{ flexDirection: "row", alignItems: "center" }}>{stars}</View>
  }

  // Render participant avatars
  const renderParticipants = (participants: any[], maxDisplay = 3) => {
    const displayParticipants = participants.slice(0, maxDisplay)
    const remainingCount = participants.length - maxDisplay

    return (
      <View style={styles.participantsContainer}>
        {displayParticipants.map((participant, index) => (
          <Image
            key={index}
            source={{ uri: participant.photoURL }}
            style={[styles.participantAvatar, { marginLeft: index > 0 ? -10 : 0 }]}
          />
        ))}

        {remainingCount > 0 && (
          <View style={[styles.participantAvatar, styles.remainingCount, { marginLeft: -10 }]}>
            <Text style={styles.remainingCountText}>+{remainingCount}</Text>
          </View>
        )}
      </View>
    )
  }

  // Render past opportunity card
  const renderPastOpportunityCard = (item: any) => {
    // Get participants for this opportunity
    const participants = item.raters || []

    const handleShowAllParticipants = () => {
      // Get all raters from the ratings collection for this opportunity
      const fetchAllRaters = async () => {
        try {
          const ratingsRef = collection(db, "ratings")
          const q = query(ratingsRef, where("causeId", "==", item.id))
          const ratingsSnapshot = await getDocs(q)

          const allRaters = ratingsSnapshot.docs.map((doc) => {
            const data = doc.data()
            return {
              id: data.userId,
              name: data.userName || "Anonymous",
              photoURL: data.userPhotoURL || null,
              rating: data.rating,
            }
          })

          setSelectedParticipants(allRaters)
          setSelectedOpportunityName(item.name)
          setShowParticipantsModal(true)
        } catch (error) {
          console.error("Error fetching all raters:", error)
          // Fallback to showing just the visible participants
          setSelectedParticipants(participants)
          setSelectedOpportunityName(item.name)
          setShowParticipantsModal(true)
        }
      }

      fetchAllRaters()
    }

    return (
      <View style={styles.opportunityCard}>
        <View style={styles.opportunityContent}>
          <View style={styles.opportunityHeader}>
            <Text style={styles.opportunityTitle}>{item.name}</Text>
            <View style={styles.badgeContainer}>
              <View style={[styles.badge, styles.endedBadge]}>
                <Text style={styles.badgeText}>Ended</Text>
              </View>
            </View>
          </View>

          <View style={styles.organizationRow}>
            {item.organizationLogo ? (
              <Image source={{ uri: item.organizationLogo }} style={styles.orgLogo} />
            ) : (
              <View style={styles.orgLogoPlaceholder} />
            )}
            <Text style={styles.organizationName}>{item.organizationName}</Text>
          </View>

          <Text style={styles.dateTime}>{formatFullDate(item.date, item.time)}</Text>

          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>Rated Experience: {item.avgRating}/5.0</Text>
            {renderStarRating(Number.parseFloat(item.avgRating))}
          </View>

          {/* Participants avatars - updated to match the upcoming section */}
          {participants.length > 0 && (
            <View style={styles.participantsRow}>
              {participants.slice(0, 5).map((participant: { photoURL?: string | null }, index: number) => (
                <Image
                  key={index}
                  source={
                    participant.photoURL ? { uri: participant.photoURL } : require("../assets/images/placeholder.png")
                  }
                  style={[styles.participantAvatar, { marginLeft: index > 0 ? -8 : 0 }]}
                />
              ))}
              {participants.length > 5 && (
                <TouchableOpacity style={styles.moreParticipantsButton} onPress={handleShowAllParticipants}>
                  <View style={styles.moreParticipantsDots}>
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.feedbackButton} onPress={() => handleProvideFeedback(item)}>
              <Text style={styles.feedbackButtonText}>Provide Feedback</Text>
            </TouchableOpacity>

            <View style={styles.iconButtons}>
              <TouchableOpacity style={styles.iconButton}>
                <Share2 size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Bookmark size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Image source={{ uri: item.imageUrl || "https://via.placeholder.com/150" }} style={styles.opportunityImage} />
      </View>
    )
  }

  // Render upcoming opportunity card
  const renderUpcomingOpportunityCard = (item: any) => {
    const participants = participantsMap[item.id] || []
    const maxParticipants = Number.parseInt(item.volunteers || "0")
    const participantCount = participants.length

    const handleShowAllParticipants = () => {
      setSelectedParticipants(participants)
      setSelectedOpportunityName(item.name)
      setShowParticipantsModal(true)
    }

    return (
      <View style={styles.opportunityCard}>
        <View style={styles.opportunityContent}>
          <View style={styles.opportunityHeader}>
            <Text style={styles.opportunityTitle}>{item.name}</Text>
            <View style={styles.badgeContainer}>
              <View style={[styles.badge, styles.signedUpBadge]}>
                <Text style={styles.badgeText}>Signed Up</Text>
              </View>
            </View>
          </View>

          <View style={styles.organizationRow}>
            {item.organizationLogo ? (
              <Image source={{ uri: item.organizationLogo }} style={styles.orgLogo} />
            ) : (
              <View style={styles.orgLogoPlaceholder} />
            )}
            <Text style={styles.organizationName}>{item.organizationName}</Text>
          </View>

          <Text style={styles.dateTime}>{formatDate(item.date, item.time)}</Text>

          <View style={styles.upcomingFooter}>
            <View style={styles.durationBadge}>
              <Clock size={12} color="#15B2BF" />
              <Text style={styles.durationText}>{formatDuration(item.time)}</Text>
            </View>

            {/* Participant count */}
            <View style={styles.participantCountContainer}>
              <Text style={styles.participantCountText}>
                {participantCount}/{maxParticipants} joined
              </Text>
            </View>
          </View>

          {/* Participants avatars */}
          {participants.length > 0 && (
            <View style={styles.participantsRow}>
              {participants.slice(0, 5).map((participant, index) => (
                <Image
                  key={index}
                  source={
                    participant.avatar ? { uri: participant.avatar } : require("../assets/images/placeholder.png")
                  }
                  style={[styles.participantAvatar, { marginLeft: index > 0 ? -8 : 0 }]}
                />
              ))}
              {participants.length > 5 && (
                <TouchableOpacity style={styles.moreParticipantsButton} onPress={handleShowAllParticipants}>
                  <View style={styles.moreParticipantsDots}>
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                    <View style={styles.dot} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.cardActions}>
            <View style={styles.iconButtons}>
              <TouchableOpacity style={styles.iconButton}>
                <Share2 size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Bookmark size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Image source={{ uri: item.imageUrl || "https://via.placeholder.com/150" }} style={styles.opportunityImage} />
      </View>
    )
  }

  // Render saved opportunity card
  const renderSavedOpportunityCard = (item: any) => {
    return (
      <View style={styles.opportunityCard}>
        <View style={styles.opportunityContent}>
          <View style={styles.opportunityHeader}>
            <Text style={styles.opportunityTitle}>{item.name}</Text>
          </View>

          <View style={styles.organizationRow}>
            {item.organizationLogo ? (
              <Image source={{ uri: item.organizationLogo }} style={styles.orgLogo} />
            ) : (
              <View style={styles.orgLogoPlaceholder} />
            )}
            <Text style={styles.organizationName}>{item.organizationName}</Text>
          </View>

          <Text style={styles.dateTime}>{formatDate(item.date, item.time)}</Text>

          <View style={styles.upcomingFooter}>
            <View style={styles.durationBadge}>
              <Clock size={12} color="#15B2BF" />
              <Text style={styles.durationText}>{formatDuration(item.time)}</Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.joinButton} onPress={() => handleOpportunityPress(item.id)}>
              <Text style={styles.joinButtonText}>View Details</Text>
            </TouchableOpacity>

            <View style={styles.iconButtons}>
              <TouchableOpacity style={styles.iconButton}>
                <Share2 size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Bookmark size={20} color="#000" fill="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Image source={{ uri: item.imageUrl || "https://via.placeholder.com/150" }} style={styles.opportunityImage} />
      </View>
    )
  }

  useEffect(() => {
    const fetchParticipants = async () => {
      const upcomingOpportunityIds = upcomingOpportunities.map((opp) => opp.id)
      const newParticipantsMap: { [key: string]: any[] } = {}

      for (const opportunityId of upcomingOpportunityIds) {
        const participantsRef = ref(realtimeDb, `causes/${opportunityId}/participants`)
        const snapshot = await new Promise((resolve) => {
          onValue(participantsRef, (snapshot) => {
            resolve(snapshot)
          })
        })

        // Fix the type error by properly typing the snapshot
        const typedSnapshot = snapshot as { val: () => any }
        const data = typedSnapshot.val()
        if (data) {
          const participantsList = Object.entries(data).map(([userId, userData]: [string, any]) => ({
            id: userId,
            ...userData,
          }))
          newParticipantsMap[opportunityId] = participantsList
        } else {
          newParticipantsMap[opportunityId] = []
        }
      }
      setParticipantsMap(newParticipantsMap)
    }

    fetchParticipants()
  }, [upcomingOpportunities])

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header with more spacing */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Volunteer History</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "upcoming" && styles.activeTab]}
          onPress={() => setActiveTab("upcoming")}
        >
          <Text style={[styles.tabText, activeTab === "upcoming" && styles.activeTabText]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "past" && styles.activeTab]}
          onPress={() => setActiveTab("past")}
        >
          <Text style={[styles.tabText, activeTab === "past" && styles.activeTabText]}>Past</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "saved" && styles.activeTab]}
          onPress={() => setActiveTab("saved")}
        >
          <Text style={[styles.tabText, activeTab === "saved" && styles.activeTabText]}>Saved</Text>
        </TouchableOpacity>
      </View>

      {/* Total Hours - Updated with Lato-Bold and red color */}
      <View style={styles.totalHoursContainer}>
        <Text>
          <Text style={styles.totalHoursText}>TOTAL HOUR CONTRIBUTION: </Text>
          <Text style={styles.totalHoursValue}>
            {totalHours}Hrs {totalMinutes}Mins
          </Text>
        </Text>
      </View>

      {/* Opportunities List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15B2BF" />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.opportunitiesList}>
          {activeTab === "past" &&
            (pastOpportunities.length > 0 ? (
              pastOpportunities
                .filter(
                  (opp) =>
                    searchQuery === "" ||
                    opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    opp.organizationName.toLowerCase().includes(searchQuery.toLowerCase()),
                )
                .map((opportunity) => (
                  <View key={opportunity.id} style={styles.opportunityContainer}>
                    {renderPastOpportunityCard(opportunity)}
                  </View>
                ))
            ) : (
              <View style={styles.emptyContainer}>
                <Image source={require("../assets/images/placeholder.png")} style={styles.emptyImage} />
                <Text style={styles.emptyTitle}>No Past Causes</Text>
                <Text style={styles.emptyText}>You haven't participated in any volunteer opportunities yet.</Text>
              </View>
            ))}

          {activeTab === "upcoming" &&
            (upcomingOpportunities.length > 0 ? (
              upcomingOpportunities
                .filter(
                  (opp) =>
                    searchQuery === "" ||
                    opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    opp.organizationName.toLowerCase().includes(searchQuery.toLowerCase()),
                )
                .map((opportunity) => (
                  <View key={opportunity.id} style={styles.opportunityContainer}>
                    {renderUpcomingOpportunityCard(opportunity)}
                  </View>
                ))
            ) : (
              <View style={styles.emptyContainer}>
                <Image source={require("../assets/images/placeholder.png")} style={styles.emptyImage} />
                <Text style={styles.emptyTitle}>No Upcoming Causes</Text>
                <Text style={styles.emptyText}>You haven't signed up for any upcoming volunteer opportunities.</Text>
              </View>
            ))}

          {activeTab === "saved" &&
            (savedOpportunities.length > 0 ? (
              savedOpportunities
                .filter(
                  (opp) =>
                    searchQuery === "" ||
                    opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    opp.organizationName.toLowerCase().includes(searchQuery.toLowerCase()),
                )
                .map((opportunity) => (
                  <View key={opportunity.id} style={styles.opportunityContainer}>
                    {renderSavedOpportunityCard(opportunity)}
                  </View>
                ))
            ) : (
              <View style={styles.emptyContainer}>
                <Image source={require("../assets/images/placeholder.png")} style={styles.emptyImage} />
                <Text style={styles.emptyTitle}>No Saved Causes</Text>
                <Text style={styles.emptyText}>You haven't saved any volunteer opportunities yet.</Text>
              </View>
            ))}

          {/* Find More Causes Button */}
          <TouchableOpacity style={styles.findMoreButton} onPress={handleFindMoreCauses}>
            <Text style={styles.findMoreButtonText}>Find More Causes</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Feedback Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={feedbackModalVisible}
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Provide Feedback</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setFeedbackModalVisible(false)}>
                <X size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.feedbackForm}>
              <View style={styles.userInfoRow}>
                {userProfile?.photoURL ? (
                  <Image source={{ uri: userProfile.photoURL }} style={styles.userAvatar} />
                ) : (
                  <View style={styles.userAvatarPlaceholder} />
                )}
              </View>

              <View style={styles.ratingInputContainer}>
                <Text style={styles.ratingLabel}>Rate your experience:</Text>
                {renderStarRating(userRating, 24, true)}
              </View>

              <View style={styles.feedbackInputContainer}>
                <TextInput
                  ref={feedbackInputRef}
                  style={styles.feedbackInput}
                  placeholder="Write Something from the Event"
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, (!userRating || userRating === 0) && styles.disabledButton]}
                onPress={submitFeedback}
                disabled={!userRating || userRating === 0}
              >
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Participants Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showParticipantsModal}
        onRequestClose={() => setShowParticipantsModal(false)}
      >
        <View style={styles.participantsModalOverlay}>
          <View style={styles.participantsModalContent}>
            {/* Update the modal title to be more specific for past events */}
            <View style={styles.participantsModalHeader}>
              <Text style={styles.participantsModalTitle}>
                {activeTab === "past" ? "Ratings & Feedback" : "Participants"} - {selectedOpportunityName}
              </Text>
              <TouchableOpacity onPress={() => setShowParticipantsModal(false)}>
                <X size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.participantsList}>
              {selectedParticipants.map(
                (
                  participant: {
                    id: string
                    name?: string
                    photoURL?: string | null
                    avatar?: string | null
                    rating?: number
                  },
                  index: number,
                ) => (
                  <View key={index} style={styles.participantItem}>
                    <Image
                      source={
                        participant.photoURL || participant.avatar
                          ? { uri: participant.photoURL || participant.avatar }
                          : require("../assets/images/placeholder.png")
                      }
                      style={styles.participantAvatar}
                    />
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>{participant.name || "Anonymous Volunteer"}</Text>
                      {typeof participant.rating === "number" && (
                        <View style={styles.participantRating}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              color={star <= (participant.rating || 0) ? "#FFD700" : "#E0E0E0"}
                              fill={star <= (participant.rating || 0) ? "#FFD700" : "none"}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                ),
              )}

              {selectedParticipants.length === 0 && (
                <Text style={{ textAlign: "center", marginTop: 20, color: "#666" }}>No participants found</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50, // Increased from 30 to 50 to push header down further
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 20,
    textAlign: "center",
  },
  headerRight: {
    width: 40,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 10, // Added margin top
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#15B2BF",
  },
  tabText: {
    fontFamily: "Alata-Regular",
    fontSize: 14,
    color: "#666",
  },
  activeTabText: {
    color: "#15B2BF",
    fontWeight: "bold",
  },
  totalHoursContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: "center", // Center the text
  },
  totalHoursText: {
    fontFamily: "Lato-Bold",
    fontSize: 14,
    color: "#000", // Changed to black
  },
  totalHoursValue: {
    fontFamily: "Lato-Bold",
    fontSize: 14,
    color: "#FF4757", // Only the value is red
  },
  participantCountContainer: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  participantCountText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  participantsRow: {
    flexDirection: "row",
    marginBottom: 12,
    marginTop: 8,
  },
  participantAvatar: {
    width: 21, // Specified size
    height: 21, // Specified size
    borderRadius: 10.5,
    borderWidth: 1,
    borderColor: "#fff",
  },
  moreParticipants: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
  },
  moreParticipantsText: {
    fontSize: 8,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  opportunitiesList: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Extra space for bottom navigation
  },
  opportunityContainer: {
    marginBottom: 16,
  },
  opportunityCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
  },
  opportunityContent: {
    flex: 1,
    padding: 12,
  },
  opportunityImage: {
    width: 120,
    height: "100%",
    resizeMode: "cover",
  },
  opportunityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  opportunityTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  badgeContainer: {
    flexDirection: "row",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
  },
  endedBadge: {
    backgroundColor: "#E0F7FA",
  },
  signedUpBadge: {
    backgroundColor: "#E0F7FA",
  },
  badgeText: {
    fontSize: 10,
    color: "#15B2BF",
    fontWeight: "bold",
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
  dateTime: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    color: "#666",
    marginRight: 8,
  },
  ratersContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  upcomingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F7FA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationText: {
    fontSize: 10,
    color: "#15B2BF",
    fontWeight: "bold",
    marginLeft: 4,
  },
  participantsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  remainingCount: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  remainingCountText: {
    fontSize: 10,
    color: "#666",
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feedbackButton: {
    backgroundColor: "#15B2BF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  feedbackButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  joinButton: {
    backgroundColor: "#15B2BF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  iconButtons: {
    flexDirection: "row",
  },
  iconButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 20,
    marginTop: 20,
  },
  emptyImage: {
    width: 100,
    height: 100,
    marginBottom: 16,
    opacity: 0.7,
  },
  emptyTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 18,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  findMoreButton: {
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  findMoreButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 18,
    color: "#15B2BF",
  },
  closeButton: {
    padding: 4,
  },
  feedbackForm: {
    alignItems: "center",
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  ratingInputContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  feedbackInputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  feedbackInput: {
    width: "100%",
    height: 100,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#15B2BF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: "center",
    width: "100%",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  participantsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  participantsModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "80%",
    maxHeight: "70%",
    padding: 20,
  },
  participantsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
  },
  participantsModalTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 18,
  },
  participantsList: {
    flex: 1,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  participantName: {
    fontSize: 16,
    fontWeight: "500",
  },
  moreParticipantsButton: {
    width: 21,
    height: 21,
    borderRadius: 10.5,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
  },
  moreParticipantsDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#666",
    marginHorizontal: 1,
  },
  participantInfo: {
    flex: 1,
    marginLeft: 10,
  },
  participantRating: {
    flexDirection: "row",
    marginTop: 4,
  },
})

