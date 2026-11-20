/** The two systems of units the app can show a forecast in. */
export type Units = 'metric' | 'imperial';

export const allUnits: readonly Units[] = ['metric', 'imperial'];

/** The United States, Liberia and Myanmar use Fahrenheit and miles. */
export function unitsForCountry(countryCode: string | null | undefined): Units {
  return countryCode !== null &&
    countryCode !== undefined &&
    ['US', 'LR', 'MM'].includes(countryCode)
    ? 'imperial'
    : 'metric';
}
