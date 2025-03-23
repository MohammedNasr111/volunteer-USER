"use client"
import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { ArrowLeft, Edit2 } from "lucide-react-native"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { auth, db, storage } from "./firebase/config"
import { updatePassword } from "firebase/auth"
import { useFonts } from "expo-font"
import BottomNavigation from "../components/bottom-navigation"
import * as ImagePicker from "expo-image-picker"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"

export default function EditProfileScreen() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [originalEmail, setOriginalEmail] = useState("")

  // Form fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [profileImage, setProfileImage] = useState<string | null>(null)

  // Edit states
  const [editingFirstName, setEditingFirstName] = useState(false)
  const [editingLastName, setEditingLastName] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [editingPhoneNumber, setEditingPhoneNumber] = useState(false)

  // Password editing states
  const [editingPassword, setEditingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "Alata-Regular": require("../assets/fonts/Alata-Regular.ttf"),
    "AbhayaLibre-Regular": require("../assets/fonts/AbhayaLibre-Regular.ttf"),
    "AbhayaLibre-ExtraBold": require("../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
  })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = auth.currentUser?.uid
        if (!userId) {
          router.replace("/login")
          return
        }

        const userDoc = await getDoc(doc(db, "users", userId))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserData(data)
          setFirstName(data.firstName || "")
          setLastName(data.lastName || "")
          setEmail(data.email || "")
          setOriginalEmail(data.email || "")
          setPhoneNumber(data.phoneNumber || "")
          setProfileImage(data.photoURL || null)
        } else {
          console.error("User document not found")
          router.replace("/login")
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  const pickImage = async () => {
    try {
      // Request permission to access the photo library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant permission to access your photos")
        return
      }

      // Launch the image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as ImagePicker.MediaTypeOptions,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0]
        await uploadProfileImage(selectedImage.uri)
      }
    } catch (error) {
      console.error("Error picking image:", error)
      Alert.alert("Error", "Failed to pick image")
    }
  }

  const uploadProfileImage = async (uri: string) => {
    try {
      setUploadingImage(true)
      const userId = auth.currentUser?.uid

      if (!userId) {
        throw new Error("User not authenticated")
      }

      // Create a blob from the image URI
      const response = await fetch(uri)
      const blob = await response.blob()

      // Create a reference to the storage location
      const storageRef = ref(storage, `users/${userId}/profile`)

      // Upload the blob
      await uploadBytes(storageRef, blob)

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef)

      // Update the user's profile in Firestore
      await updateDoc(doc(db, "users", userId), {
        photoURL: downloadURL,
      })

      // Update local state
      setProfileImage(downloadURL)
      // Also update userData to ensure it's included when saving the profile
      setUserData((prev: any) => ({
        ...prev,
        photoURL: downloadURL,
      }))

      Alert.alert("Success", "Profile picture updated successfully")
    } catch (error) {
      console.error("Error uploading image:", error)
      Alert.alert("Error", "Failed to upload profile picture")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      const userId = auth.currentUser?.uid
      if (!userId) return

      // Validate fields
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        Alert.alert("Error", "First name, last name, and email are required")
        return
      }

      // Check if email was changed
      const emailChanged = email !== originalEmail

      // Update user document in Firestore
      await updateDoc(doc(db, "users", userId), {
        firstName,
        lastName,
        email,
        phoneNumber,
      })

      // Create updated user data to pass back to profile page
      const updatedUserData = {
        ...userData,
        firstName,
        lastName,
        email,
        phoneNumber,
        photoURL: profileImage, // Add this line to include the profile image
      }

      // Show appropriate message based on whether email was changed
      if (emailChanged) {
        Alert.alert(
          "Profile Updated",
          "Your profile has been updated. Note that your display email has changed, but you'll still need to use your original email (" +
            originalEmail +
            ") to log in.",
          [
            {
              text: "OK",
              onPress: () => {
                router.back()
                setTimeout(() => {
                  if (global.updateProfileData) {
                    global.updateProfileData(updatedUserData)
                  }
                }, 100)
              },
            },
          ],
        )
      } else {
        Alert.alert("Success", "Profile updated successfully", [
          {
            text: "OK",
            onPress: () => {
              router.back()
              setTimeout(() => {
                if (global.updateProfileData) {
                  global.updateProfileData(updatedUserData)
                }
              }, 100)
            },
          },
        ])
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      Alert.alert("Error", "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async () => {
    try {
      // Reset error
      setPasswordError("")

      // Validate passwords
      if (newPassword.length < 8) {
        setPasswordError("Password must be at least 8 characters long")
        return
      }

      if (newPassword !== confirmPassword) {
        setPasswordError("Passwords do not match")
        return
      }

      // Check for uppercase, lowercase, number, and special character
      const hasUppercase = /[A-Z]/.test(newPassword)
      const hasLowercase = /[a-z]/.test(newPassword)
      const hasNumber = /[0-9]/.test(newPassword)
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)

      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        setPasswordError("Password must include uppercase, lowercase, number, and special character")
        return
      }

      // Update password in Firebase Authentication
      const user = auth.currentUser
      if (!user) {
        setPasswordError("User not authenticated")
        return
      }

      // Remove this line:
      // const { updatePassword } = await import("firebase/auth")

      // Update the password
      await updatePassword(user, newPassword)

      // Reset form and show success message
      setNewPassword("")
      setConfirmPassword("")
      setEditingPassword(false)
      Alert.alert("Success", "Password updated successfully")
    } catch (error) {
      console.error("Error updating password:", error)
      setPasswordError("Failed to update password. You may need to re-authenticate.")
    }
  }

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#15B2BF" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Add a spacer view at the top */}
      <View style={styles.statusBarSpacer} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Profile Image */}
        <View style={styles.profileImageContainer}>
          {uploadingImage ? (
            <View style={styles.profileImage}>
              <ActivityIndicator size="large" color="#15B2BF" />
            </View>
          ) : (
            <Image
              source={profileImage ? { uri: profileImage } : require("../assets/images/placeholder.png")}
              style={styles.profileImage}
            />
          )}
          <TouchableOpacity style={styles.editImageButton} onPress={pickImage}>
            <Edit2 size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.title}>User Profile</Text>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {/* First Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>First Name</Text>
            <View style={styles.inputRow}>
              {editingFirstName ? (
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoFocus
                  onBlur={() => setEditingFirstName(false)}
                />
              ) : (
                <Text style={styles.inputValue}>{firstName}</Text>
              )}
              <TouchableOpacity style={styles.editButton} onPress={() => setEditingFirstName(true)}>
                <Text style={styles.editButtonText}>EDIT</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Last Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <View style={styles.inputRow}>
              {editingLastName ? (
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  autoFocus
                  onBlur={() => setEditingLastName(false)}
                />
              ) : (
                <Text style={styles.inputValue}>{lastName}</Text>
              )}
              <TouchableOpacity style={styles.editButton} onPress={() => setEditingLastName(true)}>
                <Text style={styles.editButtonText}>EDIT</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Email Address */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputRow}>
              {editingEmail ? (
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoFocus
                  keyboardType="email-address"
                  onBlur={() => setEditingEmail(false)}
                />
              ) : (
                <Text style={styles.inputValue}>{email}</Text>
              )}
              <TouchableOpacity style={styles.editButton} onPress={() => setEditingEmail(true)}>
                <Text style={styles.editButtonText}>EDIT</Text>
              </TouchableOpacity>
            </View>
            {editingEmail && (
              <Text style={styles.emailWarning}>
                Note: Changing your email here will only update it in your profile. You'll still need to use your
                original email to log in.
              </Text>
            )}
          </View>

          {/* Phone Number */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputRow}>
              {editingPhoneNumber ? (
                <TextInput
                  style={styles.input}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  autoFocus
                  keyboardType="phone-pad"
                  onBlur={() => setEditingPhoneNumber(false)}
                />
              ) : (
                <Text style={styles.inputValue}>{phoneNumber}</Text>
              )}
              <TouchableOpacity style={styles.editButton} onPress={() => setEditingPhoneNumber(true)}>
                <Text style={styles.editButtonText}>EDIT</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            {editingPassword ? (
              <View>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="New password"
                    secureTextEntry
                  />
                </View>
                <View style={[styles.inputRow, { marginTop: 10 }]}>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm password"
                    secureTextEntry
                  />
                </View>
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                <View style={styles.passwordButtonsContainer}>
                  <TouchableOpacity
                    style={styles.passwordButton}
                    onPress={() => {
                      setEditingPassword(false)
                      setNewPassword("")
                      setConfirmPassword("")
                      setPasswordError("")
                    }}
                  >
                    <Text style={styles.passwordButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.passwordButton, styles.savePasswordButton]}
                    onPress={handleUpdatePassword}
                  >
                    <Text style={styles.savePasswordButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>(minimum 8 characters)*</Text>
              </View>
            ) : (
              <View>
                <View style={styles.inputRow}>
                  <Text style={styles.inputValue}>********</Text>
                  <TouchableOpacity style={styles.editButton} onPress={() => setEditingPassword(true)}>
                    <Text style={styles.editButtonText}>EDIT</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>(minimum 8 characters)*</Text>
              </View>
            )}
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity style={styles.confirmButton} onPress={handleSaveProfile} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="profile" />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  statusBarSpacer: {
    height: 40,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  profileImageContainer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
    position: "relative",
  },
  profileImage: {
    width: 115,
    height: 115,
    borderRadius: 57.5,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  editImageButton: {
    position: "absolute",
    top: 5,
    right: "30%",
    backgroundColor: "#15B2BF",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  title: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 24,
    textAlign: "center",
    marginBottom: 20,
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  inputValue: {
    flex: 1,
    fontSize: 16,
  },
  editButton: {
    paddingHorizontal: 10,
  },
  editButtonText: {
    color: "#15B2BF",
    fontWeight: "bold",
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  emailWarning: {
    fontSize: 12,
    color: "#FF4757",
    marginTop: 5,
    fontStyle: "italic",
  },
  confirmButton: {
    backgroundColor: "#000",
    borderRadius: 25,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 100,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    color: "#FF4757",
    fontSize: 12,
    marginTop: 5,
  },
  passwordButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  passwordButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    width: "48%",
    alignItems: "center",
  },
  savePasswordButton: {
    backgroundColor: "#15B2BF",
    borderColor: "#15B2BF",
  },
  passwordButtonText: {
    color: "#666",
  },
  savePasswordButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
})

