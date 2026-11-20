import type { WeatherCondition } from '../../domain/models/weatherCondition';

const byCode: Readonly<Record<number, WeatherCondition>> = {
  0: 'clear',
  1: 'mostlyClear',
  2: 'partlyCloudy',
  3: 'overcast',
  45: 'fog',
  48: 'fog',
  51: 'drizzle',
  53: 'drizzle',
  55: 'drizzle',
  56: 'freezingDrizzle',
  57: 'freezingDrizzle',
  61: 'rain',
  63: 'rain',
  65: 'rain',
  66: 'freezingRain',
  67: 'freezingRain',
  71: 'snow',
  73: 'snow',
  75: 'snow',
  77: 'snow',
  80: 'rainShowers',
  81: 'rainShowers',
  82: 'rainShowers',
  85: 'snowShowers',
  86: 'snowShowers',
  95: 'thunderstorm',
  96: 'thunderstorm',
  99: 'thunderstorm',
};

/**
 * What a WMO weather code, as Open-Meteo reports it, means.
 *
 * The table is on https://open-meteo.com/en/docs under "WMO Weather
 * interpretation codes". A code outside it is `unknown`.
 */
export function weatherConditionFromWmo(code: number | null | undefined): WeatherCondition {
  if (code === null || code === undefined) return 'unknown';
  return byCode[code] ?? 'unknown';
}
