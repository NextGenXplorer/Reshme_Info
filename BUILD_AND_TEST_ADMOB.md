# Building and Testing AdMob Implementation

## Quick Start Guide for Testing AdMob Ads

### Prerequisites
- AdMob implementation is complete ✅
- Using **TEST** AdMob IDs (safe for testing)
- Ready to build and test

### Step 1: Build the App

AdMob requires a **native build** (Expo Go doesn't support AdMob). Choose one of these options:

#### Option A: EAS Build (Recommended)
```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo account
eas login

# Create a development build for testing
eas build --profile development --platform android

# Or create a preview build (closer to production)
eas build --profile preview --platform android
```

The build will be created on Expo's servers and you'll get a download link.

#### Option B: Local Build (If you have Android Studio)
```bash
# Generate android folder
npx expo prebuild

# Build locally
cd android
./gradlew assembleDebug

# APK will be in: android/app/build/outputs/apk/debug/app-debug.apk
```

### Step 2: Install on Device

#### From EAS Build:
1. Download APK from the link provided after build completes
2. Transfer to Android device
3. Install APK (may need to enable "Install from unknown sources")

#### From Local Build:
```bash
# Install via ADB
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Step 3: Test Banner Ads

1. **Open the app**
2. **Navigate to each screen:**
   - Home screen → Look for banner ad at bottom
   - Market screen → Look for banner ad at bottom
   - Stats screen → Look for banner ad at bottom
   - About screen → Look for banner ad at bottom

**Expected behavior:**
- Banner ad appears at the bottom of each screen
- Ad displays "Test Ad" label (Google's test ad)
- Ad doesn't overlap with content
- Ad is above the tab navigation bar

### Step 4: Test Interstitial Ads

1. **Switch between tabs multiple times**
2. **Approximately 30% of the time** (roughly 1 out of 3 switches), you should see:
   - Full-screen ad appears
   - Can close ad after a few seconds
   - App continues to the selected tab after closing

**Expected behavior:**
- Interstitial shows occasionally (not every time)
- Shows Google's test interstitial ad
- Can be closed by tapping X or back button
- App navigation continues normally after closing

### Step 5: Check Logs (Optional but Helpful)

Connect device to computer and view logs:

```bash
# View React Native logs
npx react-native log-android

# Or use ADB directly
adb logcat | grep -i "admob\|ad loaded\|ad failed"
```

**Look for these messages:**
```
✅ "AdMob initialized: ..."
✅ "Banner ad loaded successfully"
✅ "Interstitial ad loaded successfully"
✅ "Tab changed from Home to Market, showing interstitial ad"
✅ "Interstitial ad closed"
```

## What You Should See

### Banner Ad Examples
Test banner ads will show:
- "Test Ad" text
- Generic placeholder graphics
- Standard banner size (320x50 or adaptive)

### Interstitial Ad Examples
Test interstitial ads will show:
- Full-screen "Test Ad"
- Close button (X) in top corner
- May have countdown before close button appears
- Clear indication it's a test ad

## Troubleshooting

### Issue: "Banner ads not showing"

**Check:**
1. Are you using Expo Go? ❌ (Won't work - need native build)
2. Is internet connected? (Ads require network)
3. Check console for "Banner ad failed to load" errors
4. Try restarting the app

**Fix:**
- Build with EAS or locally (not Expo Go)
- Ensure device has internet connection
- Check logs for specific error messages

### Issue: "Interstitial ads never showing"

**Check:**
1. Are you switching tabs multiple times? (Only 30% chance)
2. Check logs for "Interstitial ad loaded successfully"
3. If loaded but not showing, check "Tab changed..." logs

**Fix:**
- Switch tabs at least 10 times to ensure you trigger one
- Check console logs to verify ad is loading
- Temporarily increase frequency in App.tsx (change 0.3 to 1.0 for testing)

### Issue: "Build failing"

**Common errors:**
```
Error: AdMob plugin not found
```
**Fix:** Run `eas build:configure` or ensure app.config.js is correct

```
Error: Google services file missing
```
**Fix:** Ensure google-services.json is in root directory

### Issue: "App crashes when showing ads"

**Check:**
1. Build is up to date with latest code
2. react-native-google-mobile-ads is installed
3. Plugin is configured in app.config.js

**Fix:**
- Rebuild app completely
- Check for JavaScript errors in logs
- Verify all imports are correct

## Next Steps After Testing

Once testing is successful:

### For Continued Testing
- Keep using test IDs
- Test on different devices
- Test on different network conditions
- Test app with/without ads (optional)

### For Production (When Ready)
1. Create AdMob account at https://apps.admob.com/
2. Register your app (com.master.reshmeinfo)
3. Create ad units (Banner + Interstitial)
4. Follow **ADMOB_IMPLEMENTATION.md** → "Production Deployment" section
5. Update ad unit IDs in code
6. Rebuild and test with production ads
7. Submit to Play Store

## Quick Reference

### Current Configuration
- **Status**: TEST MODE ✅
- **AdMob App ID**: Google test ID (safe to test)
- **Banner Ad ID**: TestIds.ADAPTIVE_BANNER
- **Interstitial Ad ID**: TestIds.INTERSTITIAL
- **Interstitial Frequency**: 30% of tab changes

### Files to Check
- `app.config.js` - AdMob plugin config
- `components/AdBanner.tsx` - Banner ad component
- `hooks/useInterstitialAd.ts` - Interstitial ad hook
- `App.tsx` - AdMob initialization & interstitial triggers
- `ADMOB_IMPLEMENTATION.md` - Full documentation

### Build Commands
```bash
# Development build (for testing)
eas build --profile development --platform android

# Preview build (closer to production)
eas build --profile preview --platform android

# Production build (when ready to publish)
eas build --profile production --platform android
```

## Support

If you encounter issues:
1. Check this guide's "Troubleshooting" section
2. Review console logs for specific errors
3. Check ADMOB_IMPLEMENTATION.md for detailed documentation
4. Verify all files are updated correctly

---

**Ready to test!** 🎉

Build the app, install on device, and verify ads are working correctly.

**Last Updated**: 2025-10-18
