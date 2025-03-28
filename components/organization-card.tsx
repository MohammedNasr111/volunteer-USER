import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native"

// Export the Organization interface
export interface Organization {
  id: string
  name: string
  logo?: string | null
  description?: string
  causesCount?: number
  location?: string | null
  verified?: boolean
}

// Define the props for the OrganizationCard component
interface OrganizationCardProps {
  organization: Organization
  onPress: (organizationId: string) => void
}

const OrganizationCard: React.FC<OrganizationCardProps> = ({ organization, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(organization.id)} activeOpacity={0.7}>
      <View style={styles.logoContainer}>
        <Image
          source={organization.logo ? { uri: organization.logo } : require("../assets/images/placeholder.png")}
          style={styles.logo}
        />
        {organization.verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓</Text>
          </View>
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {organization.name}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {organization.description && organization.description !== "No description available"
            ? organization.description
            : "No description available"}
        </Text>
        <View style={styles.detailsRow}>
          <Text style={styles.causesCount}>
            {organization.causesCount || 0} {organization.causesCount === 1 ? "Cause" : "Causes"}
          </Text>
          {organization.location && (
            <Text style={styles.location} numberOfLines={1}>
              {organization.location}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  logoContainer: {
    position: "relative",
    marginRight: 12,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f5f5f5",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#15B2BF",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  verifiedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  infoContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  name: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 16,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
    lineHeight: 16,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  causesCount: {
    fontSize: 12,
    color: "#15B2BF",
    fontWeight: "500",
  },
  location: {
    fontSize: 12,
    color: "#999",
    maxWidth: "60%",
  },
})

export default OrganizationCard

