import { createInstance, type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';

/** Every string the user sees, by language. A second language is one more file. */
export const resources = { en: { translation: en } } as const;

export const fallbackLanguage = 'en';

/**
 * The app's wording, in the first of the device's languages (`languageTags`,
 * such as "en-GB") that the app is worded in, or English.
 */
export function createI18n(languageTags: readonly string[] = []): i18n {
  const supported = Object.keys(resources);
  const language =
    languageTags.map((tag) => tag.split('-')[0] ?? '').find((each) => supported.includes(each)) ??
    fallbackLanguage;

  const instance = createInstance();
  // With the resources given up front, init finishes before it returns.
  void instance.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: fallbackLanguage,
    // React escapes what it renders; escaping here too would show "&amp;".
    interpolation: { escapeValue: false },
  });
  return instance;
}
