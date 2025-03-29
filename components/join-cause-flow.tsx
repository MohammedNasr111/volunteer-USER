"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native"
import { ref, set, get, runTransaction, onValue } from "firebase/database"
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore"
import { auth, db, realtimeDb } from "../app/firebase/config"
import { ArrowLeft, CheckCircle2, X } from "lucide-react-native"

interface JoinCauseFlowProps {
  isVisible: boolean
  onClose: () => void
  causeId: string
  causeName: string
  causeDate: string
  causeTime: string
  maxParticipants: number
}

export default function JoinCauseFlow({
  isVisible,
  onClose,
  causeId,
  causeName,
  causeDate,
  causeTime,
  maxParticipants,
}: JoinCauseFlowProps) {
  const [step, setStep] = useState(1)
  const [about, setAbout] = useState("")
  const [isOver18, setIsOver18] = useState(false)
  const [agreeToWaiver, setAgreeToWaiver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [participantsCount, setParticipantsCount] = useState(0)
  const [isFull, setIsFull] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)

  // Fetch user data and check if already registered
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = auth.currentUser?.uid
        if (userId) {
          // Get user data
          const userDoc = await getDoc(doc(db, "users", userId))
          if (userDoc.exists()) {
            setUserData(userDoc.data())

            // Check if user is already registered for this cause
            const userData = userDoc.data()
            if (userData.registered_opportunities && userData.registered_opportunities.includes(causeId)) {
              setAlreadyRegistered(true)
            } else {
              setAlreadyRegistered(false)
            }
          }

          // Also check if user exists in the participants list
          const participantRef = ref(realtimeDb, `causes/${causeId}/participants/${userId}`)
          const participantSnapshot = await get(participantRef)
          if (participantSnapshot.exists()) {
            setAlreadyRegistered(true)
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    if (isVisible) {
      fetchUserData()
    }
  }, [causeId, isVisible])

  // Listen for real-time participant count updates
  useEffect(() => {
    if (!causeId) return

    const participantsCountRef = ref(realtimeDb, `causes/${causeId}/participantsCount`)

    const unsubscribe = onValue(participantsCountRef, (snapshot) => {
      const count = snapshot.val() || 0
      setParticipantsCount(count)
      setIsFull(count >= maxParticipants)
    })

    return () => unsubscribe()
  }, [causeId, maxParticipants])

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      handleSignUp()
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    } else {
      onClose()
    }
  }

  // Updated handleSignUp function with better error handling and separation of concerns
  const handleSignUp = async () => {
    try {
      setLoading(true)
      setErrorMessage("")
      const userId = auth.currentUser?.uid

      if (!userId) {
        throw new Error("User not authenticated")
      }

      // Check if user is already registered
      if (alreadyRegistered) {
        throw new Error("You are already registered for this cause")
      }

      // First check if the event is full
      const participantsCountRef = ref(realtimeDb, `causes/${causeId}/participantsCount`)
      const countSnapshot = await get(participantsCountRef)
      const currentCount = countSnapshot.exists() ? countSnapshot.val() : 0

      if (currentCount >= maxParticipants) {
        setIsFull(true)
        throw new Error("This event is now full. Please try another opportunity.")
      }

      // Step 1: Check if user is already in participants list to avoid double counting
      const participantRef = ref(realtimeDb, `causes/${causeId}/participants/${userId}`)
      const participantSnapshot = await get(participantRef)

      if (participantSnapshot.exists()) {
        // User is already registered, just update their info
        await set(participantRef, {
          joinedAt: Date.now(),
          about: about,
          name: `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() || "Anonymous",
          photoURL: userData?.photoURL || null,
        })
      } else {
        // User is not registered yet, add them and increment count
        // Add participant data
        const participantRef = ref(realtimeDb, `causes/${causeId}/participants/${userId}`)
        const participantData = {
          joinedAt: new Date().toISOString(),
          name: `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
          avatar: userData.photoURL || null,
        }

        // First check if the user is already in the participants list
        const existingParticipantSnapshot = await get(participantRef)
        const isNewParticipant = !existingParticipantSnapshot.exists()

        // Set the participant data
        await set(participantRef, participantData)

        // Only increment the count if this is a new participant
        if (isNewParticipant) {
          const participantsCountRef = ref(realtimeDb, `causes/${causeId}/participantsCount`)

          // Use a transaction to safely increment the count
          await runTransaction(participantsCountRef, (currentCount) => {
            // If the value doesn't exist yet, initialize it to 0
            return (currentCount || 0) + 1
          })
        }

        // Add to recent signups
        const recentSignupRef = ref(realtimeDb, `causes/${causeId}/recentSignups/${userId}`)
        await set(recentSignupRef, {
          timestamp: new Date().toISOString(),
          name: `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
          avatar: userData.photoURL || null,
        })
      }

      // Step 2: Update Firestore documents (non-critical)
      try {
        // Check if user already has this cause in their registered_opportunities
        const userDoc = await getDoc(doc(db, "users", userId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (!userData.registered_opportunities || !userData.registered_opportunities.includes(causeId)) {
            // Only update if not already registered
            await updateDoc(doc(db, "users", userId), {
              registered_opportunities: arrayUnion(causeId),
            })
          }
        }

        // Try to update the cause document, but this might fail due to permissions
        try {
          const causeDoc = await getDoc(doc(db, "causes", causeId))
          if (causeDoc.exists()) {
            const causeData = causeDoc.data()
            if (!causeData.registered_users || !causeData.registered_users.includes(userId)) {
              // Only update if not already registered
              await updateDoc(doc(db, "causes", causeId), {
                registered_users: arrayUnion(userId),
              })
            }
          }
        } catch (firestoreError) {
          // Log the error but don't fail the whole operation
          console.error("Error updating cause document:", firestoreError)
          console.log("This is expected if users don't have permission to update causes")
        }
      } catch (error) {
        // Log the error but don't fail the operation
        console.error("Error updating Firestore:", error)
      }

      // If we got here, the join was successful
      setSuccess(true)
    } catch (error) {
      console.error("Detailed error signing up:", error)
      setErrorMessage(error instanceof Error ? error.message : "Failed to sign up for this cause")
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to sign up for this cause")
    } finally {
      setLoading(false)
    }
  }

  const handleAddToProfile = () => {
    onClose()
    // Navigate to profile or refresh profile data
  }

  // Render different steps of the flow
  const renderStep = () => {
    // If user is already registered, show a message
    if (alreadyRegistered) {
      return (
        <View style={styles.alreadyRegisteredContainer}>
          <CheckCircle2 size={60} color="#15B2BF" style={styles.successIcon} />
          <Text style={styles.alreadyRegisteredTitle}>You're Already Registered!</Text>
          <Text style={styles.alreadyRegisteredText}>
            You have already signed up for this cause. You can view it in your profile.
          </Text>
          <TouchableOpacity style={styles.addToProfileButton} onPress={handleAddToProfile}>
            <Text style={styles.addToProfileText}>Go to Profile</Text>
          </TouchableOpacity>
        </View>
      )
    }

    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.title}>Join Organization</Text>
            <Text style={styles.description}>By signing up for this cause, you are joining this organization!</Text>

            <Text style={styles.questionText}>
              1. In 2-3 sentences, tell us a bit more about why you're interested in joining the cause.
            </Text>
            <TextInput
              style={styles.textInput}
              multiline
              numberOfLines={4}
              value={about}
              onChangeText={setAbout}
              placeholder="Write answer here."
            />

            <Text style={styles.questionText}>2. Confirm that you are at least 18 years of age. </Text>
            <TouchableOpacity style={styles.checkboxContainer} onPress={() => setIsOver18(!isOver18)}>
              <View style={[styles.checkbox, isOver18 && styles.checkboxChecked]}>
                {isOver18 && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>I confirm that I am at least 18 years of age.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextButton, about && isOver18 ? styles.nextButtonActive : styles.disabledButton]}
              onPress={handleNext}
              disabled={!about || !isOver18}
            >
              <Text style={[styles.nextButtonText, about && isOver18 ? styles.nextButtonTextActive : {}]}>Next</Text>
            </TouchableOpacity>
          </>
        )

      case 2:
        return (
          <>
            <Text style={styles.title}>Sign Waiver</Text>
            <Text style={styles.description}>Sign the below waiver to volunteer safely.</Text>

            <ScrollView style={styles.waiverContainer}>
              <Text style={styles.waiverText}>
                I understand and agree that the Foundation are not responsible for any injury or property damage arising
                out of the Volunteer Activities, even if caused by their ordinary negligence or otherwise.
              </Text>
              <Text style={styles.waiverText}>
                I understand that participation in the Volunteer Activities involves certain risks, including, but not
                limited to, serious injury and death. I am voluntarily participating in the Volunteer Activities with
                knowledge of the danger involved and I agree to accept all risks of participation.
              </Text>
              <Text style={styles.waiverText}>
                I also agree to indemnify and hold harmless the Foundation for all claims arising out of my
                participation in the Volunteer Activities.
              </Text>
            </ScrollView>

            <TouchableOpacity style={styles.checkboxContainer} onPress={() => setAgreeToWaiver(!agreeToWaiver)}>
              <View style={[styles.checkbox, agreeToWaiver && styles.checkboxChecked]}>
                {agreeToWaiver && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>I agree to the terms and conditions stated above.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextButton, !agreeToWaiver && styles.disabledButton, { backgroundColor: "#000" }]}
              onPress={handleNext}
              disabled={!agreeToWaiver}
            >
              <Text style={[styles.nextButtonText, { color: "#fff" }]}>Next</Text>
            </TouchableOpacity>
          </>
        )

      case 3:
        return (
          <>
            <Text style={styles.title}>Confirm Sign Up Details</Text>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Cause Date and Time</Text>
              <Text style={styles.detailValue}>{causeName}</Text>
              <Text style={styles.detailValue}>{causeDate}</Text>
              <Text style={styles.detailValue}>{causeTime}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>
                {`${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() || "Not provided"}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailValue}>{auth.currentUser?.email || "Not provided"}</Text>
                <TouchableOpacity>
                  <Text style={styles.changeLink}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailValue}>{userData?.phoneNumber || "Not provided"}</Text>
                <TouchableOpacity>
                  <Text style={styles.changeLink}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <TouchableOpacity
              style={[styles.finishButton, loading && styles.disabledButton]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.finishButtonText}>Finish</Text>
              )}
            </TouchableOpacity>
          </>
        )

      default:
        return null
    }
  }

  // Success screen
  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <CheckCircle2 size={60} color="#15B2BF" style={styles.successIcon} />
      <Text style={styles.successTitle}>You're Signed Up!</Text>
      <Text style={styles.successCauseName}>{causeName}</Text>
      <Text style={styles.successDate}>{causeDate}</Text>
      <Text style={styles.successTime}>{causeTime}</Text>

      <TouchableOpacity style={styles.addToProfileButton} onPress={handleAddToProfile}>
        <Text style={styles.addToProfileText}>Add to Profile</Text>
      </TouchableOpacity>
    </View>
  )

  // Progress indicator
  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.progressDot, step === i && styles.activeProgressDot]} />
      ))}
    </View>
  )

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            {!success && !alreadyRegistered && (
              <TouchableOpacity style={styles.backIcon} onPress={handleBack}>
                <ArrowLeft size={24} color="#000" />
              </TouchableOpacity>
            )}

            {!success && !alreadyRegistered && renderProgressIndicator()}

            <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>{success ? renderSuccess() : renderStep()}</ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 15,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backIcon: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  closeIcon: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    flex: 1,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ddd",
    marginHorizontal: 4,
  },
  activeProgressDot: {
    backgroundColor: "#15B2BF",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modalBody: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  questionText: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    minHeight: 100,
    marginBottom: 20,
    textAlignVertical: "top",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#15B2BF",
    borderColor: "#15B2BF",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
  },
  nextButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  waiverContainer: {
    maxHeight: 200,
    marginBottom: 20,
  },
  waiverText: {
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 16,
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  changeLink: {
    color: "#15B2BF",
    fontSize: 14,
  },
  finishButton: {
    backgroundColor: "#000",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  successContainer: {
    alignItems: "center",
    padding: 20,
  },
  successIcon: {
    marginBottom: 15,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#15B2BF",
  },
  successCauseName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#15B2BF",
    textAlign: "center",
  },
  successDate: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: "center",
  },
  successTime: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  addToProfileButton: {
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  addToProfileText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  nextButtonActive: {
    backgroundColor: "#000",
  },
  nextButtonTextActive: {
    color: "#fff",
  },
  errorText: {
    color: "red",
    marginBottom: 15,
    textAlign: "center",
  },
  alreadyRegisteredContainer: {
    alignItems: "center",
    padding: 20,
  },
  alreadyRegisteredTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#15B2BF",
  },
  alreadyRegisteredText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
  },
})

