import { useEffect, useState } from 'react';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

/**
 * useInterstitialAd Hook
 *
 * Manages interstitial ad loading and display.
 *
 * Usage:
 * const { showAd, isLoaded } = useInterstitialAd();
 *
 * // Show ad when navigating between screens or after certain actions
 * if (isLoaded) {
 *   showAd();
 * }
 */

// Production Interstitial Ad Unit ID
const PRODUCTION_AD_UNIT_ID = 'ca-app-pub-5029120740748641/4128035622';

// Use test ID in development, production ID in production
const AD_UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : PRODUCTION_AD_UNIT_ID;

interface UseInterstitialAdOptions {
  adUnitId?: string;
}

export function useInterstitialAd(options?: UseInterstitialAdOptions) {
  const [interstitial, setInterstitial] = useState<InterstitialAd | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const adUnitId = options?.adUnitId || AD_UNIT_ID;

  useEffect(() => {
    // Create and load the interstitial ad
    const ad = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true, // For GDPR compliance
    });

    // Define loadAd function BEFORE setting up listeners
    const loadAd = () => {
      console.log('📢 Loading interstitial ad...');
      setIsLoading(true);
      ad.load();
    };

    // Set up event listeners
    const loadedListener = ad.addAdEventListener(AdEventType.LOADED, () => {
      console.log('✅ Interstitial ad loaded successfully');
      console.log('Ad Unit ID:', adUnitId);
      console.log('Is Dev Mode:', __DEV__);
      setIsLoaded(true);
      setIsLoading(false);
    });

    const errorListener = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('❌ Interstitial ad failed to load:', error);
      console.error('Ad Unit ID:', adUnitId);
      console.error('Error details:', JSON.stringify(error));
      setIsLoaded(false);
      setIsLoading(false);

      // Retry loading after 10 seconds on error
      setTimeout(() => {
        console.log('🔄 Retrying ad load after error...');
        loadAd();
      }, 10000);
    });

    const closedListener = ad.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('🚪 Interstitial ad closed');
      setIsLoaded(false);
      // Reload the ad for next time
      console.log('🔄 Reloading ad after close...');
      loadAd();
    });

    setInterstitial(ad);

    // Initial load
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
        console.log('🎬 Showing interstitial ad...');
        await interstitial.show();
        console.log('✅ Interstitial ad displayed successfully');
      } catch (error) {
        console.error('❌ Error showing interstitial ad:', error);
        console.error('Error details:', JSON.stringify(error));
      }
    } else {
      console.log('⚠️ Interstitial ad not ready yet');
      console.log('isLoaded:', isLoaded);
      console.log('isLoading:', isLoading);
      console.log('interstitial exists:', !!interstitial);
    }
  };

  return {
    showAd,
    isLoaded,
    isLoading,
  };
}
