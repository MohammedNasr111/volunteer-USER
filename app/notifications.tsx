"use client"
import React, { useState, useEffect, useCallback, useContext, useMemo } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  SectionList,
  ActivityIndicator,
  Linking,
} from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from "firebase/firestore"
import { auth, db } from "./firebase/config"
import { useFonts } from "expo-font"
import BottomNavigation from "../components/bottom-navigation"
import { ChevronLeft, Bell, Calendar, Clock, Check, UserCog, LogIn, LogOut, UserPlus, X } from "lucide-react-native"
import { notificationService } from "../services/notificationService"
import { NotificationContext } from "./_layout"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  timestamp: Date
  seen: boolean
  userId?: string
  organizerEmail?: string
  causeId?: string
  causeName?: string
}

declare global {
  var unreadNotificationCount: number;
}

// Add this helper function to group notifications by date
const groupNotificationsByDate = (notifications: Notification[]) => {
  const groups = notifications.reduce((groups: { [key: string]: Notification[] }, notification) => {
    const date = new Date(notification.timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {});

  return Object.entries(groups).map(([date, items]) => ({
    title: date,
    data: items,
  }));
};

// Add this helper function to get the appropriate icon for each notification type
const getNotificationIcon = (type: string, seen: boolean) => {
  const color = seen ? "#666" : "#15B2BF";
  const size = 24;

  switch (type) {
    case 'login':
      return <LogIn size={size} color={color} />;
    case 'sign_out':
      return <LogOut size={size} color={color} />;
    case 'profile_update':
      return <UserCog size={size} color={color} />;
    case 'account_creation':
      return <UserPlus size={size} color={color} />;
    case 'registration':
      return <Check size={size} color={color} />;
    case 'preferences':
      return <Bell size={size} color={color} />;
    case 'new_cause':
      return <Calendar size={size} color={color} />;
    case 'cancellation':
      return <X size={size} color={color} />;
    case 'removal':
      return <UserCog size={size} color={color} />;
    default:
      return <Bell size={size} color={color} />;
  }
};

export default function NotificationsScreen() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const { setUnreadCount: setGlobalUnreadCount } = useContext(NotificationContext)

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
    "AbhayaLibre-ExtraBold": require("../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
    "Lato-Bold": require("../assets/fonts/Lato-Bold.ttf"),
  })

  // Update unread count
  const updateUnreadCount = useCallback((notifs: Notification[]) => {
    const count = notifs.filter(n => !n.seen).length
    setUnreadCount(count)
    // Update the count in bottom navigation globally
    global.unreadNotificationCount = count
  }, [])

  // Reset notifications and count when component mounts (immediately)
  useEffect(() => {
    // Reset the global unread count as soon as the screen loads
    setGlobalUnreadCount(0)
    global.unreadNotificationCount = 0
    
    return () => {
      global.unreadNotificationCount = 0
    }
  }, [setGlobalUnreadCount])

  // Mark all notifications as read when the screen is viewed
  const markAllAsRead = useCallback(async (notificationsData: Notification[]) => {
    try {
      const userId = auth.currentUser?.uid
      if (!userId) return
      
      // Skip if there are no notifications
      if (notificationsData.length === 0) return
      
      console.log("Marking all notifications as read...")
      
      // Update all notifications in Firestore - important to use 'read' field
      // instead of 'seen' to match the query in the _layout.tsx file
      const promises = notificationsData.map(notification => {
        const notificationRef = doc(db, "notifications", notification.id)
        return updateDoc(notificationRef, { read: true, seen: true })
      })
      
      await Promise.all(promises)
      
      // Update local state
      const updatedNotifications = notificationsData.map(n => ({ ...n, seen: true }))
      setNotifications(updatedNotifications)
      
      // Reset count to zero in both local and global state
      setUnreadCount(0)
      setGlobalUnreadCount(0)
      global.unreadNotificationCount = 0
      
      console.log(`Marked ${notificationsData.length} notifications as read`)
    } catch (error) {
      console.error("Error marking notifications as read:", error)
    }
  }, [setGlobalUnreadCount])

  // Reset notification count as soon as component mounts
  useEffect(() => {
    const resetCount = async () => {
      try {
        const userId = auth.currentUser?.uid
        if (!userId) return
        
        // Reset the global unread count immediately
        setGlobalUnreadCount(0)
        global.unreadNotificationCount = 0
        
        // Also update all notifications in the database to be read
        const notificationsRef = collection(db, "notifications")
        const q = query(
          notificationsRef,
          where("userId", "==", userId),
          where("read", "==", false)
        )
        const querySnapshot = await getDocs(q)
        
        if (querySnapshot.size > 0) {
          const promises = querySnapshot.docs.map(doc => {
            return updateDoc(doc.ref, { read: true, seen: true })
          })
          
          await Promise.all(promises)
          console.log(`Marked ${querySnapshot.size} notifications as read on mount`)
        }
      } catch (error) {
        console.error("Error resetting notification count:", error)
      }
    }
    
    resetCount()
    
    return () => {
      // Cleanup
      global.unreadNotificationCount = 0
    }
  }, [setGlobalUnreadCount])

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const userId = auth.currentUser?.uid
        if (!userId) return

        const notificationsRef = collection(db, "notifications")
        const q = query(
          notificationsRef,
          where("userId", "==", userId),
          orderBy("timestamp", "desc")
        )
        const querySnapshot = await getDocs(q)
        
        const notificationsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate?.() || new Date(),
          };
        }) as Notification[]

        setNotifications(notificationsData)
        updateUnreadCount(notificationsData)
        
        // Mark all notifications as read
        markAllAsRead(notificationsData)
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [updateUnreadCount, markAllAsRead])

  // Format date for display
  const formatDate = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      if (diffInHours < 1) {
        const minutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
      }
      const hours = Math.floor(diffInHours)
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Handle organizer email click
  const handleEmailPress = async (email: string, causeName: string) => {
    const subject = encodeURIComponent(`Regarding removal from ${causeName}`)
    const mailtoUrl = `mailto:${email}?subject=${subject}`
    
    try {
      await Linking.openURL(mailtoUrl)
    } catch (error) {
      console.error("Error opening email client:", error)
    }
  }

  // Update to render notification item without click handler
  const renderNotificationItem = useCallback(({ item }: { item: Notification }) => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationIcon}>
        {getNotificationIcon(item.type, true)}
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        {item.type === 'removal' && item.organizerEmail && (
          <TouchableOpacity
            onPress={() => handleEmailPress(item.organizerEmail!, item.causeName!)}
          >
            <Text style={styles.emailLink}>Contact organizer</Text>
          </TouchableOpacity>
        )}
        <View style={styles.timeContainer}>
          <View style={styles.timeItem}>
            <Clock size={14} color="#999" />
            <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
          </View>
        </View>
      </View>
    </View>
  ), [])

  const renderSectionHeader = useCallback(({ section: { title } }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Calendar size={16} color="#fff" />
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  ), []);

  // Group notifications by date
  const sections = groupNotificationsByDate(notifications);

  // Memoize the keyExtractor to improve performance
  const keyExtractor = useCallback((item: Notification) => item.id, []);

  // Optimize data to improve list performance
  const memoizedSections = useMemo(() => sections, [notifications]);

  if (!fontsLoaded) {
    return null
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#000" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notification System</Text>
        </View>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Notifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15B2BF" />
        </View>
      ) : (
        <SectionList
          sections={memoizedSections}
          renderItem={renderNotificationItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.notificationsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
          stickySectionHeadersEnabled={true}
          initialNumToRender={10}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="notifications" />
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
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 25,
    height: 110,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
  },
  headerLeft: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 20,
    textAlign: "center",
    color: "#15B2BF",
  },
  backButton: {
    padding: 8,
  },
  countBadge: {
    backgroundColor: "#FF3B30",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationsList: {
    padding: 16,
    paddingBottom: 100, // Extra padding at bottom for navigation bar
  },
  notificationItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  notificationIcon: {
    marginRight: 12,
    paddingTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontFamily: "Lato-Bold",
    fontSize: 16,
    marginBottom: 4,
    color: "#000",
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
  emailLink: {
    color: "#FF3B30",
    textDecorationLine: "underline",
    marginTop: 4,
    marginBottom: 8,
    fontWeight: "500",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  timeItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#15B2BF',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeaderText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
    fontFamily: "Lato-Bold",
  },
});
