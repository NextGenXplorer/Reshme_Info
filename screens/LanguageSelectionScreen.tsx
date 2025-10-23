import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n, { saveLanguagePreference } from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_LAUNCH_KEY = '@reshme_first_launch_completed';

interface LanguageSelectionScreenProps {
  onComplete: () => void;
}

export default function LanguageSelectionScreen({ onComplete }: LanguageSelectionScreenProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLanguageSelect = async (language: 'en' | 'kn') => {
    setSelectedLanguage(language);
    setLoading(true);

    try {
      // Save language preference
      await saveLanguagePreference(language);

      // Change language immediately
      await i18n.changeLanguage(language);

      // Mark first launch as completed
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');

      // Small delay for smooth transition
      setTimeout(() => {
        setLoading(false);
        onComplete();
      }, 500);
    } catch (error) {
      console.error('Error saving language preference:', error);
      setLoading(false);
      // Still complete even if there's an error
      onComplete();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Logo/Brand Section */}
      <View style={styles.headerSection}>
        <View style={styles.logoContainer}>
          <Ionicons name="leaf" size={60} color="#10B981" />
        </View>
        <Text style={styles.appName}>Reshme Info</Text>
        <Text style={styles.subtitle}>Cocoon Market Price Information</Text>
      </View>

      {/* Language Selection Section */}
      <View style={styles.selectionSection}>
        <Text style={styles.title}>Choose Your Language</Text>
        <Text style={styles.subtitle2}>ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ</Text>

        <View style={styles.languageOptions}>
          {/* English Option */}
          <TouchableOpacity
            style={[
              styles.languageCard,
              selectedLanguage === 'en' && styles.languageCardSelected,
            ]}
            onPress={() => handleLanguageSelect('en')}
            disabled={loading}
            activeOpacity={0.7}
          >
            <View style={styles.languageIcon}>
              <Text style={styles.languageEmoji}>🇬🇧</Text>
            </View>
            <Text style={styles.languageName}>English</Text>
            <Text style={styles.languageNative}>English</Text>
            {selectedLanguage === 'en' && loading && (
              <ActivityIndicator color="#10B981" size="small" style={styles.loader} />
            )}
            {selectedLanguage === 'en' && !loading && (
              <Ionicons name="checkmark-circle" size={24} color="#10B981" style={styles.checkmark} />
            )}
          </TouchableOpacity>

          {/* Kannada Option */}
          <TouchableOpacity
            style={[
              styles.languageCard,
              selectedLanguage === 'kn' && styles.languageCardSelected,
            ]}
            onPress={() => handleLanguageSelect('kn')}
            disabled={loading}
            activeOpacity={0.7}
          >
            <View style={styles.languageIcon}>
              <Text style={styles.languageEmoji}>🇮🇳</Text>
            </View>
            <Text style={styles.languageName}>Kannada</Text>
            <Text style={styles.languageNative}>ಕನ್ನಡ</Text>
            {selectedLanguage === 'kn' && loading && (
              <ActivityIndicator color="#10B981" size="small" style={styles.loader} />
            )}
            {selectedLanguage === 'kn' && !loading && (
              <Ionicons name="checkmark-circle" size={24} color="#10B981" style={styles.checkmark} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          You can change the language anytime from the settings
        </Text>
        <Text style={styles.noteKannada}>
          ನೀವು ಸೆಟ್ಟಿಂಗ್‌ಗಳಿಂದ ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ಭಾಷೆಯನ್ನು ಬದಲಾಯಿಸಬಹುದು
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Karnataka Cocoon Market Information System</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#10B981',
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  selectionSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle2: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  languageOptions: {
    gap: 16,
    marginBottom: 24,
  },
  languageCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  languageCardSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  languageIcon: {
    marginRight: 16,
  },
  languageEmoji: {
    fontSize: 48,
  },
  languageName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  languageNative: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
    marginRight: 8,
  },
  loader: {
    position: 'absolute',
    right: 20,
  },
  checkmark: {
    position: 'absolute',
    right: 20,
  },
  note: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  noteKannada: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
