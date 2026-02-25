import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import ro from './ro.json';
import en from './en.json';

const deviceLocale = getLocales()[0]?.languageCode ?? 'ro';
const supportedLanguages = ['ro', 'en'];
const detectedLanguage = supportedLanguages.includes(deviceLocale) ? deviceLocale : 'ro';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ro: { translation: ro },
      en: { translation: en },
    },
    lng: detectedLanguage,
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });

export default i18n;
