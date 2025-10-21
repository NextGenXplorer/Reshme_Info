import { useEffect, useState } from 'react';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

/**
 * useInterstitialAd Hook
 *
 * Manages interstitial ad loading and display.
 * Shows ads when navigating between tabs (30% probability).
 *
 * Usage:
 * const { showAd, isLoaded } = useInterstitialAd();
 *
 * // Show ad when navigating between screens or after certain actions
 * if (isLoaded) {
 *   showAd();
 * }
 */

// PRODUCTION AD UNIT ID
const PRODUCTION_AD_UNIT_ID = 'ca-app-pub-5029120740748641/4128035622';

// For testing, you can temporarily use test ID:
// const TEST_AD_UNIT_ID = TestIds.INTERSTITIAL;

interface UseInterstitialAdOptions {
  adUnitId?: string;
}

export function useInterstitialAd(options?: UseInterstitialAdOptions) {
  const [interstitial, setInterstitial] = useState<InterstitialAd | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const adUnitId = options?.adUnitId || PRODUCTION_AD_UNIT_ID;

  useEffect(() => {
    // Create and load the interstitial ad
    const ad = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true, // For GDPR compliance
    });

    // Set up event listeners
    const loadedListener = ad.addAdEventListener(AdEventType.LOADED, () => {
      console.log('Interstitial ad loaded successfully');
      setIsLoaded(true);
      setIsLoading(false);
    });

    const errorListener = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('Interstitial ad failed to load:', error);
      setIsLoaded(false);
      setIsLoading(false);
    });

    const closedListener = ad.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('Interstitial ad closed');
      setIsLoaded(false);
      // Reload the ad for next time
      loadAd();
    });

    setInterstitial(ad);

    // Load the ad
    const loadAd = () => {
      setIsLoading(true);
      ad.load();
    };

    loadAd();

    // Cleanup
    return () => {
      loadedListener();
      errorListener();
      closedListener();
    };
  }, [adUnitId]);

  const showAd = async () => {
    if (isLoaded && interstitial) {
      try {
        await interstitial.show();
      } catch (error) {
        console.error('Error showing interstitial ad:', error);
      }
    } else {
      console.log('Interstitial ad not ready yet');
    }
  };

  return {
    showAd,
    isLoaded,
    isLoading,
  };
}
