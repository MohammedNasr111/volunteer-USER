import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native"
import { Mail, Phone } from "lucide-react-native"

const NGOFooter = () => {
  const handleEmailPress = () => {
    Linking.openURL("mailto:volunteer&connect@gmail.com")
  }

  const handlePhonePress = () => {
    Linking.openURL("tel:+60198712341")
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Are you an NGO?</Text>
        <Text style={styles.description}>
          Interested in creating a cause for volunteers? Don't hesitate to reach out to us for more information.
        </Text>

        <View style={styles.contactContainer}>
          <TouchableOpacity style={styles.contactItem} onPress={handleEmailPress}>
            <Mail size={20} color="#fff" style={styles.icon} />
            <Text style={styles.contactText}>volunteer&connect@gmail.com</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactItem} onPress={handlePhonePress}>
            <Phone size={20} color="#fff" style={styles.icon} />
            <Text style={styles.contactText}>(+60) 19-871-2341</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#333",
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 12,
    marginHorizontal: 20,
    overflow: "hidden",
  },
  content: {
    padding: 20,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    fontFamily: "AbhayaLibre-ExtraBold",
  },
  description: {
    color: "#ddd",
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 20,
  },
  contactContainer: {
    marginTop: 5,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  icon: {
    marginRight: 10,
  },
  contactText: {
    color: "#fff",
    fontSize: 14,
  },
})

export default NGOFooter

