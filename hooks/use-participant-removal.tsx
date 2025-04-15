"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, onSnapshot, getDocs, doc, getDoc, updateDoc, arrayRemove, addDoc } from "firebase/firestore"
import { auth, db } from "../app/firebase/config"
import { ref, set, runTransaction } from "firebase/database"
import { realtimeDb } from "../app/firebase/config"

interface RemovalData {
  id: string
  causeName: string
  causeId: string
  reason: string
  timestamp: string
  adminId: string
  adminEmail?: string
  organizationName?: string
  seen?: boolean
}

export function useParticipantRemoval() {
  const [removalData, setRemovalData] = useState<RemovalData | null>(null)
  const [showNotification, setShowNotification] = useState(false)
  const [loading, setLoading] = useState(true)

  // Function to fetch admin details
  const fetchAdminDetails = async (adminId: string) => {
    try {
      const adminDoc = await getDoc(doc(db, "admins", adminId))
      if (adminDoc.exists()) {
        const adminData = adminDoc.data()
        return {
          email: adminData.workEmail || adminData.email,
          organizationName: adminData.organizationName || "Unknown Organization",
        }
      }
    } catch (error) {
      console.error("Error fetching admin details:", error)
    }
    return { email: undefined, organizationName: "Unknown Organization" }
  }

  // Function to check for removal notifications when user logs in
  const checkForRemovalNotifications = useCallback(async () => {
    const userId = auth.currentUser?.uid
    if (!userId) return

    setLoading(true)
    try {
      // Query for removal records for this user
      const removalsRef = collection(db, "participantRemovals")
      const q = query(removalsRef, where("userId", "==", userId))

      const querySnapshot = await getDocs(q)

      // Process results in memory
      const unseenRemovals = querySnapshot.docs
        .filter((doc) => doc.data().seen === false)
        .sort((a, b) => {
          // Sort by timestamp descending
          const timestampA = a.data().timestamp || ""
          const timestampB = b.data().timestamp || ""
          return timestampB.localeCompare(timestampA)
        })

      if (unseenRemovals.length > 0) {
        const removalDoc = unseenRemovals[0]
        const data = removalDoc.data()

        // Fetch admin details
        const { email, organizationName } = await fetchAdminDetails(data.adminId)

        const removalInfo: RemovalData = {
          id: removalDoc.id,
          causeName: data.causeName || "Unknown Cause",
          causeId: data.causeId || "",
          reason: data.reason || "Not specified",
          timestamp: data.timestamp || new Date().toISOString(),
          adminId: data.adminId || "",
          adminEmail: email,
          organizationName: organizationName,
          seen: data.seen || false,
        }

        // Update user's registered_opportunities to remove this cause
        if (data.causeId) {
          try {
            // First, update Firestore to remove the cause from registered_opportunities
            await updateDoc(doc(db, "users", userId), {
              registered_opportunities: arrayRemove(data.causeId),
            })

            // Also ensure the user is removed from the participants list in Realtime Database
            const participantRef = ref(realtimeDb, `causes/${data.causeId}/participants/${userId}`)
            await set(participantRef, null)

            // Update the participants count in Realtime Database
            const participantsCountRef = ref(realtimeDb, `causes/${data.causeId}/participantsCount`)
            await runTransaction(participantsCountRef, (currentCount) => {
              return Math.max(0, (currentCount || 0) - 1)
            })

            // Create a notification in the notifications collection
            const notificationsRef = collection(db, "notifications")
            await addDoc(notificationsRef, {
              userId: userId,
              title: "Removed from Cause",
              message: `You have been removed from "${data.causeName}" by ${organizationName || 'the organization'} due to ${data.reason || 'Not specified'}. For more information, contact the organizer.`,
              type: "removal",
              timestamp: new Date().toISOString(),
              seen: false,
              read: false,
              organizerEmail: email,
              causeName: data.causeName,
              organizationName: organizationName || "Unknown Organization",
              reason: data.reason || "Not specified"
            })

            console.log(`User ${userId} removed from cause ${data.causeId} successfully`)
          } catch (error) {
            console.error("Error updating user's registered opportunities:", error)
          }
        }

        setRemovalData(removalInfo)
        // Don't show the notification modal
        setShowNotification(false)
      }
    } catch (error) {
      console.error("Error checking for removal notifications:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Set up real-time listener for new removal notifications
  useEffect(() => {
    const userId = auth.currentUser?.uid
    if (!userId) return

    // First check for existing notifications
    checkForRemovalNotifications()

    // Set up listener for new notifications
    const removalsRef = collection(db, "participantRemovals")
    const q = query(removalsRef, where("userId", "==", userId))

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        // Process any new removals
        for (const change of snapshot.docChanges()) {
          if (change.type === "added" || change.type === "modified") {
            const data = change.doc.data()

            // Only process if it's unseen
            if (data.seen === false) {
              // Check if it's recent (within last 5 minutes)
              const removalTime = new Date(data.timestamp).getTime()
              const fiveMinutesAgo = new Date().getTime() - 5 * 60 * 1000

              if (removalTime > fiveMinutesAgo) {
                // Fetch admin details
                const adminDetails = await fetchAdminDetails(data.adminId)
                const { email, organizationName } = adminDetails

                const removalInfo: RemovalData = {
                  id: change.doc.id,
                  causeName: data.causeName || "Unknown Cause",
                  causeId: data.causeId || "",
                  reason: data.reason || "Not specified",
                  timestamp: data.timestamp,
                  adminId: data.adminId || "",
                  adminEmail: email,
                  organizationName: organizationName,
                  seen: false,
                }

                // Update user's registered_opportunities to remove this cause
                if (data.causeId) {
                  try {
                    // First, update Firestore to remove the cause from registered_opportunities
                    await updateDoc(doc(db, "users", userId), {
                      registered_opportunities: arrayRemove(data.causeId),
                    })

                    // Also remove the user from the participants list in Realtime Database
                    const participantRef = ref(realtimeDb, `causes/${data.causeId}/participants/${userId}`)
                    await set(participantRef, null)

                    // Update the participants count in Realtime Database
                    const participantsCountRef = ref(realtimeDb, `causes/${data.causeId}/participantsCount`)
                    await runTransaction(participantsCountRef, (currentCount) => {
                      return Math.max(0, (currentCount || 0) - 1)
                    })

                    // Create a notification in the notifications collection
                    const notificationsRef = collection(db, "notifications")
                    await addDoc(notificationsRef, {
                      userId: userId,
                      title: "Removed from Cause",
                      message: `You have been removed from "${data.causeName}" by ${organizationName || 'the organization'} due to ${data.reason || 'Not specified'}. For more information, contact the organizer.`,
                      type: "removal",
                      timestamp: new Date().toISOString(),
                      seen: false,
                      read: false,
                      organizerEmail: email,
                      causeName: data.causeName,
                      organizationName: organizationName || "Unknown Organization",
                      reason: data.reason || "Not specified"
                    })

                    console.log(`User ${userId} removed from cause ${data.causeId} successfully`)
                  } catch (error) {
                    console.error("Error updating user's registered opportunities:", error)
                  }
                }

                setRemovalData(removalInfo)
                // Don't show the notification modal
                setShowNotification(false)
              }
            }
          }
        }
      },
      (error) => {
        console.error("Error setting up removal listener:", error)
      },
    )

    return () => unsubscribe()
  }, [auth.currentUser?.uid, checkForRemovalNotifications])

  // Function to mark notification as seen
  const markAsSeen = async () => {
    if (!removalData || !removalData.id) return

    try {
      await updateDoc(doc(db, "participantRemovals", removalData.id), {
        seen: true,
      })
    } catch (error) {
      console.error("Error marking notification as seen:", error)
    }
  }

  const closeNotification = () => {
    setShowNotification(false)
    markAsSeen()
  }

  return {
    removalData,
    showNotification,
    loading,
    closeNotification,
    checkForRemovalNotifications,
  }
}
