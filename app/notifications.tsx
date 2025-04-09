"use client"
import React, { useState, useEffect, useCallback } from "react"
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
import { ChevronLeft, Bell, Calendar, Clock, Check, UserCog, LogIn, LogOut, UserPlus } from "lucide-react-native"
import { notificationService } from "../services/notificationService"

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
    case 'auth':
    case 'login':
      return <LogIn size={size} color={color} />;
    case 'sign_out':
      return <LogOut size={size} color={color} />;
    case 'profile_update':
      return <UserCog size={size} color={color} />;
    case 'account_creation':
      return <UserPlus size={size} color={color} />;
    case 'success':
    case 'registration':
    case 'preferences':
      return <Check size={size} color={color} />;
    default:
      return <Bell size={size} color={color} />;
  }
};

export default function NotificationsScreen() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

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

  // Reset notifications and count when component unmounts
  useEffect(() => {
    return () => {
      global.unreadNotificationCount = 0
    }
  }, [])

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
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [updateUnreadCount])

  // Handle marking notification as read
  const handleNotificationPress = async (notification: Notification) => {
    try {
      if (!notification.seen) {
        const notificationRef = doc(db, "notifications", notification.id)
        await updateDoc(notificationRef, {
          seen: true
        })

        // Update local state
        const updatedNotifications = notifications.map(n =>
          n.id === notification.id ? { ...n, seen: true } : n
        )
        setNotifications(updatedNotifications)
        updateUnreadCount(updatedNotifications)
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
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

  // Update the renderItem to include date headers
  const renderNotificationItem = useCallback(({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.seen && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        {getNotificationIcon(item.type, item.seen)}
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
    </TouchableOpacity>
  ), [])

  const renderSectionHeader = useCallback(({ section: { title } }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Calendar size={16} color="#fff" />
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  ), []);

  // Group notifications by date
  const sections = groupNotificationsByDate(notifications);

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
          sections={sections}
          renderItem={renderNotificationItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={item => item.id}
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
      <BottomNavigation activeTab="notifications" notificationCount={unreadCount} />
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
  },
  backButton: {
    padding: 8,
  },
  countBadge: {
    backgroundColor: "#15B2BF",
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
  },
  notificationItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
  },
  notificationIcon: {
    marginRight: 12,
    paddingTop: 2,
  },
  unreadNotification: {
    backgroundColor: "#E0F7FA",
    borderColor: "#15B2BF",
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
  },
  emailLink: {
    color: "#15B2BF",
    textDecorationLine: "underline",
    marginTop: 4,
    marginBottom: 8,
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
  },
  sectionHeaderText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
    fontFamily: "Lato-Bold",
  },
});
