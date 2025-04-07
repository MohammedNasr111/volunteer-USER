import type React from "react"
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking } from "react-native"
import { X, Mail } from "lucide-react-native"

interface RemovalNotificationModalProps {
  visible: boolean
  onClose: () => void
  removalData: {
    causeName: string
    reason: string
    timestamp: string
    adminEmail?: string
    organizationName?: string
  } | null
}

const RemovalNotificationModal: React.FC<RemovalNotificationModalProps> = ({ visible, onClose, removalData }) => {
  if (!removalData) return null

  const handleContactOrganizer = () => {
    if (removalData.adminEmail) {
      Linking.openURL(`mailto:${removalData.adminEmail}?subject=Regarding removal from ${removalData.causeName}`)
    } else {
      // Fallback if no admin email is provided
      onClose()
    }
  }

  // Format the timestamp to a readable date
  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleString()
    } catch (e) {
      return timestamp
    }
  }

  // Get reason explanation based on the reason code
  const getReasonExplanation = (reason: string) => {
    switch (reason) {
      case "Violation of community guidelines":
        return "You have not followed the rules or guidelines set for this cause."
      case "Inactivity":
        return "You have not been actively involved or responsive in the cause activities."
      case "Inappropriate behavior":
        return "You displayed disrespectful or disruptive behavior towards others."
      case "Duplicate or incorrect registration":
        return "You registered multiple times or provided invalid details."
      default:
        return reason
    }
  }

  // Ensure the modal properly updates the user's registered_opportunities when closed
  const handleDismiss = () => {
    // Make sure the notification is marked as seen
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Removed from Cause</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.causeName}>{removalData.causeName}</Text>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Reason for Removal:</Text>
              <Text style={styles.reasonText}>{removalData.reason}</Text>
              <Text style={styles.explanationText}>{getReasonExplanation(removalData.reason)}</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Removed on:</Text>
              <Text style={styles.infoText}>{formatDate(removalData.timestamp)}</Text>
            </View>

            {removalData.organizationName && (
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Organization:</Text>
                <Text style={styles.infoText}>{removalData.organizationName}</Text>
              </View>
            )}

            <Text style={styles.messageText}>
              If you believe this was a mistake or would like to discuss this further, please contact the organizer.
            </Text>

            <View style={styles.buttonContainer}>
              {/* Update the dismiss button to use this handler */}
              <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
                <Text style={styles.dismissButtonText}>Dismiss</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactButton} onPress={handleContactOrganizer}>
                <Mail size={16} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.contactButtonText}>Contact Organizer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#FF4757",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
  },
  content: {
    padding: 20,
  },
  causeName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  infoSection: {
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 5,
  },
  infoText: {
    fontSize: 16,
  },
  reasonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF4757",
    marginBottom: 5,
  },
  explanationText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  messageText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dismissButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ddd",
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  dismissButtonText: {
    color: "#666",
    fontWeight: "bold",
  },
  contactButton: {
    backgroundColor: "#15B2BF",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  contactButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  buttonIcon: {
    marginRight: 5,
  },
})

export default RemovalNotificationModal

