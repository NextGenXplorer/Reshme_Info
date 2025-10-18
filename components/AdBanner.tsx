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
// Use BANNER instead of ADAPTIVE_BANNER for better compatibility
const TEST_AD_UNIT_ID = TestIds.BANNER;

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

  useEffect(() => {
    console.log('🎯 AdBanner component mounted with ID:', finalAdUnitId);
  }, []);

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
        }}
        onAdFailedToLoad={(error) => {
          console.error('❌ Banner ad failed to load:', error);
          console.error('❌ Error details:', JSON.stringify(error));
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
    backgroundColor: '#F3F4F6',
    minHeight: 60,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});
