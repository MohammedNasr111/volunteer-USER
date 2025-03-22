import { View, Text, StyleSheet, TouchableOpacity, Image, type ImageSourcePropType } from "react-native"

export interface Cause {
  id: string
  name: string
  image: ImageSourcePropType
}

type CauseCardProps = {
  cause: Cause
  onPress: () => void
}

export default function CauseCard({ cause, onPress }: CauseCardProps) {
  // Handle missing images
  const causeImage = cause.image || require("../assets/images/placeholder.png")

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      <Image source={causeImage} style={styles.image} />
      <View style={styles.overlay} />
      <Text style={styles.name}>{cause.name}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
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
  name: {
    position: "absolute",
    bottom: 10,
    left: 10,
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
})

