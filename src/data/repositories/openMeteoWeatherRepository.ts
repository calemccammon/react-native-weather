import type { Forecast } from '../../domain/models/forecast';
import type { Place } from '../../domain/models/place';
import type { Units } from '../../domain/models/units';
import { WeatherError, type WeatherRepository } from '../../domain/repositories/weatherRepository';
import { forecastDtoFromJson, forecastDtoToDomain } from '../models/forecastDto';
import {
  FormatError,
  isAnything,
  readList,
  readObject,
  type JsonObject,
} from '../models/jsonReading';
import { placeDtoFromJson, placeDtoToDomain } from '../models/placeDto';

/** The part of `fetch` this repository uses, so a test can stand in for it. */
export type Fetch = (
  url: string,
  init: { signal: AbortSignal },
) => Promise<{ status: number; text(): Promise<string> }>;

export const defaultTimeoutMs = 15_000;

const geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';
const forecastUrl = 'https://api.open-meteo.com/v1/forecast';

/**
 * Places and forecasts from Open-Meteo. No API key is needed.
 *
 * Asks the service, reads its answers into the wire-shaped models in
 * `data/models`, and hands back domain models. Every way this can go wrong
 * leaves as a `WeatherError`.
 *
 * Docs: https://open-meteo.com/en/docs and
 * https://open-meteo.com/en/docs/geocoding-api
 */
export class OpenMeteoWeatherRepository implements WeatherRepository {
  constructor(
    private readonly fetch: Fetch,
    /** How long to wait for an answer before giving up. */
    private readonly timeoutMs: number = defaultTimeoutMs,
  ) {}

  async searchPlaces(query: string): Promise<Place[]> {
    const body = await this.get(geocodingUrl, {
      name: query,
      count: '8',
      language: 'en',
      format: 'json',
    });
    return read(() => {
      // With no matches the `results` key is missing altogether.
      if (body.results === null || body.results === undefined) return [];
      return readList(body.results, 'results', isAnything).map((result) =>
        placeDtoToDomain(placeDtoFromJson(result)),
      );
    });
  }

  async forecast(request: {
    latitude: number;
    longitude: number;
    units: Units;
  }): Promise<Forecast> {
    const metric = request.units === 'metric';
    const body = await this.get(forecastUrl, {
      latitude: String(request.latitude),
      longitude: String(request.longitude),
      current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      forecast_days: '7',
      timezone: 'auto',
      temperature_unit: metric ? 'celsius' : 'fahrenheit',
      wind_speed_unit: metric ? 'kmh' : 'mph',
    });
    return read(() => forecastDtoToDomain(forecastDtoFromJson(body)));
  }

  private async get(url: string, query: Record<string, string>): Promise<JsonObject> {
    const abort = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      abort.abort();
    }, this.timeoutMs);

    let status: number;
    let text: string;
    try {
      const response = await this.fetch(`${url}?${new URLSearchParams(query)}`, {
        signal: abort.signal,
      });
      status = response.status;
      text = await response.text();
    } catch (error) {
      if (timedOut) throw new WeatherError('timeout');
      // A dropped socket, a failed TLS handshake, a refused connection.
      throw new WeatherError('noConnection', String(error));
    } finally {
      clearTimeout(timer);
    }

    let body: JsonObject;
    try {
      body = readObject(JSON.parse(text), 'response');
    } catch (error) {
      throw new WeatherError('badResponse', String(error));
    }

    // Bad input comes back as HTTP 400 with {"error": true, "reason": "..."}.
    if (status !== 200 || body.error === true) {
      throw new WeatherError(
        'rejected',
        typeof body.reason === 'string' ? body.reason : `HTTP ${status}`,
      );
    }
    return body;
  }
}

/** Runs `parse`, reporting a response of the wrong shape as a bad response. */
function read<T>(parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    if (error instanceof FormatError) throw new WeatherError('badResponse', error.message);
    throw error;
  }
}
