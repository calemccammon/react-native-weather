import type { Units } from './units';
import type { WeatherCondition } from './weatherCondition';

/** The weather right now at a place. */
export interface CurrentConditions {
  /**
   * When these conditions were measured, on the place's own clock, as
   * `2026-11-20T09:00`. It says which calendar day is "today" there, whatever
   * the device's clock says.
   */
  readonly observedAt: string;
  readonly temperature: number;
  readonly feelsLike: number;
  readonly windSpeed: number;
  readonly condition: WeatherCondition;
  readonly isDay: boolean;
}

/** One day of the weekly forecast. */
export interface DailyForecast {
  /** The calendar day at the place, as `2026-11-20`. No time, no timezone. */
  readonly date: string;
  readonly low: number;
  readonly high: number;
  readonly condition: WeatherCondition;
  /** Highest chance of precipitation during the day, in percent. */
  readonly precipitationChance?: number;
}

/**
 * Current conditions and the days ahead for one place.
 *
 * A forecast is fetched and kept in metric units: degrees Celsius and
 * kilometres an hour. `inUnits` gives the same forecast in another system, so
 * changing units never needs the network.
 */
export interface Forecast {
  readonly current: CurrentConditions;
  readonly days: readonly DailyForecast[];
}

/** Whether `day` is the day the forecast's current conditions were measured on. */
export function isToday(forecast: Forecast, day: DailyForecast): boolean {
  return forecast.current.observedAt.slice(0, 10) === day.date;
}

const milesPerKilometre = 0.621371;
const fahrenheitPerCelsius = 1.8;
const freezingFahrenheit = 32;

/** The metric `forecast` with its temperatures and wind speed in `units`. */
export function inUnits(forecast: Forecast, units: Units): Forecast {
  if (units === 'metric') return forecast;
  const { current, days } = forecast;
  return {
    current: {
      ...current,
      temperature: fahrenheit(current.temperature),
      feelsLike: fahrenheit(current.feelsLike),
      windSpeed: current.windSpeed * milesPerKilometre,
    },
    days: days.map((day) => ({ ...day, low: fahrenheit(day.low), high: fahrenheit(day.high) })),
  };
}

function fahrenheit(celsius: number): number {
  return celsius * fahrenheitPerCelsius + freezingFahrenheit;
}
