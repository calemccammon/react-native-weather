import type { DailyForecast, Forecast } from '../../domain/models/forecast';
import {
  FormatError,
  isNumber,
  isString,
  orNull,
  readList,
  readObject,
  readValue,
  type JsonObject,
} from './jsonReading';
import { weatherConditionFromWmo } from './wmoCode';

/**
 * The forecast response as Open-Meteo sends it: one `current` object and a
 * `daily` object of parallel columns.
 */
export interface ForecastDto {
  readonly current: CurrentDto;
  readonly daily: DailyDto;
}

/** The response's `current` object. */
export interface CurrentDto {
  /** ISO date and time, local to the place: `2026-11-18T09:00`. */
  readonly time: string;
  readonly temperature: number;
  readonly apparentTemperature: number;
  readonly weatherCode: number;
  readonly windSpeed: number;
  /** 1 in daylight, 0 at night. */
  readonly isDay: number;
}

type Column = readonly (number | null | undefined)[];

/**
 * The response's `daily` object: a list of dates and one list per variable,
 * all the same length. A value the weather model lacks is null.
 */
export interface DailyDto {
  /** ISO dates, local to the place: `2026-11-18`. */
  readonly time: readonly string[];
  readonly weatherCode: Column;
  readonly temperatureMax: Column;
  readonly temperatureMin: Column;
  readonly precipitationProbabilityMax?: Column;
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const isoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Throws a `FormatError` if `json` is not shaped like a forecast. */
export function forecastDtoFromJson(json: JsonObject): ForecastDto {
  return {
    current: currentDtoFromJson(readObject(json.current, 'current')),
    daily: dailyDtoFromJson(readObject(json.daily, 'daily')),
  };
}

function currentDtoFromJson(json: JsonObject): CurrentDto {
  const time = readValue(json, 'time', isString);
  if (!isoDateTime.test(time)) throw new FormatError('current.time is not an ISO date and time');
  return {
    time,
    temperature: readValue(json, 'temperature_2m', isNumber),
    apparentTemperature: readValue(json, 'apparent_temperature', isNumber),
    weatherCode: readValue(json, 'weather_code', isNumber),
    windSpeed: readValue(json, 'wind_speed_10m', isNumber),
    isDay: readValue(json, 'is_day', isNumber),
  };
}

function dailyDtoFromJson(json: JsonObject): DailyDto {
  const column = (key: string) => readList(json[key], key, orNull(isNumber));
  const chances = json.precipitation_probability_max;

  const daily: DailyDto = {
    time: readList(json.time, 'daily.time', isString),
    weatherCode: column('weather_code'),
    temperatureMax: column('temperature_2m_max'),
    temperatureMin: column('temperature_2m_min'),
    ...(chances === null || chances === undefined
      ? {}
      : { precipitationProbabilityMax: column('precipitation_probability_max') }),
  };

  if (!daily.time.every((date) => isoDate.test(date))) {
    throw new FormatError('daily.time holds something that is not an ISO date');
  }
  const columns = [
    daily.weatherCode,
    daily.temperatureMax,
    daily.temperatureMin,
    ...(daily.precipitationProbabilityMax ? [daily.precipitationProbabilityMax] : []),
  ];
  if (columns.some((each) => each.length !== daily.time.length)) {
    throw new FormatError('daily columns differ in length');
  }
  return daily;
}

/**
 * Translates the wire shape into what the app works with: codes become
 * conditions, columns become one entry per day, and a day the weather model
 * has no temperatures for is left out.
 */
export function forecastDtoToDomain({ current, daily }: ForecastDto): Forecast {
  const days: DailyForecast[] = [];
  daily.time.forEach((date, i) => {
    const high = daily.temperatureMax[i];
    const low = daily.temperatureMin[i];
    if (typeof high !== 'number' || typeof low !== 'number') return;

    const chance = daily.precipitationProbabilityMax?.[i];
    days.push({
      date,
      high,
      low,
      condition: weatherConditionFromWmo(daily.weatherCode[i]),
      ...(typeof chance === 'number' ? { precipitationChance: Math.round(chance) } : {}),
    });
  });

  return {
    current: {
      observedAt: current.time,
      temperature: current.temperature,
      feelsLike: current.apparentTemperature,
      windSpeed: current.windSpeed,
      condition: weatherConditionFromWmo(current.weatherCode),
      isDay: current.isDay === 1,
    },
    days,
  };
}
