import type { TFunction } from 'i18next';

import { WeatherError, type WeatherFailure } from '../../domain/repositories/weatherRepository';

/** What to tell the user about each kind of failure. */
export function failureMessage(failure: WeatherFailure, t: TFunction): string {
  return t(`failure.${failure}`);
}

/**
 * The message for whatever was thrown: a `WeatherError`'s own, or a general
 * one for anything unexpected.
 */
export function messageForError(error: unknown, t: TFunction): string {
  return error instanceof WeatherError ? failureMessage(error.failure, t) : t('failure.unexpected');
}
