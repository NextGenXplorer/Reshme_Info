import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { UnityAdsModule } = NativeModules;

// Unity Ads Test Ad Unit IDs
export const UNITY_ADS_TEST_IDS = {
  INTERSTITIAL: Platform.OS === 'android' ? 'Interstitial_Android' : 'Interstitial_iOS',
  REWARDED: Platform.OS === 'android' ? 'Rewarded_Android' : 'Rewarded_iOS',
};

class UnityAdsManager {
  private eventEmitter: NativeEventEmitter;

  constructor() {
    this.eventEmitter = new NativeEventEmitter(UnityAdsModule);
  }

  /**
   * Check if Unity Ads is initialized
   */
  async isInitialized(): Promise<boolean> {
    try {
      return await UnityAdsModule.isInitialized();
    } catch (error) {
      console.error('Error checking Unity Ads initialization:', error);
      return false;
    }
  }

  /**
   * Show an interstitial ad
   * @param adUnitId - The ad unit ID (optional, uses test ID by default)
   */
  async showInterstitialAd(adUnitId?: string): Promise<string> {
    try {
      const unitId = adUnitId || UNITY_ADS_TEST_IDS.INTERSTITIAL;
      const result = await UnityAdsModule.showInterstitialAd(unitId);
      console.log('Interstitial ad completed:', result);
      return result;
    } catch (error) {
      console.error('Error showing interstitial ad:', error);
      throw error;
    }
  }

  /**
   * Show a rewarded ad
   * @param adUnitId - The ad unit ID (optional, uses test ID by default)
   * @returns Object with placementId, state, and rewarded status
   */
  async showRewardedAd(adUnitId?: string): Promise<{ placementId: string; state: string; rewarded: boolean }> {
    try {
      const unitId = adUnitId || UNITY_ADS_TEST_IDS.REWARDED;
      const result = await UnityAdsModule.showRewardedAd(unitId);
      console.log('Rewarded ad completed:', result);
      return result;
    } catch (error) {
      console.error('Error showing rewarded ad:', error);
      throw error;
    }
  }

  /**
   * Add event listener for Unity Ads events
   */
  addEventListener(eventName: string, listener: (event: any) => void) {
    return this.eventEmitter.addListener(eventName, listener);
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(eventName?: string) {
    if (eventName) {
      this.eventEmitter.removeAllListeners(eventName);
    } else {
      this.eventEmitter.removeAllListeners('onUnityAdsStart');
      this.eventEmitter.removeAllListeners('onUnityAdsClick');
      this.eventEmitter.removeAllListeners('onUnityAdsComplete');
      this.eventEmitter.removeAllListeners('onUnityAdsError');
      this.eventEmitter.removeAllListeners('onUnityRewardedStart');
      this.eventEmitter.removeAllListeners('onUnityRewardedClick');
      this.eventEmitter.removeAllListeners('onUnityRewardedComplete');
      this.eventEmitter.removeAllListeners('onUnityRewardedError');
    }
  }
}

export default new UnityAdsManager();

// Event names for listeners
export const UNITY_ADS_EVENTS = {
  // Interstitial events
  INTERSTITIAL_START: 'onUnityAdsStart',
  INTERSTITIAL_CLICK: 'onUnityAdsClick',
  INTERSTITIAL_COMPLETE: 'onUnityAdsComplete',
  INTERSTITIAL_ERROR: 'onUnityAdsError',

  // Rewarded events
  REWARDED_START: 'onUnityRewardedStart',
  REWARDED_CLICK: 'onUnityRewardedClick',
  REWARDED_COMPLETE: 'onUnityRewardedComplete',
  REWARDED_ERROR: 'onUnityRewardedError',
};
