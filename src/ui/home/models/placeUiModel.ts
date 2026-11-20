import { placeSubtitle, type Place } from '../../../domain/models/place';

/**
 * A place as the screen shows it: in a search result, in the search bar, as
 * the forecast's heading and as the pin on the map.
 */
export interface PlaceUiModel {
  /** "Asheville". */
  readonly title: string;
  /** "North Carolina, United States", or empty when nothing more is known. */
  readonly subtitle: string;
  /** Where the pin goes. */
  readonly latitude: number;
  readonly longitude: number;
}

export function placeUiModelFrom(place: Place): PlaceUiModel {
  return {
    title: place.name,
    subtitle: placeSubtitle(place),
    latitude: place.latitude,
    longitude: place.longitude,
  };
}
