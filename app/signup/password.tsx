"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { X, ArrowLeft, Check } from "lucide-react-native"
import { useFonts } from "expo-font"
import { signupUser } from "../firebase/users"

export default function PasswordScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { firstName, lastName, email, phoneNumber } = params

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Password validation states
  const [hasUppercase, setHasUppercase] = useState(false)
  const [hasLowercase, setHasLowercase] = useState(false)
  const [hasSpecial, setHasSpecial] = useState(false)
  const [hasNumber, setHasNumber] = useState(false)
  const [hasMinLength, setHasMinLength] = useState(false)
  const [passwordsMatch, setPasswordsMatch] = useState(false)

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "AbhayaLibre-ExtraBold": require("../../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
  })

  useEffect(() => {
    // Validate password
    setHasUppercase(/[A-Z]/.test(password))
    setHasLowercase(/[a-z]/.test(password))
    setHasSpecial(/[!@#$%^&*(),.?":{}|<>]/.test(password))
    setHasNumber(/[0-9]/.test(password))
    setHasMinLength(password.length >= 8)

    // Check if passwords match
    setPasswordsMatch(password === confirmPassword && password !== "")
  }, [password, confirmPassword])

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  const clearPassword = () => setPassword("")
  const clearConfirmPassword = () => setConfirmPassword("")

  const isPasswordValid = hasUppercase && hasLowercase && hasSpecial && hasNumber && hasMinLength
  const isFormValid = isPasswordValid && passwordsMatch

  const handleSignUp = async () => {
    if (!isFormValid) return

    try {
      setLoading(true)
      setError("")

      // Use the enhanced signup function
      await signupUser(email as string, password, {
        firstName,
        lastName,
        phoneNumber,
        onboarding_completed: false,
      })

      // Navigate to preferences screen
      router.push({
        pathname: "/preferences" as any,
        params: { firstName },
      })
    } catch (error: any) {
      // Handle specific error codes
      if (error.code === "auth/email-already-in-use") {
        setError("This email already exists. Please try a different email.")
      } else if (error.code === "auth/invalid-email") {
        setError("Please enter a valid email address.")
      } else if (error.code === "auth/weak-password") {
        setError("Password is too weak. Please choose a stronger password.")
      } else {
        setError("There was an error creating your account. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="dark" />

      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={24} color="#000" />
      </TouchableOpacity>

      {/* Password form */}
      <Text style={styles.title}>Create a Password</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
          />
          {password.length > 0 && (
            <TouchableOpacity onPress={clearPassword} style={styles.clearButton}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.helperText}>(minimum 8 characters)*</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Confirm Password</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry
          />
          {confirmPassword.length > 0 && (
            <TouchableOpacity onPress={clearConfirmPassword} style={styles.clearButton}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.helperText}>(minimum 8 characters)*</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.requirementsContainer}>
        <View style={styles.requirementRow}>
          <View style={[styles.checkIcon, hasUppercase && styles.checkIconActive]}>
            {hasUppercase && <Check size={14} color="#fff" />}
          </View>
          <Text style={styles.requirementText}>Require uppercase character</Text>
        </View>
        <View style={styles.requirementRow}>
          <View style={[styles.checkIcon, hasLowercase && styles.checkIconActive]}>
            {hasLowercase && <Check size={14} color="#fff" />}
          </View>
          <Text style={styles.requirementText}>Require lowercase character</Text>
        </View>
        <View style={styles.requirementRow}>
          <View style={[styles.checkIcon, hasSpecial && styles.checkIconActive]}>
            {hasSpecial && <Check size={14} color="#fff" />}
          </View>
          <Text style={styles.requirementText}>Require special character</Text>
        </View>
        <View style={styles.requirementRow}>
          <View style={[styles.checkIcon, hasNumber && styles.checkIconActive]}>
            {hasNumber && <Check size={14} color="#fff" />}
          </View>
          <Text style={styles.requirementText}>Require numeric character</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.signupButton, isFormValid ? styles.signupButtonActive : {}]}
        onPress={handleSignUp}
        disabled={!isFormValid || loading}
      >
        <Text style={[styles.signupButtonText, isFormValid ? styles.signupButtonTextActive : {}]}>Sign Up</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  backButton: {
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontFamily: "AbhayaLibre-ExtraBold",
    fontSize: 28,
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    height: 50,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 10,
  },
  clearButton: {
    padding: 10,
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  errorText: {
    color: "red",
    marginBottom: 10,
  },
  requirementsContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkIconActive: {
    backgroundColor: "green",
  },
  requirementText: {
    fontSize: 14,
    color: "#333",
  },
  signupButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 30,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 20,
  },
  signupButtonActive: {
    backgroundColor: "#000",
  },
  signupButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  signupButtonTextActive: {
    color: "#fff",
  },
})

