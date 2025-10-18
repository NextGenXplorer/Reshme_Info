# AdMob Implementation Guide

This document describes the AdMob integration in the ReshmeInfo app, including setup, testing, and production deployment instructions.

## Overview

The app uses **Google Mobile Ads (AdMob)** to display:
1. **Banner Ads** - At the bottom of all main screens (Home, Market, Stats, About)
2. **Interstitial Ads** - Shown occasionally (30% chance) when users switch between tabs

## Current Configuration (TEST MODE)

### Test AdMob App ID
- **Android**: `ca-app-pub-3940256099942544~3347511713`
- Location: `app.config.js` → `plugins` → `react-native-google-mobile-ads`

### Test Ad Unit IDs
The app uses Google's official test ad unit IDs:
- **Banner Ad**: `TestIds.ADAPTIVE_BANNER`
- **Interstitial Ad**: `TestIds.INTERSTITIAL`

These are automatically provided by `react-native-google-mobile-ads` package for testing.

## File Structure

```
/components
  ├── AdBanner.tsx              # Banner ad component (used in all screens)

/hooks
  ├── useInterstitialAd.ts      # Hook for managing interstitial ads

/screens
  ├── HomeScreen.tsx            # Has banner ad
  ├── MarketScreen.tsx          # Has banner ad
  ├── StatsScreen.tsx           # Has banner ad
  └── AboutScreen.tsx           # Has banner ad

App.tsx                         # Initializes AdMob & shows interstitial ads
app.config.js                   # AdMob plugin configuration
```

## Testing Instructions

### Prerequisites
1. Build the app with EAS Build or local build (Expo Go doesn't support AdMob)
2. Install on a physical Android device or emulator

### Build Command
```bash
# For development build
eas build --profile development --platform android

# For preview build
eas build --profile preview --platform android
```

### What to Test

#### 1. Banner Ads
- [ ] Open the app
- [ ] Navigate to Home screen → Banner ad should appear at bottom
- [ ] Navigate to Market screen → Banner ad should appear at bottom
- [ ] Navigate to Stats screen → Banner ad should appear at bottom
- [ ] Navigate to About screen → Banner ad should appear at bottom
- [ ] Verify ads don't overlap with content
- [ ] Verify ads are above the tab bar navigation

#### 2. Interstitial Ads
- [ ] Switch between tabs multiple times
- [ ] Approximately 30% of tab switches should show a full-screen interstitial ad
- [ ] Verify ad can be closed after a few seconds
- [ ] Verify navigation continues after ad is closed
- [ ] Check console logs for "Tab changed..." messages

#### 3. Test Ad Recognition
Test ads should show:
- Banner: "Test Ad" label
- Interstitial: Full-screen test ad with clear test indication

## Console Logs to Monitor

```javascript
// Successful initialization
"AdMob initialized: [adapter statuses]"

// Banner ad loaded
"Banner ad loaded successfully"

// Banner ad failed
"Banner ad failed to load: [error]"

// Interstitial ad loaded
"Interstitial ad loaded successfully"

// Interstitial ad shown
"Tab changed from Home to Market, showing interstitial ad"

// Interstitial ad closed
"Interstitial ad closed"
```

## Production Deployment

### Step 1: Create AdMob Account & App
1. Go to [AdMob Console](https://apps.admob.com/)
2. Create a new AdMob account (if not already created)
3. Add your app: Apps → Add App → Android
4. Fill in app details:
   - App name: ReshmeInfo
   - Package name: `com.master.reshmeinfo`
   - Select "No" for "Is this app published on Google Play?" (if not yet published)

### Step 2: Create Ad Units

#### Create Banner Ad Unit
1. In AdMob Console → Apps → Your App → Ad units
2. Click "Add Ad Unit" → Select "Banner"
3. Name: "ReshmeInfo Banner"
4. Copy the ad unit ID (format: `ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY`)

#### Create Interstitial Ad Unit
1. Click "Add Ad Unit" → Select "Interstitial"
2. Name: "ReshmeInfo Interstitial"
3. Copy the ad unit ID

### Step 3: Update App Configuration

#### Update `app.config.js`
```javascript
plugins: [
  [
    "react-native-google-mobile-ads",
    {
      androidAppId: "ca-app-pub-XXXXXXXXXXXXXXXX~ZZZZZZZZZZ", // Your AdMob App ID
    }
  ]
]
```

#### Update `components/AdBanner.tsx`
```typescript
// Replace this line:
const TEST_AD_UNIT_ID = TestIds.ADAPTIVE_BANNER;

// With your production ad unit ID:
const PRODUCTION_AD_UNIT_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY';

// And update the component to use it:
const finalAdUnitId = adUnitId || PRODUCTION_AD_UNIT_ID;
```

#### Update `hooks/useInterstitialAd.ts`
```typescript
// Replace this line:
const TEST_AD_UNIT_ID = TestIds.INTERSTITIAL;

// With your production ad unit ID:
const PRODUCTION_AD_UNIT_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY';

// And update the hook to use it:
const adUnitId = options?.adUnitId || PRODUCTION_AD_UNIT_ID;
```

### Step 4: Test with Production Ads

⚠️ **Important**: Before testing production ads:
1. Add your test device ID to AdMob console to avoid invalid traffic
2. Never click your own ads in production mode
3. Use test devices registered in AdMob console

#### Add Test Device
```typescript
// In App.tsx, update AdMob initialization:
MobileAds()
  .initialize()
  .then(adapterStatuses => {
    console.log('AdMob initialized:', adapterStatuses);
  });

// Configure test device (optional, for testing production ads safely)
MobileAds().setRequestConfiguration({
  testDeviceIdentifiers: ['YOUR_DEVICE_ID_HERE'],
});
```

To get your device ID, check the logs when the app first loads with production ad units.

### Step 5: Rebuild and Deploy
```bash
# Build production version
eas build --profile production --platform android

# Or update existing build
eas update
```

## Ad Placement Strategy

### Banner Ads
- **Placement**: Bottom of screen, above tab navigation
- **Type**: Adaptive banner (automatically adjusts to screen width)
- **Frequency**: Always visible on all main screens
- **User Experience**: Non-intrusive, doesn't block content

### Interstitial Ads
- **Placement**: Between tab navigation transitions
- **Frequency**: 30% of tab switches (configurable in `App.tsx`)
- **User Experience**: Occasional, not annoying
- **Timing**: Only when ad is loaded and user navigates

### Adjusting Interstitial Frequency
In `App.tsx`, line 180:
```typescript
// Current: 30% chance
if (currentRoute && currentRoute !== previousRoute && isLoaded && Math.random() < 0.3) {

// More frequent (50%):
if (currentRoute && currentRoute !== previousRoute && isLoaded && Math.random() < 0.5) {

// Less frequent (10%):
if (currentRoute && currentRoute !== previousRoute && isLoaded && Math.random() < 0.1) {

// Always show:
if (currentRoute && currentRoute !== previousRoute && isLoaded) {

// Never show (disable):
if (false) {
```

## Troubleshooting

### Banner Ads Not Showing
1. Check console for "Banner ad failed to load" errors
2. Verify app is built (not running in Expo Go)
3. Verify internet connection
4. Check AdMob account status (not disabled)
5. For production: Verify ad unit IDs are correct

### Interstitial Ads Not Showing
1. Check console for "Interstitial ad loaded successfully"
2. If loaded but not showing, increase frequency (change 0.3 to 1.0)
3. Verify navigation state changes are being tracked
4. Check if ad is being blocked by device settings

### Common Errors

#### "The ad request was successful, but no ad was returned"
- Normal for test ads occasionally
- For production: May take 24-48 hours for ads to start serving
- Verify payment and tax info in AdMob account

#### "AdMob app ID is missing"
- Rebuild the app after updating `app.config.js`
- Run `eas build` again (app.config changes require rebuild)

#### "Ad failed to load: 3 (ERROR_CODE_NO_FILL)"
- Normal for test environment
- For production: Increase ad mediation sources in AdMob

## Revenue Optimization Tips

1. **Ad Placement**: Keep banner ads visible but not intrusive
2. **Interstitial Frequency**: Balance revenue vs user experience (30% is recommended)
3. **User Retention**: Monitor if interstitial ads affect user retention
4. **Ad Mediation**: Configure ad mediation in AdMob for higher fill rates
5. **Analytics**: Track ad performance in AdMob dashboard

## Privacy & Compliance

### GDPR Compliance
The app requests non-personalized ads by default:
```typescript
requestOptions={{
  requestNonPersonalizedAdsOnly: true,
}}
```

For GDPR-compliant regions (EU), consider:
1. Adding consent collection using Google's UMP SDK
2. Only showing personalized ads after user consent
3. Providing clear privacy policy

### App Store Requirements
Before publishing:
1. Add AdMob privacy policy to app listing
2. Declare ad network usage in privacy section
3. Include "Contains ads" in app description

## Support & Documentation

- **AdMob Console**: https://apps.admob.com/
- **AdMob Help**: https://support.google.com/admob
- **react-native-google-mobile-ads Docs**: https://docs.page/invertase/react-native-google-mobile-ads
- **Expo AdMob Guide**: https://docs.expo.dev/versions/latest/sdk/admob/

## Contact & Maintenance

For issues with this implementation:
1. Check console logs first
2. Verify AdMob dashboard for account status
3. Review this documentation for troubleshooting steps
4. Contact development team with specific error messages

---

**Last Updated**: 2025-10-18
**Version**: 1.0.0 (Test Mode)
**Status**: ✅ Ready for testing
