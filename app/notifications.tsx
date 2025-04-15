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
  Alert,
} from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { collection, query, where, getDocs, updateDoc, doc, orderBy, getDoc, deleteDoc, writeBatch } from "firebase/firestore"
import { auth, db } from "./firebase/config"
import { useFonts } from "expo-font"
import BottomNavigation from "../components/bottom-navigation"
import { ChevronLeft, Bell, Calendar, Clock, Check, UserCog, LogIn, LogOut, UserPlus, X, Trash2 } from "lucide-react-native"
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
  organizationName?: string
  reason?: string
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
  const [isClearing, setIsClearing] = useState(false);
  
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
      
      // IMPORTANT: Only update regular notifications from the notifications collection
      // Filter out removal notifications which have different document IDs
      const regularNotifications = notificationsData.filter(n => 
        // Only update notifications from the notifications collection
        // Removal notifications have a specific format or source
        !n.id.includes("removal_") && n.type !== "removal"
      );
      
      if (regularNotifications.length > 0) {
        // Update all notifications in Firestore
        const promises = regularNotifications.map(notification => {
          const notificationRef = doc(db, "notifications", notification.id)
          return updateDoc(notificationRef, { read: true, seen: true })
        })
        
        await Promise.all(promises)
        console.log(`Marked ${regularNotifications.length} regular notifications as read`)
      }
      
      // Just update local state for all notifications
      const updatedNotifications = notificationsData.map(n => ({ ...n, seen: true }))
      setNotifications(updatedNotifications)
      
      // Reset count to zero in both local and global state
      setUnreadCount(0)
      setGlobalUnreadCount(0)
      global.unreadNotificationCount = 0
      
      console.log(`Updated UI for ${notificationsData.length} notifications as read`)
    } catch (error) {
      console.error("Error marking notifications as read:", error)
      // Continue with UI updates even if DB update fails
      const updatedNotifications = notificationsData.map(n => ({ ...n, seen: true }))
      setNotifications(updatedNotifications)
      setUnreadCount(0)
      setGlobalUnreadCount(0)
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

        // Fetch regular notifications
        const notificationsRef = collection(db, "notifications")
        const q = query(
          notificationsRef,
          where("userId", "==", userId),
          orderBy("timestamp", "desc")
        )
        const querySnapshot = await getDocs(q)
        
        // Process notifications
        const notificationsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          
          // Parse timestamp
          let timestamp;
          if (data.timestamp?.toDate) {
            timestamp = data.timestamp.toDate();
          } else if (data.timestamp) {
            timestamp = new Date(data.timestamp);
          } else {
            timestamp = new Date();
          }
          
          // Create notification object
          return {
            id: doc.id,
            title: data.title || '',
            message: data.message || '',
            type: data.type || '',
            timestamp: timestamp,
            seen: data.seen || false,
            userId: data.userId,
            causeName: data.causeName,
            causeId: data.causeId,
            organizationName: data.organizationName,
            reason: data.reason,
            organizerEmail: data.organizerEmail
          };
        });
        
        // Direct fetch for participant removals
        const removalsRef = collection(db, "participantRemovals");
        const removalsQuery = query(
          removalsRef,
          where("userId", "==", userId)
        );
        
        const removalsSnapshot = await getDocs(removalsQuery);
        
        // Process each removal and fetch admin details
        const removalPromises = removalsSnapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          
          // If adminId is available, fetch admin details
          let orgName = "Unknown Organization";
          let orgEmail = null;
          
          if (data.adminId) {
            try {
              const adminRef = doc(db, "admins", data.adminId);
              const adminSnapshot = await getDoc(adminRef);
              
              if (adminSnapshot.exists()) {
                const adminData = adminSnapshot.data();
                // Make sure we get the organization name and work email
                orgName = adminData.organizationName;
                orgEmail = adminData.workEmail;
                
                // For removals, prefix ID with 'removal_' to distinguish from regular notifications
                return {
                  id: `removal_${docSnapshot.id}`,
                  title: "Removed from Cause",
                  message: `You have been removed from "${data.causeName}" by ${orgName} due to "${data.reason}"`,
                  type: "removal",
                  timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
                  seen: data.seen || false,
                  userId: data.userId,
                  causeName: data.causeName,
                  causeId: data.causeId,
                  organizationName: orgName,
                  reason: data.reason,
                  organizerEmail: orgEmail
                };
              }
            } catch (error) {
              console.error("Error fetching admin details:", error);
            }
          }
          
          // Fallback if admin details couldn't be fetched
          return {
            id: `removal_${docSnapshot.id}`,
            title: "Removed from Cause",
            message: `You have been removed from "${data.causeName}" by ${data.organizationName || 'Unknown Organization'}" due to "${data.reason}"`,
            type: "removal",
            timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
            seen: data.seen || false,
            userId: data.userId,
            causeName: data.causeName,
            causeId: data.causeId,
            organizationName: data.organizationName || orgName,
            reason: data.reason,
            organizerEmail: data.adminEmail || orgEmail
          };
        });
        
        // Resolve all removal promises
        const removalNotifications = await Promise.all(removalPromises);
        
        // Combine and sort all notifications
        const allNotifications = [...notificationsData, ...removalNotifications]
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        console.log(`Fetched ${allNotifications.length} notifications`);
        
        setNotifications(allNotifications);
        updateUnreadCount(allNotifications);
        
        // Mark all notifications as read - only affects Firebase for regular notifications
        markAllAsRead(allNotifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [updateUnreadCount, markAllAsRead]);

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
  const renderNotificationItem = useCallback(({ item }: { item: Notification }) => {
    return (
      <View style={styles.notificationItem}>
        <View style={styles.notificationIcon}>
          {getNotificationIcon(item.type, true)}
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          
          {/* Message for all notifications */}
          <Text style={styles.notificationMessage}>
            {item.type === 'removal' 
              ? `You have been removed from "${item.causeName || 'unknown cause'}" by ${item.organizationName} due to "${item.reason || 'unspecified reason'}".`
              : item.message
            }
          </Text>
          
          {/* Special display for removal notifications */}
          {item.type === 'removal' && (
            <View style={styles.removalDetails}>
              {item.organizerEmail ? (
                <TouchableOpacity
                  onPress={() => handleEmailPress(item.organizerEmail!, item.causeName || "this cause")}
                >
                  <Text style={styles.contactText}>
                    For more information, contact:
                  </Text>
                  <Text style={styles.emailLink}>{item.organizerEmail}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.contactText}>No contact information available</Text>
              )}
            </View>
          )}
          
          <View style={styles.timeContainer}>
            <View style={styles.timeItem}>
              <Clock size={14} color="#999" />
              <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }, [])

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

  // Handle clear all notifications
  const handleClearAll = useCallback(async () => {
    Alert.alert(
      "Clear All Notifications",
      "This will delete all your notifications. This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              setIsClearing(true);
              const userId = auth.currentUser?.uid;
              if (!userId) return;
              
              // Create a batch for all operations
              const batch = writeBatch(db);
              
              // Delete all notifications
              for (const notification of notifications) {
                if (!notification.id.startsWith('removal_')) {
                  // Delete regular notifications
                  const notificationRef = doc(db, "notifications", notification.id);
                  batch.delete(notificationRef);
                } else {
                  // Delete removal notifications
                  const removalId = notification.id.replace('removal_', '');
                  const removalRef = doc(db, "participantRemovals", removalId);
                  batch.delete(removalRef);
                }
              }
              
              // Commit all changes
              await batch.commit();
              
              // Clear all notifications from local state
              setNotifications([]);
              setUnreadCount(0);
              setGlobalUnreadCount(0);
              global.unreadNotificationCount = 0;
              
              console.log('Successfully deleted all notifications');
              
            } catch (error: any) {
              // Ignore BloomFilter warning as it's not critical
              if (error?.name !== 'BloomFilterError') {
                console.error("Error clearing notifications:", error);
                Alert.alert(
                  "Error",
                  "Failed to clear notifications. Please try again later."
                );
              }
            } finally {
              setIsClearing(false);
            }
          }
        }
      ]
    );
  }, [notifications, setGlobalUnreadCount]);

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
        <Text style={styles.headerTitle}>Notification System</Text>
        <View style={styles.headerRight}>
          {notifications.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={handleClearAll}
              disabled={isClearing}
            >
              <Trash2 size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notifications List */}
      {loading || isClearing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15B2BF" />
          {isClearing && <Text style={styles.loadingText}>Clearing notifications...</Text>}
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
    justifyContent: "space-between",
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
  headerTitle: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 20,
    color: "#000000",
    textAlign: "center",
    flex: 1,
  },
  headerRight: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: "center",
  },
  contactText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 6,
    lineHeight: 20,
    textAlign: "center",
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
  removalDetails: {
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#fcf2f2',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  removalDetail: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    lineHeight: 20,
  },
  detailLabel: {
    fontWeight: "bold",
    color: '#555',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
});
