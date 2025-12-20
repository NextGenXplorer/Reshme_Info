import { useState, useEffect } from 'react';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

/**
 * useBannerAd Hook
 *
 * Provides banner ad configuration and tracking.
 *
 * Usage:
 * const { adUnitId, isLoaded, onAdLoaded, onAdFailedToLoad } = useBannerAd();
 *
 * <BannerAd
 *   unitId={adUnitId}
 *   size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
 *   onAdLoaded={onAdLoaded}
 *   onAdFailedToLoad={onAdFailedToLoad}
 * />
 */

// Production Banner Ad Unit ID
const PRODUCTION_AD_UNIT_ID = 'ca-app-pub-5029120740748641/9390661397';

// Use test ID in development, production ID in production
const AD_UNIT_ID = __DEV__ ? TestIds.ADAPTIVE_BANNER : PRODUCTION_AD_UNIT_ID;

interface UseBannerAdOptions {
  adUnitId?: string;
  enabled?: boolean;
}

export function useBannerAd(options?: UseBannerAdOptions) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const adUnitId = options?.adUnitId || AD_UNIT_ID;
  const enabled = options?.enabled !== false;

  useEffect(() => {
    if (enabled) {
      console.log('🎯 Banner ad hook initialized');
      console.log('Banner ad unit ID:', adUnitId);
      console.log('Is Dev Mode:', __DEV__);
    }
  }, [enabled, adUnitId]);

  const onAdLoaded = () => {
    console.log('✅ Banner ad loaded successfully');
    setIsLoaded(true);
    setHasError(false);
    setErrorMessage(null);
  };

  const onAdFailedToLoad = (error: any) => {
    console.error('❌ Banner ad failed to load:', error);
    console.error('Banner ad unit ID:', adUnitId);
    console.error('Error details:', JSON.stringify(error));
    setIsLoaded(false);
    setHasError(true);
    setErrorMessage(error?.message || 'Unknown error');
  };

  return {
    adUnitId,
    isLoaded,
    hasError,
    errorMessage,
    enabled,
    onAdLoaded,
    onAdFailedToLoad,
  };
}

// Re-export BannerAd and BannerAdSize for convenience
export { BannerAd, BannerAdSize };
