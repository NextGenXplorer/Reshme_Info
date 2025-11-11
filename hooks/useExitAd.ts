import { useEffect, useState, useRef } from 'react';
import { RewardedInterstitialAd, AdEventType, TestIds, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { BackHandler } from 'react-native';

/**
 * useExitAd Hook
 *
 * Shows a rewarded interstitial ad when user presses back button to exit.
 * Rewarded interstitials are longer and can't be skipped immediately.
 *
 * Usage:
 * useExitAd(); // Just call in App.tsx or main component
 */

// Production Rewarded Interstitial Ad Unit ID
const PRODUCTION_AD_UNIT_ID = 'ca-app-pub-5029120740748641/4463077544';

// Use test ID in development, production ID in production
const AD_UNIT_ID = __DEV__ ? TestIds.REWARDED_INTERSTITIAL : PRODUCTION_AD_UNIT_ID;

interface UseExitAdOptions {
  adUnitId?: string;
  enabled?: boolean; // Allow disabling the exit ad
}

export function useExitAd(options?: UseExitAdOptions) {
  const [rewardedInterstitial, setRewardedInterstitial] = useState<RewardedInterstitialAd | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isShowing, setIsShowing] = useState(false);
  const exitAttempts = useRef(0);

  const adUnitId = options?.adUnitId || AD_UNIT_ID;
  const enabled = options?.enabled !== false; // Default to enabled

  useEffect(() => {
    if (!enabled) {
      console.log('⚠️ Exit ad disabled');
      return;
    }

    console.log('🚀 Creating exit ad (Rewarded Interstitial)...');
    console.log('Exit ad unit ID:', adUnitId);
    console.log('Is Dev Mode:', __DEV__);

    // Create and load the rewarded interstitial ad
    const ad = RewardedInterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    // Define loadAd function BEFORE setting up listeners
    const loadAd = () => {
      console.log('📢 Loading exit ad...');
      ad.load();
    };

    // Set up event listeners
    const loadedListener = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('✅ Exit ad (Rewarded Interstitial) loaded successfully');
      console.log('Exit ad unit ID:', adUnitId);
      setIsLoaded(true);
    });

    const errorListener = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('❌ Exit ad failed to load:', error);
      console.error('Exit ad unit ID:', adUnitId);
      console.error('Error details:', JSON.stringify(error));
      setIsLoaded(false);

      // Retry loading after 15 seconds on error
      setTimeout(() => {
        console.log('🔄 Retrying exit ad load after error...');
        loadAd();
      }, 15000);
    });

    const earnedRewardListener = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        console.log('🎁 User earned reward:', reward);
        // User watched the full ad, you could give them a bonus here
      }
    );

    const closedListener = ad.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('🚪 Exit ad closed');
      setIsShowing(false);
      setIsLoaded(false);

      // User watched ad or closed it, allow app exit
      BackHandler.exitApp();
    });

    setRewardedInterstitial(ad);

    // Initial load
    loadAd();

    // Cleanup
    return () => {
      loadedListener();
      errorListener();
      earnedRewardListener();
      closedListener();
    };
  }, [adUnitId, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('⬅️ Hardware back button pressed');
      console.log('Exit ad state - isShowing:', isShowing, 'isLoaded:', isLoaded);

      // If ad is already showing, don't intercept
      if (isShowing) {
        console.log('⚠️ Exit ad already showing, ignoring back press');
        return false;
      }

      // If ad is loaded, show it
      if (isLoaded && rewardedInterstitial) {
        exitAttempts.current += 1;

        console.log(`🚪 Back button pressed (attempt ${exitAttempts.current}), showing exit ad...`);

        setIsShowing(true);
        rewardedInterstitial.show().catch((error) => {
          console.error('❌ Error showing exit ad:', error);
          console.error('Error details:', JSON.stringify(error));
          setIsShowing(false);

          // If ad fails to show, allow exit
          console.log('⚠️ Exit ad failed to show, allowing app exit');
          BackHandler.exitApp();
        });

        return true; // Prevent default back behavior
      } else {
        // Ad not loaded, allow exit
        console.log('⚠️ Exit ad not ready, allowing exit');
        console.log('rewardedInterstitial exists:', !!rewardedInterstitial);

        // Reload ad for next time
        if (rewardedInterstitial && !isLoaded) {
          console.log('🔄 Attempting to reload exit ad for next time');
          rewardedInterstitial.load();
        }

        return false; // Allow default back behavior (exit)
      }
    });

    return () => backHandler.remove();
  }, [enabled, isLoaded, isShowing, rewardedInterstitial]);

  return {
    isLoaded,
    isShowing,
    exitAttempts: exitAttempts.current,
  };
}
