import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import UnityAds, { UNITY_ADS_EVENTS } from '../utils/UnityAds';

/**
 * Unity Ads Example Component
 * Demonstrates how to show interstitial and rewarded ads
 */
const UnityAdsExample: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check if Unity Ads is initialized
    checkInitialization();

    // Set up event listeners
    const interstitialCompleteListener = UnityAds.addEventListener(
      UNITY_ADS_EVENTS.INTERSTITIAL_COMPLETE,
      (event) => {
        console.log('Interstitial ad complete:', event);
        Alert.alert('Ad Complete', 'Interstitial ad was closed');
      }
    );

    const rewardedCompleteListener = UnityAds.addEventListener(
      UNITY_ADS_EVENTS.REWARDED_COMPLETE,
      (event) => {
        console.log('Rewarded ad complete:', event);
        if (event.rewarded) {
          Alert.alert('Reward Earned!', 'You have earned your reward!');
          // Grant reward to user here
        } else {
          Alert.alert('Ad Skipped', 'You skipped the ad before completion');
        }
      }
    );

    const errorListener = UnityAds.addEventListener(
      UNITY_ADS_EVENTS.INTERSTITIAL_ERROR,
      (event) => {
        console.error('Unity Ads error:', event);
        Alert.alert('Ad Error', event.message);
      }
    );

    // Cleanup listeners on unmount
    return () => {
      interstitialCompleteListener.remove();
      rewardedCompleteListener.remove();
      errorListener.remove();
    };
  }, []);

  const checkInitialization = async () => {
    const initialized = await UnityAds.isInitialized();
    setIsInitialized(initialized);
  };

  const showInterstitial = async () => {
    try {
      await UnityAds.showInterstitialAd();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to show interstitial ad');
    }
  };

  const showRewarded = async () => {
    try {
      const result = await UnityAds.showRewardedAd();
      console.log('Rewarded ad result:', result);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to show rewarded ad');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unity Ads Demo</Text>

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {isInitialized ? '✅ Initialized' : '❌ Not Initialized'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.interstitialButton]}
        onPress={showInterstitial}
        disabled={!isInitialized}
      >
        <Text style={styles.buttonText}>Show Interstitial Ad</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.rewardedButton]}
        onPress={showRewarded}
        disabled={!isInitialized}
      >
        <Text style={styles.buttonText}>Show Rewarded Ad</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Note: These are test ads. Replace with your actual Unity Ad Unit IDs in production.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: '#F0F0F0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  interstitialButton: {
    backgroundColor: '#3B82F6',
  },
  rewardedButton: {
    backgroundColor: '#10B981',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    marginTop: 20,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default UnityAdsExample;
