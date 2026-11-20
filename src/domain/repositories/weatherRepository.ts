import type { Forecast } from '../models/forecast';
import type { Place } from '../models/place';
import type { Units } from '../models/units';

/**
 * Where the app gets places and forecasts from.
 *
 * The domain only says what it needs. Which service answers, and what that
 * service's responses look like, is the data layer's business.
 */
export interface WeatherRepository {
  /** Places whose name matches `query`, best match first. */
  searchPlaces(query: string): Promise<Place[]>;

  /** Current conditions and the days ahead at a point. */
  forecast(request: { latitude: number; longitude: number; units: Units }): Promise<Forecast>;
}

/**
 * The ways getting weather can fail, as far as the app cares.
 *
 * - `timeout`: no answer in time.
 * - `noConnection`: the service could not be reached at all.
 * - `badResponse`: an answer came, but not one the app understands.
 * - `rejected`: the service refused the request.
 * - `invalidPlace`: the place asked about is not a point on the globe.
 */
export const weatherFailures = [
  'timeout',
  'noConnection',
  'badResponse',
  'rejected',
  'invalidPlace',
] as const;

export type WeatherFailure = (typeof weatherFailures)[number];

/**
 * Thrown when a place search or a forecast cannot be had.
 *
 * It says what kind of failure it was; wording that for the user is the UI's
 * job.
 */
export class WeatherError extends Error {
  constructor(
    readonly failure: WeatherFailure,
    /** Anything more the source said, for logs. Not for showing to the user. */
    readonly detail?: string,
  ) {
    super(detail === undefined ? failure : `${failure}: ${detail}`);
    this.name = 'WeatherError';
  }
}
