import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

import { AsyncStorageSettingsRepository } from '../data/repositories/asyncStorageSettingsRepository';
import { OpenMeteoWeatherRepository } from '../data/repositories/openMeteoWeatherRepository';
import { createI18n } from '../l10n/i18n';
import { buildContainer, type AppContainer } from './buildContainer';

/**
 * The one place that knows which implementation stands behind each domain
 * interface. Opening the settings store takes a moment, hence the promise.
 */
export async function createContainer(): Promise<AppContainer> {
  const locales = getLocales();

  return buildContainer({
    weatherRepository: new OpenMeteoWeatherRepository((url, init) => fetch(url, init)),
    settingsRepository: await AsyncStorageSettingsRepository.open(AsyncStorage),
    i18n: createI18n(locales.map((locale) => locale.languageTag)),
    deviceCountry: locales[0]?.regionCode,
  });
}
