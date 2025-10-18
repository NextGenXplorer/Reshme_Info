import { useEffect, useState, useRef } from 'react';
import { RewardedInterstitialAd, AdEventType, TestIds, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { BackHandler } from 'react-native';

/**
 * useExitAd Hook
 *
 * Shows a rewarded interstitial ad when user presses back button to exit.
 * Rewarded interstitials are longer and can't be skipped immediately.
 * Uses Google's test ad unit ID for testing.
 *
 * For production:
 * 1. Create rewarded interstitial ad unit in AdMob console
 * 2. Replace TEST_AD_UNIT_ID with your actual ad unit ID
 *
 * Usage:
 * useExitAd(); // Just call in App.tsx or main component
 */

// TEST AD UNIT ID - Replace with production ID when ready
const TEST_AD_UNIT_ID = TestIds.REWARDED_INTERSTITIAL;

// For production, use your actual ad unit ID:
// const PRODUCTION_AD_UNIT_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY';

interface UseExitAdOptions {
  adUnitId?: string;
  enabled?: boolean; // Allow disabling the exit ad
}

export function useExitAd(options?: UseExitAdOptions) {
  const [rewardedInterstitial, setRewardedInterstitial] = useState<RewardedInterstitialAd | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isShowing, setIsShowing] = useState(false);
  const exitAttempts = useRef(0);

  const adUnitId = options?.adUnitId || TEST_AD_UNIT_ID;
  const enabled = options?.enabled !== false; // Default to enabled

  useEffect(() => {
    if (!enabled) return;

    // Create and load the rewarded interstitial ad
    const ad = RewardedInterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    // Set up event listeners
    const loadedListener = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('✅ Exit ad (Rewarded Interstitial) loaded successfully');
      setIsLoaded(true);
    });

    const errorListener = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('❌ Exit ad failed to load:', error);
      setIsLoaded(false);
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

    // Load the ad
    ad.load();

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
      // If ad is already showing, don't intercept
      if (isShowing) {
        return false;
      }

      // If ad is loaded, show it
      if (isLoaded && rewardedInterstitial) {
        exitAttempts.current += 1;

        console.log(`🚪 Back button pressed (attempt ${exitAttempts.current}), showing exit ad...`);

        setIsShowing(true);
        rewardedInterstitial.show().catch((error) => {
          console.error('❌ Error showing exit ad:', error);
          setIsShowing(false);

          // If ad fails to show, allow exit
          BackHandler.exitApp();
        });

        return true; // Prevent default back behavior
      } else {
        // Ad not loaded, try to load for next time but allow exit
        console.log('⚠️ Exit ad not ready, allowing exit');

        // Reload ad for next time
        if (rewardedInterstitial && !isLoaded) {
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
