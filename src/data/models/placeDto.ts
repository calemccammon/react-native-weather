import type { Place } from '../../domain/models/place';
import { isNumber, isString, orNull, readObject, readValue } from './jsonReading';

/** One entry of the geocoding response's `results`, as Open-Meteo sends it. */
export interface PlaceDto {
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  /** First-level administrative area: a state, province or similar. */
  readonly admin1?: string | null;
  readonly country?: string | null;
}

/** Throws a `FormatError` if `json` is not shaped like a place. */
export function placeDtoFromJson(json: unknown): PlaceDto {
  const object = readObject(json, 'place');
  return {
    name: readValue(object, 'name', isString),
    latitude: readValue(object, 'latitude', isNumber),
    longitude: readValue(object, 'longitude', isNumber),
    admin1: readValue(object, 'admin1', orNull(isString)),
    country: readValue(object, 'country', orNull(isString)),
  };
}

export function placeDtoToDomain(dto: PlaceDto): Place {
  return {
    name: dto.name,
    latitude: dto.latitude,
    longitude: dto.longitude,
    ...(typeof dto.admin1 === 'string' ? { region: dto.admin1 } : {}),
    ...(typeof dto.country === 'string' ? { country: dto.country } : {}),
  };
}
