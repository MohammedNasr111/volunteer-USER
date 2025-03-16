import { Stack } from "expo-router"
import { LogBox } from "react-native"
import "./firebase/config" // Updated path to Firebase config inside app folder

// Ignore specific warnings that might come from dependencies
LogBox.ignoreLogs(["Warning: Failed prop type", "AsyncStorage has been extracted"])

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="signup" />
    </Stack>
  )
}

