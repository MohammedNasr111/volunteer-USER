"use client"
import { useState, useEffect, useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { ArrowLeft, Bell, Mail, CheckCircle, AlertCircle, Calendar, Clock } from "lucide-react-native"
import { collection, query, where, getDocs, orderBy, updateDoc, doc, getDoc, onSnapshot } from "firebase/firestore"
import { auth, db } from "./firebase/config"
import { useFonts } from "expo-font"
import BottomNavigation from "../components/bottom-navigation"
import { Linking } from "react-native"
import { NotificationContext } from "./_layout"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  timestamp: string
  read: boolean
  causeName?: string
  causeId?: string
  reason?: string
  adminEmail?: string
  organizationName?: string
  date?: string
  time?: string
}

export default function NotificationsScreen() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [groupedNotifications, setGroupedNotifications] = useState<{ [key: string]: Notification[] }>({})

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
    "AbhayaLibre-ExtraBold": require("../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
  })

  // Add this near the top of the component, after other hooks
  const { refreshUnreadCount } = useContext(NotificationContext)

  // Set up real-time listener for notifications
  useEffect(() => {
    const userId = auth.currentUser?.uid
    if (!userId) {
      router.replace("/login")
      return
    }

    setLoading(true)

    let unsubscribeNotifications = () => {}
    let unsubscribeRemovals = () => {}

    try {
      // Set up listener for regular notifications
      const notificationsRef = collection(db, "notifications")
      const notificationsQuery = query(notificationsRef, where("userId", "==", userId), orderBy("timestamp", "desc"))

      unsubscribeNotifications = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const notificationsList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            read: doc.data().read || false,
          })) as Notification[]

          // Update notifications state
          updateNotifications(notificationsList, [])
        },
        (error) => {
          // Only log error if user is still logged in
          if (auth.currentUser) {
            console.error("Error listening to notifications:", error)
          }
        },
      )

      // Set up listener for removal notifications
      const removalsRef = collection(db, "participantRemovals")
      const removalsQuery = query(removalsRef, where("userId", "==", userId))

      unsubscribeRemovals = onSnapshot(
        removalsQuery,
        async (snapshot) => {
          const removalsList = await Promise.all(
            snapshot.docs.map(async (docSnapshot) => {
              const data = docSnapshot.data()

              // Fetch admin details if available
              let adminEmail = undefined
              let organizationName = undefined

              if (data.adminId) {
                try {
                  const adminDocRef = doc(db, "admins", data.adminId)
                  const adminDocSnapshot = await getDoc(adminDocRef)
                  if (adminDocSnapshot.exists()) {
                    const adminData = adminDocSnapshot.data()
                    adminEmail = adminData.workEmail || adminData.email
                    organizationName = adminData.organizationName
                  }
                } catch (error) {
                  console.error("Error fetching admin details:", error)
                }
              }

              return {
                id: docSnapshot.id,
                type: "removal",
                title: "Removed from Cause",
                message: `You have been removed from "${data.causeName}" due to: ${data.reason}`,
                timestamp: data.timestamp,
                read: data.seen || false,
                causeName: data.causeName,
                causeId: data.causeId,
                reason: data.reason,
                adminId: data.adminId,
                adminEmail: adminEmail,
                organizationName: organizationName,
              } as Notification
            }),
          )

          // Update notifications state
          updateNotifications([], removalsList)
        },
        (error) => {
          // Only log error if user is still logged in
          if (auth.currentUser) {
            console.error("Error listening to removals:", error)
          }
        },
      )
    } catch (error) {
      console.error("Error setting up notification listeners:", error)
      setLoading(false)
    }

    return () => {
      try {
        unsubscribeNotifications()
        unsubscribeRemovals()
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, [router, refreshUnreadCount])

  // Function to update notifications state
  const updateNotifications = (regularNotifications: Notification[], removalNotifications: Notification[]) => {
    // Combine both types of notifications
    const allNotifications = [...regularNotifications, ...removalNotifications]

    // Sort by timestamp (newest first)
    allNotifications.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    // Group notifications by date
    const grouped: { [key: string]: Notification[] } = {}

    allNotifications.forEach((notification) => {
      const date = new Date(notification.timestamp)
      const dateKey = date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }

      grouped[dateKey].push(notification)
    })

    setGroupedNotifications(grouped)
    setNotifications(allNotifications)
    setLoading(false)
  }

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const userId = auth.currentUser?.uid
      if (!userId) {
        router.replace("/login")
        return
      }

      // Fetch regular notifications
      const notificationsRef = collection(db, "notifications")
      const q = query(notificationsRef, where("userId", "==", userId), orderBy("timestamp", "desc"))

      const notificationsSnapshot = await getDocs(q)
      const notificationsList = notificationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        read: doc.data().read || false,
      })) as Notification[]

      // Fetch participant removal notifications
      const removalsRef = collection(db, "participantRemovals")
      const removalsQuery = query(removalsRef, where("userId", "==", userId))

      const removalsSnapshot = await getDocs(removalsQuery)
      const removalsList = await Promise.all(
        removalsSnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data()

          // Fetch admin details if available
          let adminEmail = undefined
          let organizationName = undefined

          if (data.adminId) {
            try {
              const adminDocRef = doc(db, "admins", data.adminId)
              const adminDocSnapshot = await getDoc(adminDocRef)
              if (adminDocSnapshot.exists()) {
                const adminData = adminDocSnapshot.data()
                adminEmail = adminData.workEmail || adminData.email
                organizationName = adminData.organizationName
              }
            } catch (error) {
              console.error("Error fetching admin details:", error)
            }
          }

          return {
            id: docSnapshot.id,
            type: "removal",
            title: "Removed from Cause",
            message: `You have been removed from "${data.causeName}" due to: ${data.reason}`,
            timestamp: data.timestamp,
            read: data.seen || false,
            causeName: data.causeName,
            causeId: data.causeId,
            reason: data.reason,
            adminId: data.adminId,
            adminEmail: adminEmail,
            organizationName: organizationName,
          } as Notification
        }),
      )

      // Combine and sort all notifications by timestamp
      const allNotifications = [...notificationsList, ...removalsList].sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })

      // Group notifications by date
      const grouped: { [key: string]: Notification[] } = {}

      allNotifications.forEach((notification) => {
        const date = new Date(notification.timestamp)
        const dateKey = date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })

        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }

        grouped[dateKey].push(notification)
      })

      setGroupedNotifications(grouped)
      setNotifications(allNotifications)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  // Update the markAsRead function to handle permission errors gracefully
  const markAsRead = async (notificationId: string, type: string) => {
    try {
      if (type === "removal") {
        try {
          await updateDoc(doc(db, "participantRemovals", notificationId), {
            seen: true,
          })
        } catch (error) {
          console.log("Could not update removal notification in Firestore, updating locally only")
          // If Firestore update fails, just update the local state
        }
      } else {
        try {
          await updateDoc(doc(db, "notifications", notificationId), {
            read: true,
          })
        } catch (error) {
          console.log("Could not update notification in Firestore, updating locally only")
          // If Firestore update fails, just update the local state
        }
      }

      // Always update local state regardless of Firestore success
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, read: true } : notification,
        ),
      )

      // Update grouped notifications
      setGroupedNotifications((prevGrouped) => {
        const newGrouped = { ...prevGrouped }

        Object.keys(newGrouped).forEach((dateKey) => {
          newGrouped[dateKey] = newGrouped[dateKey].map((notification) =>
            notification.id === notificationId ? { ...notification, read: true } : notification,
          )
        })

        return newGrouped
      })

      // Refresh the global unread count
      refreshUnreadCount()
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  // Modified to handle different notification types differently
  const handleNotificationPress = (notification: Notification) => {
    // Mark as read for all notification types
    markAsRead(notification.id, notification.type)

    // Handle different notification types
    if (notification.type === "removal") {
      // For removal notifications, show an alert with details
      Alert.alert(
        "Removal Details",
        `You were removed from "${notification.causeName}" due to: ${notification.reason}`,
        [
          { text: "Dismiss", style: "cancel" },
          {
            text: "Contact Organizer",
            onPress: () => {
              if (notification.adminEmail) {
                Linking.openURL(
                  `mailto:${notification.adminEmail}?subject=Regarding removal from ${notification.causeName}`,
                )
              }
            },
          },
        ],
      )
    }
    // For all other notification types, just mark as read without navigation
    // We removed the navigation logic for other notification types
  }

  const handleContactOrganizer = (notification: Notification) => {
    if (notification.adminEmail) {
      Linking.openURL(`mailto:${notification.adminEmail}?subject=Regarding removal from ${notification.causeName}`)
    }
  }

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch (e) {
      return ""
    }
  }

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "signup":
        return <CheckCircle size={24} color="#15B2BF" />
      case "removal":
        return <AlertCircle size={24} color="#FF4757" />
      case "new_cause":
        return <Calendar size={24} color="#15B2BF" />
      case "login":
        return <CheckCircle size={24} color="#15B2BF" />
      default:
        return <Bell size={24} color="#15B2BF" />
    }
  }

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  // Render notification item
  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const isRemoval = item.type === "removal"
    const isSignup = item.type === "signup"

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.unreadNotification]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationIconContainer}>{getNotificationIcon(item.type)}</View>

        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationTime}>{formatTime(item.timestamp)}</Text>
          </View>
          <Text style={styles.notificationMessage}>{item.message}</Text>

          {isSignup && item.date && item.time && (
            <View style={styles.eventDetails}>
              <View style={styles.eventDetailRow}>
                <Calendar size={14} color="#666" style={styles.eventDetailIcon} />
                <Text style={styles.eventDetailText}>{item.date}</Text>
              </View>
              <View style={styles.eventDetailRow}>
                <Clock size={14} color="#666" style={styles.eventDetailIcon} />
                <Text style={styles.eventDetailText}>{item.time}</Text>
              </View>
            </View>
          )}

          {isRemoval && (
            <View style={styles.removalActions}>
              <TouchableOpacity style={styles.contactButton} onPress={() => handleContactOrganizer(item)}>
                <Mail size={14} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.contactButtonText}>Contact Organizer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!item.read && <View style={styles.unreadIndicator} />}
      </TouchableOpacity>
    )
  }

  // Render section header
  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  )

  // Count unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Add a spacer view at the top */}
      <View style={styles.statusBarSpacer} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Notifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15B2BF" />
        </View>
      ) : Object.keys(groupedNotifications).length > 0 ? (
        <FlatList
          data={Object.entries(groupedNotifications).map(([date, notifications]) => ({
            title: date,
            data: notifications,
          }))}
          renderItem={({ item }) => (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{item.title}</Text>
              </View>
              {item.data.map((notification) => (
                <View key={notification.id}>{renderNotificationItem({ item: notification })}</View>
              ))}
            </View>
          )}
          keyExtractor={(item) => item.title}
          contentContainerStyle={styles.notificationsList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Bell size={60} color="#ccc" />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>You'll see notifications about your volunteer activities here</Text>
        </View>
      )}

      {/* Bottom Navigation with Badge */}
      <BottomNavigation activeTab="notifications" />
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
    alignItems: "flex-start",
  },
  headerTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 22,
    textAlign: "center",
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationsList: {
    padding: 15,
    paddingBottom: 80, // Extra space for bottom navigation
  },
  sectionHeader: {
    backgroundColor: "#15B2BF",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  sectionHeaderText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  notificationItem: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
    flexDirection: "row",
    borderLeftWidth: 5,
    borderLeftColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationIconContainer: {
    marginRight: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadNotification: {
    backgroundColor: "#f0f9fa",
    borderLeftColor: "#15B2BF",
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  notificationTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 16,
    flex: 1,
  },
  notificationTime: {
    fontSize: 12,
    color: "#999",
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  eventDetails: {
    marginTop: 5,
  },
  eventDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  eventDetailIcon: {
    marginRight: 5,
  },
  eventDetailText: {
    fontSize: 12,
    color: "#666",
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#15B2BF",
    marginLeft: 10,
    alignSelf: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 18,
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    maxWidth: "80%",
  },
  removalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  contactButton: {
    backgroundColor: "#15B2BF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  contactButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  buttonIcon: {
    marginRight: 5,
  },
})

