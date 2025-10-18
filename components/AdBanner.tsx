import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

/**
 * AdBanner Component
 *
 * Displays a banner ad at the bottom of screens.
 * Uses Google's test ad unit ID for testing.
 *
 * For production:
 * 1. Create ad units in AdMob console
 * 2. Replace TEST_AD_UNIT_ID with your actual ad unit ID
 * 3. Update AdMob App ID in app.config.js
 */

// Android Test Banner Ad Unit ID (direct string for reliability)
const ANDROID_TEST_BANNER = Platform.select({
  android: 'ca-app-pub-3940256099942544/6300978111', // Google's test banner ID
  ios: 'ca-app-pub-3940256099942544/2934735716',
  default: TestIds.BANNER,
});

interface AdBannerProps {
  adUnitId?: string;
}

export default function AdBanner({ adUnitId }: AdBannerProps) {
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);

  // Use custom ID, or platform-specific test ID, or fallback to TestIds constant
  const finalAdUnitId = adUnitId || ANDROID_TEST_BANNER || TestIds.BANNER;

  useEffect(() => {
    console.log('🎯 AdBanner component mounted');
    console.log('📱 Platform:', Platform.OS);
    console.log('🆔 Ad Unit ID:', finalAdUnitId);
  }, [finalAdUnitId]);

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={finalAdUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          console.log('✅ Banner ad loaded successfully');
          setIsAdLoaded(true);
          setAdError(null);
        }}
        onAdFailedToLoad={(error) => {
          console.error('❌ Banner ad failed to load');
          console.error('❌ Error code:', error.code);
          console.error('❌ Error message:', error.message);
          console.error('❌ Full error:', JSON.stringify(error, null, 2));
          setIsAdLoaded(false);
          setAdError(`Error ${error.code}: ${error.message}`);
        }}
        onAdOpened={() => {
          console.log('📖 Banner ad opened');
        }}
        onAdClosed={() => {
          console.log('📕 Banner ad closed');
        }}
      />

      {/* Debug info - remove in production */}
      {__DEV__ && adError && (
        <Text style={styles.errorText}>Ad Error: {adError}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    minHeight: 60,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
});
