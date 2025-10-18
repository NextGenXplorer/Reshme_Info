import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const LANGUAGE_KEY = '@app_language';

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Load saved language on component mount
  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        setCurrentLanguage(savedLanguage);
        i18n.changeLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const changeLanguage = async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
      setCurrentLanguage(language);
      i18n.changeLanguage(language);
      setShowLanguageModal(false);
    } catch (error) {
      console.error('Error saving language:', error);
      // Still change the language even if save fails
      setCurrentLanguage(language);
      i18n.changeLanguage(language);
      setShowLanguageModal(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.languageButton}
        onPress={() => setShowLanguageModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="language" size={20} color="#374151" style={{ marginRight: 6 }} />
        <Text style={[styles.languageButtonText, { marginRight: 6 }]}>
          {currentLanguage.toUpperCase()}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#6B7280" />
      </TouchableOpacity>

      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.languageModal}>
            <Text style={styles.modalTitle}>{t('selectLanguage')}</Text>

            <TouchableOpacity
              style={[
                styles.languageOption,
                currentLanguage === 'en' && styles.languageOptionSelected,
              ]}
              onPress={() => changeLanguage('en')}
            >
              <View style={styles.languageOptionContent}>
                <Text style={[styles.languageFlag, { marginRight: 12 }]}>🇺🇸</Text>
                <Text
                  style={[
                    styles.languageOptionText,
                    currentLanguage === 'en' &&
                      styles.languageOptionTextSelected,
                  ]}
                >
                  {t('english')}
                </Text>
              </View>
              {currentLanguage === 'en' && (
                <Ionicons name="checkmark" size={20} color="#3B82F6" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageOption,
                currentLanguage === 'kn' && styles.languageOptionSelected,
              ]}
              onPress={() => changeLanguage('kn')}
            >
              <View style={styles.languageOptionContent}>
                <Text style={[styles.languageFlag, { marginRight: 12 }]}>🇮🇳</Text>
                <Text
                  style={[
                    styles.languageOptionText,
                    currentLanguage === 'kn' &&
                      styles.languageOptionTextSelected,
                  ]}
                >
                  {t('kannada')}
                </Text>
              </View>
              {currentLanguage === 'kn' && (
                <Ionicons name="checkmark" size={20} color="#3B82F6" />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  languageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  languageModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  languageOptionSelected: {
    backgroundColor: '#EBF4FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  languageOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageFlag: {
    fontSize: 20,
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  languageOptionTextSelected: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
});
