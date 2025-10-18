import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import kn from './locales/kn.json';

const LANGUAGE_STORAGE_KEY = '@reshme_language_preference';

// Load saved language preference
const loadLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return savedLanguage || 'en';
  } catch (error) {
    console.error('Error loading language preference:', error);
    return 'en';
  }
};

// Initialize i18n
const initI18n = async () => {
  const savedLanguage = await loadLanguage();

  i18n.use(initReactI18next).init({
    resources: {
      en: {
        translation: en,
      },
      kn: {
        translation: kn,
      },
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
};

// Initialize immediately
initI18n();

// Export function to save language preference
export const saveLanguagePreference = async (language: string) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    console.log('Language preference saved:', language);
  } catch (error) {
    console.error('Error saving language preference:', error);
  }
};

export default i18n;
