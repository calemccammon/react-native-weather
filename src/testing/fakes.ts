import type { DailyForecast, Forecast } from '../domain/models/forecast';
import type { Place } from '../domain/models/place';
import type { Units } from '../domain/models/units';
import type { WeatherCondition } from '../domain/models/weatherCondition';
import type { SettingsRepository } from '../domain/repositories/settingsRepository';
import type { WeatherRepository } from '../domain/repositories/weatherRepository';
import { createI18n } from '../l10n/i18n';
import type { Wording } from '../ui/home/models/forecastUiModel';

export const asheville: Place = {
  name: 'Asheville',
  latitude: 35.6,
  longitude: -82.55,
  region: 'North Carolina',
  country: 'United States',
};
export const ashford: Place = { name: 'Ashford', latitude: 51.15, longitude: 0.87 };

/** The app's English wording, for tests to compare against. */
export function englishWording(): Wording {
  const i18n = createI18n(['en']);
  return { t: i18n.t, language: i18n.language };
}

/** A week starting Friday 20 November 2026, measured that morning. */
export function sampleForecast(
  options: { days?: DailyForecast[]; isDay?: boolean; observedAt?: string } = {},
): Forecast {
  return {
    current: {
      observedAt: options.observedAt ?? '2026-11-20T09:00',
      temperature: 35.8,
      feelsLike: 31.3,
      windSpeed: 4.4,
      condition: 'clear',
      isDay: options.isDay ?? true,
    },
    days:
      options.days ??
      Array.from({ length: 7 }, (_, i) => ({
        date: `2026-11-${20 + i}`,
        low: 27 + i,
        high: 62 + i,
        condition: i === 2 ? ('rain' as const) : ('clear' as const),
        precipitationChance: i === 2 ? 80 : 0,
      })),
  };
}

export function day(
  dayOfMonth: number,
  low: number,
  high: number,
  options: { chance?: number; condition?: WeatherCondition } = {},
): DailyForecast {
  return {
    date: `2026-11-${dayOfMonth}`,
    low,
    high,
    condition: options.condition ?? 'overcast',
    ...(options.chance === undefined ? {} : { precipitationChance: options.chance }),
  };
}

/** A promise a test settles by hand. */
export class Deferred<T> {
  resolve!: (value: T) => void;
  reject!: (reason: unknown) => void;
  readonly promise = new Promise<T>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
}

/**
 * A repository whose every answer the test decides.
 *
 * Each call waits on a `Deferred` the test settles, unless a ready answer has
 * been set with `placesToReturn` or `forecastToReturn`.
 */
export class FakeWeatherRepository implements WeatherRepository {
  readonly searchQueries: string[] = [];
  readonly searches = new Map<string, Deferred<Place[]>>();
  readonly forecasts: Deferred<Forecast>[] = [];
  readonly forecastRequests: { latitude: number; longitude: number; units: Units }[] = [];

  /** When set, searches answer with this at once. */
  placesToReturn?: Place[];

  /** When set, forecasts answer with this at once. */
  forecastToReturn?: Forecast;

  /** When set, both kinds of call fail with this at once. */
  failure?: unknown;

  searchPlaces(query: string): Promise<Place[]> {
    this.searchQueries.push(query);
    if (this.failure !== undefined) return Promise.reject(this.failure);
    if (this.placesToReturn !== undefined) return Promise.resolve(this.placesToReturn);
    const deferred = new Deferred<Place[]>();
    this.searches.set(query, deferred);
    return deferred.promise;
  }

  forecast(request: { latitude: number; longitude: number; units: Units }): Promise<Forecast> {
    this.forecastRequests.push(request);
    if (this.failure !== undefined) return Promise.reject(this.failure);
    if (this.forecastToReturn !== undefined) return Promise.resolve(this.forecastToReturn);
    const deferred = new Deferred<Forecast>();
    this.forecasts.push(deferred);
    return deferred.promise;
  }
}

/** Settings held in memory, starting from `units`. */
export class FakeSettingsRepository implements SettingsRepository {
  /** Every choice saved, in order. */
  readonly saved: Units[] = [];

  /** When set, saving fails with this. */
  failure?: unknown;

  constructor(public units: Units | null = null) {}

  async saveUnits(units: Units): Promise<void> {
    if (this.failure !== undefined) throw this.failure;
    this.saved.push(units);
    this.units = units;
  }
}

/** Lets every promise that is ready to settle do so. */
export async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}
