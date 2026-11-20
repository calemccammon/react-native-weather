import type { Place } from '../models/place';
import type { WeatherRepository } from '../repositories/weatherRepository';

/**
 * A query shorter than this is not worth sending: one letter matches nothing
 * useful.
 */
export const minQueryLength = 2;

/** Whether `query` is long enough to search for, spaces around it aside. */
export function isSearchable(query: string): boolean {
  return query.trim().length >= minQueryLength;
}

/** Finds places by name. */
export class SearchPlaces {
  constructor(private readonly repository: WeatherRepository) {}

  /**
   * Places matching `query`, best match first. Empty, without asking the
   * repository, when the query is too short.
   */
  async execute(query: string): Promise<Place[]> {
    if (!isSearchable(query)) return [];
    return this.repository.searchPlaces(query.trim());
  }
}
