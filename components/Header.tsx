import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, leftComponent, rightComponent }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const headerStyle = { paddingTop: insets.top };

  const defaultTitle = t('defaultTitle');
  const defaultSubtitle = t('defaultSubtitle');

  return (
    <View style={[styles.header, headerStyle]}>
      <View style={styles.leftComponent}>
        {leftComponent !== undefined ? leftComponent : (
          <Image
            source={require('../assets/reshme-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
      </View>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title || defaultTitle}</Text>
        {subtitle !== null && (
          <Text style={styles.subtitle}>{subtitle !== undefined ? subtitle : defaultSubtitle}</Text>
        )}
      </View>
      <View style={styles.rightComponent}>
        {rightComponent}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  leftComponent: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  rightComponent: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Header;
