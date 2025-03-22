import { View, Text, StyleSheet, TouchableOpacity, Image, type ImageSourcePropType } from "react-native"

export interface Location {
  id: string
  name: string
  image: ImageSourcePropType
  count: string
}

type LocationCardProps = {
  location: Location
  onPress: () => void
}

export default function LocationCard({ location, onPress }: LocationCardProps) {
  // Handle missing images
  const locationImage = location.image || require("../assets/images/placeholder.png")

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      <Image source={locationImage} style={styles.image} />
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Text style={styles.name}>{location.name}</Text>
        <Text style={styles.count}>{location.count}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 150,
    height: 100,
    borderRadius: 10,
    marginRight: 15,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  content: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
  },
  name: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  count: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.9,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
})

