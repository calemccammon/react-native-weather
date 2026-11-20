/** A point on the map with a name to show for it. */
export interface Place {
  readonly name: string;
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
  const longitude = normalizeLongitude(rawLongitude);
  const lat = `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? 'N' : 'S'}`;
  const lon = `${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? 'E' : 'W'}`;
  return { name: `${lat}, ${lon}`, latitude, longitude };
}

/** "North Carolina, United States", or whichever parts are known. */
export function placeSubtitle(place: Place): string {
  return [place.region, place.country].filter((part) => part !== undefined).join(', ');
}
