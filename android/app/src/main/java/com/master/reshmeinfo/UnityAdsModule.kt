package com.master.reshmeinfo

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.unity3d.ads.IUnityAdsLoadListener
import com.unity3d.ads.IUnityAdsShowListener
import com.unity3d.ads.UnityAds
import com.unity3d.ads.UnityAdsShowOptions

class UnityAdsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val reactContext: ReactApplicationContext = reactContext

    override fun getName(): String {
        return "UnityAdsModule"
    }

    @ReactMethod
    fun showInterstitialAd(adUnitId: String, promise: Promise) {
        val activity = currentActivity

        if (activity == null) {
            promise.reject("ERROR", "Activity not available")
            return
        }

        // Load the ad first
        UnityAds.load(adUnitId, object : IUnityAdsLoadListener {
            override fun onUnityAdsAdLoaded(placementId: String) {
                // Ad loaded successfully, now show it
                activity.runOnUiThread {
                    UnityAds.show(activity, adUnitId, UnityAdsShowOptions(), object : IUnityAdsShowListener {
                        override fun onUnityAdsShowFailure(placementId: String, error: UnityAds.UnityAdsShowError, message: String) {
                            promise.reject("SHOW_FAILED", "Failed to show ad: $message")
                            sendEvent("onUnityAdsError", createErrorEvent(placementId, message))
                        }

                        override fun onUnityAdsShowStart(placementId: String) {
                            sendEvent("onUnityAdsStart", createEvent(placementId))
                        }

                        override fun onUnityAdsShowClick(placementId: String) {
                            sendEvent("onUnityAdsClick", createEvent(placementId))
                        }

                        override fun onUnityAdsShowComplete(placementId: String, state: UnityAds.UnityAdsShowCompletionState) {
                            promise.resolve(state.toString())
                            sendEvent("onUnityAdsComplete", createCompleteEvent(placementId, state.toString()))
                        }
                    })
                }
            }

            override fun onUnityAdsFailedToLoad(placementId: String, error: UnityAds.UnityAdsLoadError, message: String) {
                promise.reject("LOAD_FAILED", "Failed to load ad: $message")
                sendEvent("onUnityAdsError", createErrorEvent(placementId, message))
            }
        })
    }

    @ReactMethod
    fun showRewardedAd(adUnitId: String, promise: Promise) {
        val activity = currentActivity

        if (activity == null) {
            promise.reject("ERROR", "Activity not available")
            return
        }

        UnityAds.load(adUnitId, object : IUnityAdsLoadListener {
            override fun onUnityAdsAdLoaded(placementId: String) {
                activity.runOnUiThread {
                    UnityAds.show(activity, adUnitId, UnityAdsShowOptions(), object : IUnityAdsShowListener {
                        override fun onUnityAdsShowFailure(placementId: String, error: UnityAds.UnityAdsShowError, message: String) {
                            promise.reject("SHOW_FAILED", "Failed to show rewarded ad: $message")
                            sendEvent("onUnityRewardedError", createErrorEvent(placementId, message))
                        }

                        override fun onUnityAdsShowStart(placementId: String) {
                            sendEvent("onUnityRewardedStart", createEvent(placementId))
                        }

                        override fun onUnityAdsShowClick(placementId: String) {
                            sendEvent("onUnityRewardedClick", createEvent(placementId))
                        }

                        override fun onUnityAdsShowComplete(placementId: String, state: UnityAds.UnityAdsShowCompletionState) {
                            val params = Arguments.createMap()
                            params.putString("placementId", placementId)
                            params.putString("state", state.toString())
                            params.putBoolean("rewarded", state == UnityAds.UnityAdsShowCompletionState.COMPLETED)

                            promise.resolve(params)
                            sendEvent("onUnityRewardedComplete", params)
                        }
                    })
                }
            }

            override fun onUnityAdsFailedToLoad(placementId: String, error: UnityAds.UnityAdsLoadError, message: String) {
                promise.reject("LOAD_FAILED", "Failed to load rewarded ad: $message")
                sendEvent("onUnityRewardedError", createErrorEvent(placementId, message))
            }
        })
    }

    @ReactMethod
    fun isInitialized(promise: Promise) {
        promise.resolve(UnityAds.isInitialized())
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private fun createEvent(placementId: String): WritableMap {
        val params = Arguments.createMap()
        params.putString("placementId", placementId)
        return params
    }

    private fun createErrorEvent(placementId: String, message: String): WritableMap {
        val params = Arguments.createMap()
        params.putString("placementId", placementId)
        params.putString("message", message)
        return params
    }

    private fun createCompleteEvent(placementId: String, state: String): WritableMap {
        val params = Arguments.createMap()
        params.putString("placementId", placementId)
        params.putString("state", state)
        return params
    }
}
