"use client"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { useRouter } from "expo-router"
import { Home, Clock, Bell, User } from "lucide-react-native"
import { useContext } from "react"
import { NotificationContext } from "../app/_layout"

interface BottomNavigationProps {
  activeTab: string;
}

// Update the component to use the global notification context
export default function BottomNavigation({ activeTab }: BottomNavigationProps) {
  const router = useRouter()
  const { unreadCount, setUnreadCount } = useContext(NotificationContext)

  // Function to handle notification tab press
  const handleNotificationPress = async () => {
    // Reset count immediately when navigating to notification screen
    if (activeTab !== "notifications") {
      try {
        // Reset the global unread count immediately for visual feedback
        setUnreadCount(0)
        
        // Navigate to notifications screen
        router.push("/notifications")
      } catch (error) {
        console.error("Error in notification press handler:", error)
      }
    } else {
      // If already on notifications screen, do nothing
      return
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.push("/")}
      >
        <Home size={24} color={activeTab === "home" ? "#15B2BF" : "#666"} />
        <Text style={[styles.tabText, activeTab === "home" && styles.activeTabText]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.push("/history")}
      >
        <Clock size={24} color={activeTab === "history" ? "#15B2BF" : "#666"} />
        <Text style={[styles.tabText, activeTab === "history" && styles.activeTabText]}>History</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={handleNotificationPress}
      >
        <View>
          <Bell size={24} color={activeTab === "notifications" ? "#15B2BF" : "#666"} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabText, activeTab === "notifications" && styles.activeTabText]}>
          Notifications
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.push("/profile")}
      >
        <User size={24} color={activeTab === "profile" ? "#15B2BF" : "#666"} />
        <Text style={[styles.tabText, activeTab === "profile" && styles.activeTabText]}>Profile</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  activeTabText: {
    color: "#15B2BF",
  },
  badge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FF3B30", // Change to red color for classic look
    borderRadius: 12, // Make it more circular
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#fff" // Add white border for contrast
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
})

