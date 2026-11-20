import 'i18next';

import type { resources } from './i18n';

// Makes `t('...')` accept only keys that exist in en.json.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: (typeof resources)['en'];
  }
}
