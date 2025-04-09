/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c // Distance in km
    return distance
  }
  
  /**
   * Convert degrees to radians
   * @param deg Degrees
   * @returns Radians
   */
  export const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180)
  }
  
  /**
   * Format distance for display
   * @param distance Distance in kilometers
   * @returns Formatted distance string
   */
  export const formatDistance = (distance: number | null): string => {
    if (distance === null) return "Unknown distance"
  
    if (distance < 1) {
      // Convert to meters for distances less than 1 km
      const meters = Math.round(distance * 1000)
      return `${meters} m away`
    }
  
    // Round to 1 decimal place for distances in kilometers
    return `${distance.toFixed(1)} km away`
  }
  
  /**
   * Check if a location is within a specified radius
   * @param userLat User's latitude
   * @param userLng User's longitude
   * @param targetLat Target latitude
   * @param targetLng Target longitude
   * @param radiusKm Radius in kilometers
   * @returns Boolean indicating if target is within radius
   */
  export const isWithinRadius = (
    userLat: number,
    userLng: number,
    targetLat: number,
    targetLng: number,
    radiusKm: number,
  ): boolean => {
    const distance = calculateDistance(userLat, userLng, targetLat, targetLng)
    return distance <= radiusKm
  }
  