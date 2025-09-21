import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightComponent?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, rightComponent }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: Platform.OS === 'ios' ? insets.top : 0 }}>
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/reshme-logo.png')}
                style={styles.compactLogo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.titleSection}>
              <Text style={styles.compactTitle}>{title}</Text>
              {subtitle && <Text style={styles.compactSubtitle}>{subtitle}</Text>}
            </View>
          </View>
          {rightComponent}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  headerGradient: {
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  compactLogo: {
    width: 28,
    height: 28,
  },
  titleSection: {
    marginLeft: 12,
    flex: 1,
  },
  compactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  compactSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: 1,
  },
});

export default Header;
