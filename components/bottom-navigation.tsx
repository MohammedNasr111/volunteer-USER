"use client"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { useRouter } from "expo-router"
import { Home, Clock, Bell, User } from "lucide-react-native"

type BottomNavigationProps = {
  activeTab: "home" | "history" | "notifications" | "profile"
  notificationCount?: number
}

export default function BottomNavigation({ activeTab, notificationCount = 0 }: BottomNavigationProps) {
  const router = useRouter()

  // Use a more direct approach to navigation to avoid TypeScript issues
  const navigateToHome = () => router.push("/home" as any)
  const navigateToHistory = () => router.push("/history" as any)
  const navigateToNotifications = () => router.push("/notifications" as any)
  const navigateToProfile = () => router.push("/profile" as any)

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.tabItem} onPress={navigateToHome} activeOpacity={0.7}>
        <Home size={22} color={activeTab === "home" ? "#15B2BF" : "#666"} />
        <Text style={[styles.tabText, activeTab === "home" && styles.activeTabText]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem} onPress={navigateToHistory} activeOpacity={0.7}>
        <Clock size={22} color={activeTab === "history" ? "#15B2BF" : "#666"} />
        <Text style={[styles.tabText, activeTab === "history" && styles.activeTabText]}>History</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem} onPress={navigateToNotifications} activeOpacity={0.7}>
        <View style={styles.notificationIconContainer}>
          <Bell size={22} color={activeTab === "notifications" ? "#15B2BF" : "#666"} />
          {notificationCount > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{notificationCount > 99 ? "99+" : notificationCount}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabText, activeTab === "notifications" && styles.activeTabText]}>Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tabItem} onPress={navigateToProfile} activeOpacity={0.7}>
        <User size={22} color={activeTab === "profile" ? "#15B2BF" : "#666"} />
        <Text style={[styles.tabText, activeTab === "profile" && styles.activeTabText]}>Profile</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: 70,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingBottom: 10,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  tabItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 10,
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
    color: "#666",
  },
  activeTabText: {
    color: "#15B2BF",
    fontWeight: "500",
  },
  notificationIconContainer: {
    position: "relative",
  },
  badgeContainer: {
    position: "absolute",
    top: -5,
    right: -10,
    backgroundColor: "#FF4757",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
})

