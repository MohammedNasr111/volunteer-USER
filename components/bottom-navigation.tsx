"use client"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { useRouter } from "expo-router"
import { Home, Clock, Bell, User } from "lucide-react-native"
import { useContext } from "react"
import { NotificationContext } from "../app/_layout"

interface BottomNavigationProps {
  activeTab: string;
  notificationCount?: number;
}

// Update the component to use the global notification context
export default function BottomNavigation({ activeTab, notificationCount = 0 }: BottomNavigationProps) {
  const router = useRouter()
  const { unreadCount } = useContext(NotificationContext)

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
        onPress={() => router.push("/notifications")}
      >
        <View>
          <Bell size={24} color={activeTab === "notifications" ? "#15B2BF" : "#666"} />
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount}</Text>
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
    backgroundColor: "#15B2BF",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
})

