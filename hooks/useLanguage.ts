import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_STORAGE_KEY = '@neardeal_language';

export type SupportedLanguage = 'ro' | 'en';

const AVAILABLE_LANGUAGES: { code: SupportedLanguage; label: string }[] = [
  { code: 'ro', label: 'Română' },
  { code: 'en', label: 'English' },
];

export function useLanguage() {
  const { i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && (saved === 'ro' || saved === 'en')) {
          if (i18n.language !== saved) {
            await i18n.changeLanguage(saved);
          }
        }
      } catch (error) {
        // Fall back to the current i18n language on storage error
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedLanguage();
  }, []);

  const changeLanguage = useCallback(
    async (language: SupportedLanguage) => {
      try {
        await i18n.changeLanguage(language);
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      } catch (error) {
        // Language change failed; state remains unchanged
      }
    },
    [i18n]
  );

  return {
    currentLanguage: i18n.language as SupportedLanguage,
    availableLanguages: AVAILABLE_LANGUAGES,
    changeLanguage,
    isLoading,
  };
}
