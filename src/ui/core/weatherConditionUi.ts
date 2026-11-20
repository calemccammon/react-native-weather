import type { TFunction } from 'i18next';

import type { WeatherCondition } from '../../domain/models/weatherCondition';
import type { IconName } from './icons';

/** How a weather condition is worded. */
export function conditionLabel(condition: WeatherCondition, t: TFunction): string {
  return t(`condition.${condition}`);
}

const icons: Readonly<Record<WeatherCondition, IconName | { day: IconName; night: IconName }>> = {
  clear: { day: 'weather-sunny', night: 'weather-night' },
  mostlyClear: { day: 'weather-sunny', night: 'weather-night' },
  partlyCloudy: { day: 'weather-partly-cloudy', night: 'weather-night-partly-cloudy' },
  overcast: 'weather-cloudy',
  fog: 'weather-fog',
  drizzle: 'weather-rainy',
  freezingDrizzle: 'weather-snowy-rainy',
  rain: 'weather-pouring',
  freezingRain: 'weather-snowy-rainy',
  snow: 'weather-snowy',
  rainShowers: 'weather-partly-rainy',
  snowShowers: 'weather-partly-snowy',
  thunderstorm: 'weather-lightning',
  unknown: 'help-circle-outline',
};

/** How a weather condition is drawn. Clear and partly cloudy skies differ at night. */
export function conditionIcon(condition: WeatherCondition, isDay = true): IconName {
  const icon = icons[condition];
  if (typeof icon === 'string') return icon;
  return isDay ? icon.day : icon.night;
}
