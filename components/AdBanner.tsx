import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
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

// TEST AD UNIT ID - Replace with production ID when ready
const TEST_AD_UNIT_ID = TestIds.ADAPTIVE_BANNER;

// For production, use your actual ad unit IDs:
// const PRODUCTION_AD_UNIT_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY';

interface AdBannerProps {
  // Optional: allow custom ad unit ID
  adUnitId?: string;
}

export default function AdBanner({ adUnitId }: AdBannerProps) {
  const [isAdLoaded, setIsAdLoaded] = useState(false);

  // Use test ad unit ID by default, or custom ID if provided
  const finalAdUnitId = adUnitId || TEST_AD_UNIT_ID;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={finalAdUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true, // For GDPR compliance
        }}
        onAdLoaded={() => {
          console.log('Banner ad loaded successfully');
          setIsAdLoaded(true);
        }}
        onAdFailedToLoad={(error) => {
          console.error('Banner ad failed to load:', error);
          setIsAdLoaded(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});
