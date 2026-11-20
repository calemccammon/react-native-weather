/** How much of each edge of the map something else is covering, in points. */
export interface MapInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface WeatherMapProps {
  /** Where the pin goes, or null for no pin. */
  readonly pin: { readonly latitude: number; readonly longitude: number } | null;
  /**
   * The parts of the map the search bar and forecast cover. The pin is put in
   * the middle of what is left.
   */
  readonly covered: MapInsets;
  readonly dark: boolean;
  readonly pinColor: string;
  /** Screen-reader names for the map and its pin. */
  readonly accessibilityLabel: string;
  readonly pinAccessibilityLabel: string;
  /** A press-and-hold on the map, at the point under it. */
  readonly onLongPress: (latitude: number, longitude: number) => void;
}

/** OpenFreeMap's hosted styles: free, no key, and no request limit. */
export const mapStyleUrl = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

export const mapView = {
  initialCenter: { latitude: 25, longitude: 0 },
  initialZoom: 1.5,
  minZoom: 1,
  maxZoom: 18,
  /** How far in the map goes when a place is chosen from further out. */
  placeZoom: 10,
  moveDurationMs: 600,
  pinSize: 48,
} as const;
