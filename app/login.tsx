"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native"
import { Link, useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { X, ArrowLeft } from "lucide-react-native"
import { useFonts } from "expo-font"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "./firebase/config"

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Load the required fonts
  const [fontsLoaded] = useFonts({
    "AbhayaLibre-ExtraBold": require("../assets/fonts/AbhayaLibre-ExtraBold.ttf"),
  })

  if (!fontsLoaded) {
    return null // Return null while fonts are loading
  }

  const clearEmail = () => setEmail("")
  const clearPassword = () => setPassword("")

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password")
      return
    }

    try {
      setLoading(true)
      setError("")
      await signInWithEmailAndPassword(auth, email, password)
      router.replace("/home")
    } catch (error) {
      setError("Invalid email or password")
      console.error("Login error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={24} color="#000" />
      </TouchableOpacity>

      {/* Login form */}
      <Text style={styles.title}>Enter Login Details</Text>

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
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>Don't have an account? </Text>
        <Link href="/signup" asChild>
          <TouchableOpacity>
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
        <Text style={styles.loginButtonText}>Login</Text>
      </TouchableOpacity>
    </View>
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
  errorText: {
    color: "red",
    marginBottom: 10,
  },
  signupContainer: {
    flexDirection: "row",
    marginTop: 10,
  },
  signupText: {
    color: "#000",
  },
  signupLink: {
    color: "#0066CC",
    fontWeight: "bold",
  },
  loginButton: {
    backgroundColor: "#000",
    borderRadius: 30,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 20,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
})

