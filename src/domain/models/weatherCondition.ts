/** The kinds of weather the app tells apart. */
export const weatherConditions = [
  'clear',
  'mostlyClear',
  'partlyCloudy',
  'overcast',
  'fog',
  'drizzle',
  'freezingDrizzle',
  'rain',
  'freezingRain',
  'snow',
  'rainShowers',
  'snowShowers',
  'thunderstorm',
  'unknown',
] as const;

export type WeatherCondition = (typeof weatherConditions)[number];
