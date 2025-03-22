import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native"
import { Calendar, Clock } from "lucide-react-native"

// Define the opportunity type based on your Firestore structure
export interface Opportunity {
  id: string
  name: string
  imageUrl?: string
  date: string
  time: string
  location?: {
    address?: string
  }
  city?: string
  description?: string
  volunteers?: string
  maxParticipants?: number
  registeredCount?: number
  organizationName?: string
  organizationLogo?: string
  participants?: Array<{
    id?: string
    name?: string
    avatar?: string
  }>
}

type OpportunityCardProps = {
  opportunity: Opportunity
  onPress: () => void
}

export default function OpportunityCard({ opportunity, onPress }: OpportunityCardProps) {
  // Format the date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const day = date.getDate()
      const month = date.toLocaleString("default", { month: "short" })
      return `${day} ${month}`
    } catch (error) {
      return dateString
    }
  }

  // Calculate spots left
  const maxParticipants = opportunity.maxParticipants || Number.parseInt(opportunity.volunteers || "0")
  const registeredCount = opportunity.registeredCount || 0
  const spotsLeft = maxParticipants - registeredCount

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      {/* Opportunity Image */}
      <View style={[styles.image, { backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" }]}>
        {opportunity.imageUrl ? (
          <Image
            source={{ uri: opportunity.imageUrl }}
            style={styles.image}
            defaultSource={require("../assets/images/placeholder.png")}
          />
        ) : (
          <Text style={{ color: "#999", fontSize: 12 }}>No Image</Text>
        )}
      </View>

      {/* Date and Duration Badge */}
      <View style={styles.dateBadge}>
        <Calendar size={12} color="#000" />
        <Text style={styles.dateText}>{`Sat, ${formatDate(opportunity.date || "")} • ${opportunity.time || ""}`}</Text>
      </View>

      {/* Duration Badge */}
      <View style={styles.durationBadge}>
        <Clock size={12} color="#000" />
        <Text style={styles.durationText}>{`4 hrs`}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {opportunity.name}
        </Text>

        <View style={styles.organizationRow}>
          <Image
            source={
              opportunity.organizationLogo
                ? { uri: opportunity.organizationLogo }
                : require("../assets/images/placeholder.png")
            }
            style={styles.orgLogo}
          />
          <Text style={styles.organizationName} numberOfLines={1}>
            {opportunity.organizationName || "Organization"}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.spotsText}>{`${spotsLeft}/${maxParticipants} spots left`}</Text>

          {/* Participants Avatars */}
          <View style={styles.avatarsContainer}>
            {opportunity.participants &&
              opportunity.participants
                .slice(0, 3)
                .map((participant, index) => (
                  <Image
                    key={index}
                    source={{ uri: participant.avatar || "https://via.placeholder.com/24" }}
                    style={[styles.avatar, { marginLeft: index > 0 ? -10 : 0 }]}
                  />
                ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "48%",
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  dateBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 10,
    marginLeft: 4,
    fontWeight: "500",
  },
  durationBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  durationText: {
    fontSize: 10,
    marginLeft: 4,
    fontWeight: "500",
  },
  content: {
    padding: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  organizationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  orgLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 5,
  },
  organizationName: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  spotsText: {
    fontSize: 10,
    color: "#666",
  },
  avatarsContainer: {
    flexDirection: "row",
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fff",
  },
})

