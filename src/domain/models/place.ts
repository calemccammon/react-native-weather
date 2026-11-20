/** A point on the map. */
export interface Place {
  /** What the place is called. A point picked straight off the map has none. */
  readonly name?: string;
  readonly latitude: number;
  readonly longitude: number;
  /** State, province or similar. Tells two places of one name apart. */
  readonly region?: string;
  readonly country?: string;
}

/** `longitude` as the same meridian between -180 (inclusive) and 180. */
export function normalizeLongitude(longitude: number): number {
  // One already in range is left exactly as it is: the arithmetic below can
  // cost it its last decimal place.
  if (longitude >= -180 && longitude < 180) return longitude;
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

/**
 * A place picked straight off the map, which has no name.
 *
 * A map that has been dragged round the world more than once reports
 * longitudes past 180 degrees, so the longitude is brought back into range.
 */
export function placeFromCoordinates(latitude: number, rawLongitude: number): Place {
  return { latitude, longitude: normalizeLongitude(rawLongitude) };
}
