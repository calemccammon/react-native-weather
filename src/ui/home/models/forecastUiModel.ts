import type { TFunction } from 'i18next';

import {
  isToday,
  type CurrentConditions,
  type DailyForecast,
  type Forecast,
} from '../../../domain/models/forecast';
import type { Units } from '../../../domain/models/units';
import type { IconName } from '../../core/icons';
import { conditionIcon, conditionLabel } from '../../core/weatherConditionUi';

/** The words to use and the language they are in, such as "en". */
export interface Wording {
  readonly t: TFunction;
  readonly language: string;
}

/**
 * The forecast as the screen shows it: every value already rounded, worded
 * and laid out, so the components only place it.
 */
export interface ForecastUiModel {
  readonly current: CurrentUiModel;
  readonly days: readonly DayUiModel[];
}

/** The "right now" block at the top of the forecast. */
export interface CurrentUiModel {
  readonly icon: IconName;
  /**
   * "34°F". The one place the scale is spelled out; the rest of the forecast
   * is in the same one.
   */
  readonly temperature: string;
  /** "Overcast". */
  readonly condition: string;
  /** "Feels like 28°". */
  readonly feelsLike: string;
  /** "Wind 2 mph". */
  readonly wind: string;
  /** The whole block as one sentence for a screen reader. */
  readonly accessibilityLabel: string;
}

/** One row of the week. */
export interface DayUiModel {
  /** The row's identity in the list: its date. */
  readonly key: string;
  /**
   * "Today" for the day the forecast was made on, otherwise a short weekday:
   * "Sat".
   */
  readonly dayLabel: string;
  readonly icon: IconName;
  /** "47%", or empty when there is no chance worth showing. */
  readonly chance: string;
  /** "30°". */
  readonly low: string;
  /** "68°". */
  readonly high: string;
  /**
   * Where this day's low and high fall within the week's range, each from 0
   * (the week's lowest) to 1 (its highest).
   */
  readonly barStart: number;
  readonly barEnd: number;
  /** The whole row as one sentence for a screen reader. */
  readonly accessibilityLabel: string;
}

/** Translates a domain forecast for display in `units`, worded by `wording`. */
export function forecastUiModelFrom(
  forecast: Forecast,
  units: Units,
  wording: Wording,
): ForecastUiModel {
  const { days } = forecast;
  // The whole week's range, so each day's bar shows where it sits in it.
  const weekLow = days.length === 0 ? 0 : Math.min(...days.map((day) => day.low));
  const weekHigh = days.length === 0 ? 0 : Math.max(...days.map((day) => day.high));

  return {
    current: currentUiModelFrom(forecast.current, units, wording),
    days: days.map((day) =>
      dayUiModelFrom(day, { isToday: isToday(forecast, day), weekLow, weekHigh }, wording),
    ),
  };
}

export function currentUiModelFrom(
  current: CurrentConditions,
  units: Units,
  { t }: Wording,
): CurrentUiModel {
  const degrees = Math.round(current.temperature);
  const feelsLike = Math.round(current.feelsLike);
  const wind = Math.round(current.windSpeed);
  const metric = units === 'metric';
  const speed = metric ? t('speed.kmh', { speed: wind }) : t('speed.mph', { speed: wind });
  const condition = conditionLabel(current.condition, t);

  return {
    icon: conditionIcon(current.condition, current.isDay),
    temperature: metric
      ? t('temperature.celsius', { degrees })
      : t('temperature.fahrenheit', { degrees }),
    condition,
    feelsLike: t('temperature.feelsLike', { degrees: feelsLike }),
    wind: t('wind', { speed }),
    accessibilityLabel: t('semantics.current', {
      condition,
      temperature: metric
        ? t('temperature.spokenCelsius', { degrees })
        : t('temperature.spokenFahrenheit', { degrees }),
      feelsLike,
      wind: speed,
    }),
  };
}

export function dayUiModelFrom(
  day: DailyForecast,
  week: { isToday: boolean; weekLow: number; weekHigh: number },
  { t, language }: Wording,
): DayUiModel {
  const low = Math.round(day.low);
  const high = Math.round(day.high);
  const percent = day.precipitationChance ?? 0;
  const span = week.weekHigh - week.weekLow;
  const condition = conditionLabel(day.condition, t);
  const dayName = week.isToday ? t('today') : weekday(day.date, language, 'long');
  const spoken = { day: dayName, condition, low, high };

  return {
    key: day.date,
    dayLabel: week.isToday ? t('today') : weekday(day.date, language, 'short'),
    icon: conditionIcon(day.condition),
    chance: percent > 0 ? t('precipitationChance', { percent }) : '',
    low: t('temperature.plain', { degrees: low }),
    high: t('temperature.plain', { degrees: high }),
    // A week with one temperature throughout fills the whole bar.
    barStart: span <= 0 ? 0 : (day.low - week.weekLow) / span,
    barEnd: span <= 0 ? 1 : (day.high - week.weekLow) / span,
    accessibilityLabel:
      percent > 0
        ? t('semantics.dayWithChance', { ...spoken, percent })
        : t('semantics.day', spoken),
  };
}

/**
 * The weekday of an ISO date such as `2026-11-21`, in `language`. The date is
 * a calendar day with no timezone, so it is read and formatted in UTC and
 * the device's own timezone cannot shift it.
 */
function weekday(date: string, language: string, length: 'short' | 'long'): string {
  return new Intl.DateTimeFormat(language, { weekday: length, timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
