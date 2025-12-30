import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { vi } from './locales/vi';
import { en } from './locales/en';
import { ja } from './locales/ja'; // [ADD]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: vi,
      en: en,
      ja: ja // [ADD]
    },
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;