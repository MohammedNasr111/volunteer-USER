"use client"
import React, { useState, useEffect, useRef } from "react"
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
  FlatList,
  ViewStyle,
} from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp, arrayUnion, arrayRemove } from "firebase/firestore"
import { ref, onValue } from "firebase/database"
import { auth, db, realtimeDb } from "./firebase/config"
import { useFonts } from "expo-font"
import BottomNavigation from "../components/bottom-navigation"
import { Star, Clock, Share2, Bookmark, X } from "lucide-react-native"

// Tab options
type TabType = "upcoming" | "past" | "saved"
type FilterType = "cause" | "organization"

// Add these interfaces at the top of the file
interface UserData {
  displayName?: string;
  photoURL?: string | null;
  firstName?: string;
  lastName?: string;
}

interface RatingData {
  userId: string;
  rating: number;
  feedback?: string;
  firstName?: string;
  lastName?: string;
  userPhotoURL?: string | null;
  createdAt?: Date;
  updatedAt: Date;
}

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
  const [isEditing, setIsEditing] = useState(false)
  const [ratingSnapshot, setRatingSnapshot] = useState<any>(null)
  const [showFeedbackDetails, setShowFeedbackDetails] = useState(false)
  const [selectedFeedbacks, setSelectedFeedbacks] = useState<any[]>([])

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

  // Add fetchOpportunities function
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

          // Fetch each opportunity with ratings and raters
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

              // Fetch ratings and raters for this opportunity
              const ratingsRef = collection(db, "ratings");
              const ratingsQuery = query(ratingsRef, where("causeId", "==", oppId));
              const ratingsSnapshot = await getDocs(ratingsQuery);
              
              let totalRating = 0;
              let ratingCount = 0;
              let userHasRated = false;
              const raters: any[] = [];

              ratingsSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.rating) {
                  totalRating += data.rating;
                  ratingCount++;
                  raters.push({
                    userId: data.userId,
                    userName: data.userName,
                    userPhotoURL: data.userPhotoURL,
                    rating: data.rating,
                    feedback: data.feedback
                  });
                }
                if (data.userId === userId) {
                  userHasRated = true;
                }
              });

              const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : "0.0";

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
                userHasRated,
                raters
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

          // Sort by date
          pastOppsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          upcomingOppsList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

          setPastOpportunities(pastOppsList)
          setUpcomingOpportunities(upcomingOppsList)
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

          // Sort by date
          savedOppsList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          setSavedOpportunities(savedOppsList)
        }
      }
    } catch (error) {
      console.error("Error fetching opportunities:", error)
    } finally {
      setLoading(false)
    }
  }

  // Update useEffect to use the fetchOpportunities function
  useEffect(() => {
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
  const handleFeedback = async (opportunity: any) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert("Error", "You must be logged in to provide feedback");
        return;
      }

      // Get existing feedback
      const ratingsRef = collection(db, "ratings");
      const q = query(ratingsRef, 
        where("causeId", "==", opportunity.id),
        where("userId", "==", userId)
      );
      const snapshot = await getDocs(q);
      setRatingSnapshot(snapshot);

      // Get all ratings for this cause to calculate average
      const allRatingsQuery = query(ratingsRef, where("causeId", "==", opportunity.id));
      const allRatingsSnapshot = await getDocs(allRatingsQuery);
      let totalRating = 0;
      let ratingCount = 0;
      
      allRatingsSnapshot.forEach((doc) => {
        const ratingData = doc.data();
        if (ratingData.rating) {
          totalRating += ratingData.rating;
          ratingCount++;
        }
      });

      const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : "0.0";
      
      if (!snapshot.empty) {
        // Feedback exists - show it
        const ratingData = snapshot.docs[0].data();
        setSelectedOpportunity({
          ...opportunity,
          avgRating: avgRating
        });
        setUserRating(ratingData.rating);
        setFeedbackText(ratingData.feedback || "");
        setIsEditing(false);
      } else {
        // No feedback - create new
        setSelectedOpportunity({
          ...opportunity,
          avgRating: avgRating
        });
        setUserRating(0);
        setFeedbackText("");
        setIsEditing(true);
      }
      setFeedbackModalVisible(true);
    } catch (error) {
      console.error("Error handling feedback:", error);
      Alert.alert("Error", "Failed to load feedback");
    }
  };

  // Update handleSaveFeedback function to include proper user info
  const handleSaveFeedback = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId || !selectedOpportunity) return;

      const ratingsRef = collection(db, "ratings");
      const q = query(ratingsRef, 
        where("causeId", "==", selectedOpportunity.id),
        where("userId", "==", userId)
      );
      const ratingSnapshot = await getDocs(q);

      // Get current user's profile data
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.exists() ? userDoc.data() as UserData : null;
      
      const ratingData = {
        userId,
        causeId: selectedOpportunity.id,
        rating: userRating,
        feedback: feedbackText,
        firstName: userData?.firstName || "",
        lastName: userData?.lastName || "",
        userPhotoURL: userData?.photoURL || null,
        updatedAt: new Date(),
      };

      let ratingDocRef;
      if (!ratingSnapshot.empty) {
        // Update existing feedback
        ratingDocRef = ratingSnapshot.docs[0].ref;
        await updateDoc(ratingDocRef, ratingData);
      } else {
        // Create new feedback
        ratingDocRef = await addDoc(ratingsRef, {
          ...ratingData,
          createdAt: new Date(),
        });
      }

      // Recalculate average rating and update UI
      const allRatingsQuery = query(ratingsRef, where("causeId", "==", selectedOpportunity.id));
      const allRatingsSnapshot = await getDocs(allRatingsQuery);
      let totalRating = 0;
      let ratingCount = 0;
      
      const updatedRaters = await Promise.all(
        allRatingsSnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          if (data.rating) {
            totalRating += data.rating;
            ratingCount++;
          }
          
          // Always fetch fresh user data for each rating
          const raterDocRef = doc(db, "users", data.userId);
          const raterDoc = await getDoc(raterDocRef);
          const raterData = raterDoc.exists() ? raterDoc.data() : null;
          
          return {
            userId: data.userId,
            firstName: raterData?.firstName || "",
            lastName: raterData?.lastName || "",
            userPhotoURL: raterData?.photoURL || null,
            rating: data.rating || 0,
            feedback: data.feedback || "",
          };
        })
      );

      const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : "0.0";

      // Update the opportunity in state with new average rating and raters
      setPastOpportunities(prev => 
        prev.map(opp => 
          opp.id === selectedOpportunity.id 
            ? { ...opp, avgRating, userHasRated: true, raters: updatedRaters }
            : opp
        )
      );

      setFeedbackModalVisible(false);
      Alert.alert("Success", "Your feedback has been saved!");

      // Refresh the opportunities to ensure all data is up to date
      fetchOpportunities();
    } catch (error) {
      console.error("Error saving feedback:", error);
      Alert.alert("Error", "Failed to save feedback");
    }
  };

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

          <Text style={styles.dateTime}>
            {`${formatDate(item.date)} • ${formatTime(item.time)}`}
          </Text>

          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>Rated Experience: {item.avgRating}/5.0</Text>
            {renderStarRating(Number.parseFloat(item.avgRating))}
          </View>

          {/* Update the ratersRow section */}
          <View style={styles.ratersRow}>
            {item.raters?.slice(0, 4).map((rater: any, index: number) => (
              <Image
                key={index}
                source={
                  rater.userPhotoURL
                    ? { uri: rater.userPhotoURL }
                    : require("../assets/images/placeholder.png")
                }
                style={[
                  styles.raterAvatar,
                  { marginLeft: index > 0 ? -8 : 0, zIndex: 4 - index }
                ]}
                defaultSource={require("../assets/images/placeholder.png")}
              />
            ))}
            {item.raters && item.raters.length > 0 && (
              <TouchableOpacity
                style={[styles.moreRatersButton, { zIndex: 0 }]}
                onPress={() => handleShowFeedbackDetails(item.id)}
              >
                <Text style={styles.plusIcon}>
                  {item.raters.length > 4 ? `+${item.raters.length - 4}` : "+"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.feedbackButton} onPress={() => handleFeedback(item)}>
              <Text style={styles.feedbackButtonText}>
                {item.userHasRated ? "View Feedback" : "Provide Feedback"}
              </Text>
            </TouchableOpacity>

            <View style={styles.iconButtons}>
              <TouchableOpacity style={styles.iconButton}>
                <Share2 size={20} color="#666" />
              </TouchableOpacity>
              {renderBookmarkIcon(item.id)}
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

          <Text style={styles.dateTime}>
            {`${formatDate(item.date)} • ${formatTime(item.time)}`}
          </Text>

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
              {renderBookmarkIcon(item.id)}
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

          <Text style={styles.dateTime}>
            {`${formatDate(item.date)} • ${formatTime(item.time)}`}
          </Text>

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
              {renderBookmarkIcon(item.id)}
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
      const unsubscribes: (() => void)[] = []

      for (const opportunityId of upcomingOpportunityIds) {
        const participantsRef = ref(realtimeDb, `causes/${opportunityId}/participants`)
        const unsubscribe = onValue(participantsRef, (snapshot) => {
          const typedSnapshot = snapshot as { val: () => any }
          const data = typedSnapshot.val()
          if (data) {
            const participantsList = Object.entries(data).map(([userId, userData]: [string, any]) => ({
              id: userId,
              ...userData,
            }))
            newParticipantsMap[opportunityId] = participantsList
            setParticipantsMap(prev => ({...prev, [opportunityId]: participantsList}))
          } else {
            newParticipantsMap[opportunityId] = []
            setParticipantsMap(prev => ({...prev, [opportunityId]: []}))
          }
        })
        unsubscribes.push(unsubscribe)
      }

      return () => {
        unsubscribes.forEach(unsubscribe => unsubscribe())
      }
    }

    fetchParticipants()
  }, [upcomingOpportunities])

  const formatTime = (timeString: string) => {
    // Remove PT suffix if it exists
    return timeString.replace(/ PT$/, "");
  };

  // Add handleSave function
  const handleSave = async (opportunityId: string) => {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) {
        Alert.alert("Error", "You must be logged in to save opportunities")
        return
      }

      const userDoc = await getDoc(doc(db, "users", userId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const savedOpportunities = userData.saved_opportunities || []
        const isCurrentlySaved = savedOpportunities.includes(opportunityId)

        if (isCurrentlySaved) {
          // Unsave
          await updateDoc(doc(db, "users", userId), {
            saved_opportunities: arrayRemove(opportunityId),
          })
          // Remove from local state
          setSavedOpportunities(prev => prev.filter(opp => opp.id !== opportunityId))
        } else {
          // Save
          await updateDoc(doc(db, "users", userId), {
            saved_opportunities: arrayUnion(opportunityId),
          })
          // Add to local state if not already present
          const oppToAdd = [...pastOpportunities, ...upcomingOpportunities].find(opp => opp.id === opportunityId)
          if (oppToAdd && !savedOpportunities.some((id: string) => id === opportunityId)) {
            setSavedOpportunities(prev => [...prev, oppToAdd])
          }
        }
      }
    } catch (error) {
      console.error("Error saving opportunity:", error)
      Alert.alert("Error", "Failed to save this opportunity")
    }
  }

  // Add renderBookmarkIcon function
  const renderBookmarkIcon = (opportunityId: string) => (
    <TouchableOpacity style={styles.iconButton} onPress={() => handleSave(opportunityId)}>
      <Bookmark 
        size={20} 
        color="#000" 
        fill={savedOpportunities.some(opp => opp.id === opportunityId) ? "#000" : "none"} 
      />
    </TouchableOpacity>
  )

  // Add this function to fetch ratings when loading opportunities
  const fetchOpportunityRatings = async (opportunityId: string) => {
    try {
      const ratingsRef = collection(db, "ratings");
      const ratingsQuery = query(ratingsRef, where("causeId", "==", opportunityId));
      const ratingsSnapshot = await getDocs(ratingsQuery);
      
      let totalRating = 0;
      let ratingCount = 0;
      let userHasRated = false;
      const userId = auth.currentUser?.uid;

      ratingsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.rating) {
          totalRating += data.rating;
          ratingCount++;
        }
        if (data.userId === userId) {
          userHasRated = true;
        }
      });

      return {
        avgRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : "0.0",
        userHasRated
      };
    } catch (error) {
      console.error("Error fetching ratings:", error);
      return { avgRating: "0.0", userHasRated: false };
    }
  };

  // Update the fetchUserFeedbacks function
  const fetchUserFeedbacks = async (opportunityId: string) => {
    try {
      const ratingsRef = collection(db, "ratings");
      const ratingsQuery = query(ratingsRef, where("causeId", "==", opportunityId));
      const ratingsSnapshot = await getDocs(ratingsQuery);
      
      const feedbacks = await Promise.all(
        ratingsSnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data() as RatingData;
          // Fetch fresh user data for each feedback
          const userDocRef = doc(db, "users", data.userId);
          const userDoc = await getDoc(userDocRef);
          const userData = userDoc.exists() ? userDoc.data() as UserData : null;
          
          return {
            userId: data.userId,
            rating: data.rating || 0,
            feedback: data.feedback || "",
            firstName: userData?.firstName || "",
            lastName: userData?.lastName || "",
            userPhotoURL: userData?.photoURL || null,
            displayName: userData?.displayName || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || "Anonymous",
            createdAt: data.createdAt || new Date(),
            updatedAt: data.updatedAt || new Date(),
          };
        })
      );
      
      return feedbacks.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
    } catch (error) {
      console.error("Error fetching user feedbacks:", error);
      return [];
    }
  };

  // Add this function to handle showing feedback details
  const handleShowFeedbackDetails = async (opportunityId: string) => {
    const feedbacks = await fetchUserFeedbacks(opportunityId);
    setSelectedFeedbacks(feedbacks);
    setShowFeedbackDetails(true);
  };

  // Update the feedback details modal to show full names
  const FeedbackDetailsModal = () => (
    <Modal
      visible={showFeedbackDetails}
      transparent
      animationType="fade"
      onRequestClose={() => setShowFeedbackDetails(false)}
    >
      <View style={styles.feedbackDetailsOverlay}>
        <View style={styles.feedbackDetailsContent}>
          <View style={styles.feedbackDetailsHeader}>
            <Text style={styles.feedbackDetailsTitle}>User Feedbacks</Text>
            <TouchableOpacity 
              style={styles.closeIconButton} 
              onPress={() => setShowFeedbackDetails(false)}
            >
              <X size={16} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.feedbackDetailsList}>
            {selectedFeedbacks.map((feedback, index) => (
              <View key={index} style={styles.feedbackDetailItem}>
                <View style={styles.feedbackUserInfo}>
                  <Image
                    source={
                      feedback.userPhotoURL
                        ? { uri: feedback.userPhotoURL }
                        : require("../assets/images/placeholder.png")
                    }
                    style={styles.feedbackUserAvatar}
                    defaultSource={require("../assets/images/placeholder.png")}
                    onError={() => console.log("Error loading avatar for user:", feedback.userId)}
                  />
                  <View style={styles.feedbackUserDetails}>
                    <Text style={styles.feedbackUserName}>
                      {feedback.displayName || "Anonymous"}
                    </Text>
                    <View style={styles.feedbackRating}>
                      {renderStarRating(feedback.rating)}
                    </View>
                  </View>
                </View>
                {feedback.feedback && (
                  <Text style={styles.feedbackText}>{feedback.feedback}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Update the feedback modal content
  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <Text style={styles.modalTitle}>
        {isEditing ? "Provide Your Feedback" : "Your Feedback"}
      </Text>
      <View style={styles.centerStarRating}>
        {renderStarRating(userRating, 24, isEditing)}
      </View>
      <TextInput
        ref={feedbackInputRef}
        style={[
          styles.feedbackInput,
          isEditing ? styles.feedbackInputEditable : styles.feedbackInputReadOnly
        ]}
        value={feedbackText}
        onChangeText={text => isEditing ? setFeedbackText(text) : null}
        editable={isEditing}
        multiline
        placeholder={isEditing ? "Share your experience..." : ""}
        placeholderTextColor="#999"
      />
      <View style={styles.modalButtons}>
        {isEditing ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleSaveFeedback}
            >
              <Text style={styles.buttonText}>Save Feedback</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setFeedbackModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.buttonText}>Edit Feedback</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={() => setFeedbackModalVisible(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header with more spacing */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
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
        <View style={styles.contentContainer}>
          {activeTab === "past" && (
            <>
              {pastOpportunities.length > 0 ? (
                <FlatList
                  data={pastOpportunities.filter(
                    (opp) =>
                      searchQuery === "" ||
                      opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      opp.organizationName.toLowerCase().includes(searchQuery.toLowerCase()),
                  )}
                  renderItem={({ item }) => (
                    <View style={styles.opportunityContainer}>{renderPastOpportunityCard(item)}</View>
                  )}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.opportunitiesList}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Image source={require("../assets/images/placeholder.png")} style={styles.emptyImage} />
                  <Text style={styles.emptyTitle}>No Past Causes</Text>
                  <Text style={styles.emptyText}>You haven't participated in any volunteer opportunities yet.</Text>
                </View>
              )}
            </>
          )}

          {activeTab === "upcoming" && (
            <>
              {upcomingOpportunities.length > 0 ? (
                <FlatList
                  data={upcomingOpportunities.filter(
                    (opp) =>
                      searchQuery === "" ||
                      opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      opp.organizationName.toLowerCase().includes(searchQuery.toLowerCase()),
                  )}
                  renderItem={({ item }) => (
                    <View style={styles.opportunityContainer}>{renderUpcomingOpportunityCard(item)}</View>
                  )}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.opportunitiesList}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Image source={require("../assets/images/placeholder.png")} style={styles.emptyImage} />
                  <Text style={styles.emptyTitle}>No Upcoming Causes</Text>
                  <Text style={styles.emptyText}>You haven't signed up for any upcoming volunteer opportunities.</Text>
                </View>
              )}
            </>
          )}

          {activeTab === "saved" && (
            <>
              {savedOpportunities.length > 0 ? (
                <FlatList
                  data={savedOpportunities.filter(
                    (opp) =>
                      searchQuery === "" ||
                      opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      opp.organizationName.toLowerCase().includes(searchQuery.toLowerCase()),
                  )}
                  renderItem={({ item }) => (
                    <View style={styles.opportunityContainer}>{renderSavedOpportunityCard(item)}</View>
                  )}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.opportunitiesList}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Image source={require("../assets/images/placeholder.png")} style={styles.emptyImage} />
                  <Text style={styles.emptyTitle}>No Saved Causes</Text>
                  <Text style={styles.emptyText}>You haven't saved any volunteer opportunities yet.</Text>
                </View>
              )}
            </>
          )}

          {/* Find More Causes Button */}
          <TouchableOpacity style={styles.findMoreButton} onPress={handleFindMoreCauses}>
            <Text style={styles.findMoreButtonText}>Find More Causes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Feedback Modal */}
      <Modal
        visible={feedbackModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {renderSuccess()}
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

      <FeedbackDetailsModal />
    </SafeAreaView>
  )
}

const baseButtonStyle: ViewStyle = {
  padding: 10,
  borderRadius: 10,
  width: "45%",
};

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
    paddingTop: 60, // Increased from 50 to 60 to push header down further
    paddingBottom: 25, // Increased from 20 to 25
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
    flex: 1,
    marginHorizontal: 2, // Add some horizontal margin
  },
  opportunityContent: {
    flex: 1,
    padding: 12,
    width: "70%", // Increase content width
  },
  opportunityImage: {
    width: "30%", // Adjust image width to complement content
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
    marginBottom: 20,
    flexWrap: "wrap", // Allow text to wrap if needed
  },
  ratingText: {
    fontSize: 12,
    color: "#666",
    marginRight: 8,
    marginBottom: 4, // Add some bottom margin for wrapped text
  },
  ratersRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
    height: 32, // Increased height for better visibility
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
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 20,
    fontSize: 14,
  },
  feedbackInputEditable: {
    borderColor: "#15B2BF",
    backgroundColor: "#fff",
  },
  feedbackInputReadOnly: {
    borderColor: "#ddd",
    backgroundColor: "#f5f5f5",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  button: {
    padding: 10,
    borderRadius: 10,
    width: "45%",
  },
  primaryButton: {
    ...baseButtonStyle,
    backgroundColor: "#15B2BF",
  },
  closeButton: {
    ...baseButtonStyle,
    backgroundColor: "#666",
  },
  cancelButton: {
    ...baseButtonStyle,
    backgroundColor: "#FF4757",
  },
  buttonText: {
    color: "white",
    textAlign: "center",
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerLeft: {
    width: 40,
  },
  raterAvatar: {
    width: 32, // Increased size
    height: 32, // Increased size
    borderRadius: 16,
    borderWidth: 2, // Increased border width
    borderColor: "#fff",
    backgroundColor: "#f0f0f0",
  },
  moreRatersButton: {
    width: 32, // Match avatar size
    height: 32, // Match avatar size
    borderRadius: 16,
    backgroundColor: "#15B2BF", // Changed to theme color
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  plusIcon: {
    fontSize: 16, // Increased font size
    color: "#fff", // Changed to white for better contrast
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 20,
  },
  feedbackDetailsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  feedbackDetailsContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  feedbackDetailsHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    position: "relative",
  },
  feedbackDetailsTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  feedbackDetailsList: {
    marginTop: 12,
  },
  feedbackDetailItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  feedbackUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  feedbackUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#f0f0f0', // Add background color for placeholder
  },
  feedbackUserDetails: {
    flex: 1,
  },
  feedbackUserName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  feedbackRating: {
    flexDirection: "row",
  },
  feedbackText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  successContainer: {
    padding: 16,
  },
  centerStarRating: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  closeIconButton: {
    position: "absolute",
    right: 0,
    top: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
})
