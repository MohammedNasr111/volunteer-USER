"use client"

import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native"
import { useEffect, useState } from "react"
import { ref, onValue } from "firebase/database"
import { getDoc, doc } from "firebase/firestore"
import { db, realtimeDb } from "../app/firebase/config"
import { Calendar, Clock } from "lucide-react-native"

export interface Opportunity {
  id: string
  name: string
  imageUrl?: string
  date?: string
  time?: string
  city?: string
  volunteers?: string
  organizationName?: string
  organizationLogo?: string
  createdBy?: string
  description?: string
  registeredCount?: number
  createdAt?: string
}

interface OpportunityCardProps {
  opportunity: Opportunity
  onPress: (opportunityId: string) => void
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity, onPress }) => {
  const [registeredCount, setRegisteredCount] = useState(opportunity.registeredCount || 0)
  const [orgName, setOrgName] = useState(opportunity.organizationName || "")
  const [orgLogo, setOrgLogo] = useState(opportunity.organizationLogo || "")

  // Format date and time for display (e.g., "Tue, 8 Apr • 08:00")
  const formatDateAndTime = (dateString?: string, timeString?: string) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)

      // Format day and date (e.g., "Tue, 8 Apr")
      const day = date.toLocaleDateString("en-US", { weekday: "short" })
      const dayNum = date.getDate()
      const month = date.toLocaleDateString("en-US", { month: "short" })

      // Extract start time from timeString if available
      let startTime = ""
      if (timeString) {
        const timeParts = timeString.split(" - ")
        if (timeParts.length > 0) {
          startTime = timeParts[0].trim()
        }
      }

      // Return formatted string with time if available
      if (startTime) {
        return `${day}, ${dayNum} ${month} • ${startTime}`
      } else {
        return `${day}, ${dayNum} ${month}`
      }
    } catch (e) {
      console.error("Error formatting date:", e)
      return dateString
    }
  }

  // Improved duration calculation from the working version
  const calculateDuration = (timeString?: string) => {
    if (!timeString || !timeString.includes("-")) return "4 hrs"

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

      // Calculate duration in hours
      const startMinutes = startHour * 60 + startMinute
      const endMinutes = endHour * 60 + endMinute

      // Handle case where end time is on the next day
      const durationMinutes =
        endMinutes >= startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes

      const durationHours = durationMinutes / 60

      // Format the duration
      return durationHours % 1 === 0 ? `${durationHours} hrs` : `${durationHours.toFixed(1)} hrs`
    } catch (error) {
      console.error("Error calculating duration:", error)
      return "4 hrs" // Fallback
    }
  }

  // Update the path for the registered count to match what's used in join-cause-flow.tsx
  useEffect(() => {
    if (opportunity.id) {
      // Set up a listener for real-time updates to the registered count
      const countRef = ref(realtimeDb, `causes/${opportunity.id}/participantsCount`)
      const unsubscribe = onValue(countRef, (snapshot) => {
        const count = snapshot.val()
        if (count !== null && count !== undefined) {
          setRegisteredCount(count)
        }
      })

      // Fetch organization data if needed
      if (opportunity.createdBy && (!orgName || !orgLogo)) {
        const fetchOrgData = async () => {
          try {
            const orgDoc = await getDoc(doc(db, "admins", opportunity.createdBy || ""))
            if (orgDoc.exists()) {
              const orgData = orgDoc.data()
              if (orgData.organizationName) {
                setOrgName(orgData.organizationName)
              }
              if (orgData.photoURL) {
                setOrgLogo(orgData.photoURL)
              }
            }
          } catch (error) {
            console.error("Error fetching organization data:", error)
          }
        }
        fetchOrgData()
      }

      // Clean up the listener when the component unmounts
      return () => unsubscribe()
    }
  }, [opportunity.id, opportunity.createdBy, orgName, orgLogo])

  // Get the display name and logo for the organization
  const displayOrgName = orgName || opportunity.organizationName || "Unknown Organization"
  const displayOrgLogo = orgLogo || opportunity.organizationLogo

  // Calculate the volunteers count
  const maxVolunteers = Number.parseInt(opportunity.volunteers || "0", 10)
  const volunteersText = `${registeredCount || 0}/${maxVolunteers} joined`

  // Get the duration using the improved function
  const duration = calculateDuration(opportunity.time)

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(opportunity.id)} activeOpacity={0.7}>
      <Image
        source={opportunity.imageUrl ? { uri: opportunity.imageUrl } : require("../assets/images/placeholder.png")}
        style={styles.image}
      />

      {/* Date and Time Badge (Top Left) */}
      <View style={styles.dateTimeContainer}>
        <Calendar size={12} color="#000" style={styles.calendarIcon} />
        <Text style={styles.dateTimeText}>{formatDateAndTime(opportunity.date, opportunity.time)}</Text>
      </View>

      {/* Duration Badge (Bottom Right) */}
      <View style={styles.durationContainer}>
        <Clock size={12} color="#000" style={styles.clockIcon} />
        <Text style={styles.durationText}>{duration}</Text>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {opportunity.name}
        </Text>
        <View style={styles.organizationRow}>
          {displayOrgLogo ? (
            <Image source={{ uri: displayOrgLogo }} style={styles.orgLogo} />
          ) : (
            <View style={styles.orgLogoPlaceholder} />
          )}
          <Text style={styles.organizationName} numberOfLines={1}>
            {displayOrgName}
          </Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.volunteers}>{volunteersText}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  image: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  dateTimeContainer: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  calendarIcon: {
    marginRight: 2,
    width: 12,
    height: 12,
  },
  dateTimeText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "500",
  },
  durationContainer: {
    position: "absolute",
    bottom: 120, // Position it at the bottom of the image (image height is 120)
    right: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 5, // Increase elevation to ensure it's visible
    zIndex: 10, // Add zIndex to ensure it's on top
  },
  clockIcon: {
    marginRight: 2,
    width: 12,
    height: 12,
  },
  durationText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "500",
  },
  contentContainer: {
    padding: 12,
  },
  title: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 16,
    marginBottom: 8,
    height: 40,
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
    marginRight: 6,
  },
  orgLogoPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    marginRight: 6,
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
  volunteers: {
    fontSize: 12,
    color: "#15B2BF",
    fontWeight: "500",
  },
})

export default OpportunityCard