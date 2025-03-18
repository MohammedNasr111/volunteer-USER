"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { X, ArrowLeft } from "lucide-react-native"
import { useFonts } from "expo-font"

export default function SignupScreen() {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("+60")

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "AbhayaLibre-ExtraBold": require("../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
  })

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  const clearFirstName = () => setFirstName("")
  const clearLastName = () => setLastName("")
  const clearEmail = () => setEmail("")
  const clearPhoneNumber = () => setPhoneNumber("+60")

  const isFormValid = firstName && lastName && email && phoneNumber.length > 3

  const handleNext = () => {
    if (isFormValid) {
      router.push({
        pathname: "/signup/password",
        params: { firstName, lastName, email, phoneNumber },
      })
    }
  }

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="dark" />

      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/login")}>
        <ArrowLeft size={24} color="#000" />
      </TouchableOpacity>

      {/* Signup form */}
      <Text style={styles.title}>Enter Account Details</Text>
      <Text style={styles.subtitle}>Let's get some basic info first!</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>First Name</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter your first name"
          />
          {firstName.length > 0 && (
            <TouchableOpacity onPress={clearFirstName} style={styles.clearButton}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Last Name</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter your last name"
          />
          {lastName.length > 0 && (
            <TouchableOpacity onPress={clearLastName} style={styles.clearButton}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email Address</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {email.length > 0 && (
            <TouchableOpacity onPress={clearEmail} style={styles.clearButton}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Phone Number</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+60"
            keyboardType="phone-pad"
          />
          {phoneNumber.length > 3 && (
            <TouchableOpacity onPress={clearPhoneNumber} style={styles.clearButton}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text style={styles.loginLink}>Log In</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.termsText}>
        By continuing you are agreeing to Volunteer&Connect's terms & conditions and privacy policy
      </Text>

      <TouchableOpacity
        style={[styles.nextButton, isFormValid ? styles.nextButtonActive : {}]}
        onPress={handleNext}
        disabled={!isFormValid}
      >
        <Text style={styles.nextButtonText}>Next</Text>
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
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
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
  loginContainer: {
    flexDirection: "row",
    marginTop: 10,
  },
  loginText: {
    color: "#000",
  },
  loginLink: {
    color: "#0066CC",
    fontWeight: "bold",
  },
  termsText: {
    marginTop: 20,
    textAlign: "center",
    color: "#666",
    fontSize: 12,
  },
  nextButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 30,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  nextButtonActive: {
    backgroundColor: "#e0e0e0",
  },
  nextButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
})

