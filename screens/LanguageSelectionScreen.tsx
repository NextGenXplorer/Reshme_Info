import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n, { saveLanguagePreference } from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallScreen = SCREEN_HEIGHT < 700;

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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo/Brand Section */}
        <View style={styles.headerSection}>
          <View style={[
            styles.logoContainer,
            isSmallScreen && styles.logoContainerSmall
          ]}>
            <Ionicons
              name="leaf"
              size={isSmallScreen ? 40 : 60}
              color="#10B981"
            />
          </View>
          <Text style={[
            styles.appName,
            isSmallScreen && styles.appNameSmall
          ]}>
            Reshme Info
          </Text>
          <Text style={[
            styles.subtitle,
            isSmallScreen && styles.subtitleSmall
          ]}>
            Cocoon Market Price Information
          </Text>
        </View>

        {/* Language Selection Section */}
        <View style={styles.selectionSection}>
          <Text style={[
            styles.title,
            isSmallScreen && styles.titleSmall
          ]}>
            Choose Your Language
          </Text>
          <Text style={[
            styles.subtitle2,
            isSmallScreen && styles.subtitle2Small
          ]}>
            ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ
          </Text>

          <View style={styles.languageOptions}>
          {/* English Option */}
          <TouchableOpacity
            style={[
              styles.languageCard,
              isSmallScreen && styles.languageCardSmall,
              selectedLanguage === 'en' && styles.languageCardSelected,
            ]}
            onPress={() => handleLanguageSelect('en')}
            disabled={loading}
            activeOpacity={0.7}
          >
            <View style={styles.languageIcon}>
              <Text style={[
                styles.languageEmoji,
                isSmallScreen && styles.languageEmojiSmall
              ]}>
                🇬🇧
              </Text>
            </View>
            <Text style={[
              styles.languageName,
              isSmallScreen && styles.languageNameSmall
            ]}>
              English
            </Text>
            <Text style={[
              styles.languageNative,
              isSmallScreen && styles.languageNativeSmall
            ]}>
              English
            </Text>
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
              isSmallScreen && styles.languageCardSmall,
              selectedLanguage === 'kn' && styles.languageCardSelected,
            ]}
            onPress={() => handleLanguageSelect('kn')}
            disabled={loading}
            activeOpacity={0.7}
          >
            <View style={styles.languageIcon}>
              <Text style={[
                styles.languageEmoji,
                isSmallScreen && styles.languageEmojiSmall
              ]}>
                🇮🇳
              </Text>
            </View>
            <Text style={[
              styles.languageName,
              isSmallScreen && styles.languageNameSmall
            ]}>
              Kannada
            </Text>
            <Text style={[
              styles.languageNative,
              isSmallScreen && styles.languageNativeSmall
            ]}>
              ಕನ್ನಡ
            </Text>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: isSmallScreen ? 30 : 60,
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
  logoContainerSmall: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  appNameSmall: {
    fontSize: 24,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  subtitleSmall: {
    fontSize: 13,
  },
  selectionSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: isSmallScreen ? 20 : 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  titleSmall: {
    fontSize: 18,
    marginBottom: 6,
  },
  subtitle2: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  subtitle2Small: {
    fontSize: 16,
    marginBottom: 20,
  },
  languageOptions: {
    gap: isSmallScreen ? 12 : 16,
    marginBottom: isSmallScreen ? 16 : 24,
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
  languageCardSmall: {
    padding: 16,
    borderRadius: 12,
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
    marginRight: isSmallScreen ? 12 : 16,
  },
  languageEmoji: {
    fontSize: 48,
  },
  languageEmojiSmall: {
    fontSize: 36,
  },
  languageName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  languageNameSmall: {
    fontSize: 18,
  },
  languageNative: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
    marginRight: 8,
  },
  languageNativeSmall: {
    fontSize: 15,
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
    paddingBottom: isSmallScreen ? 20 : 40,
    paddingTop: isSmallScreen ? 10 : 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
