# AdMob Ads - Testing Mode (Disabled)

## 📋 Overview
All AdMob advertisement functionality has been temporarily disabled for testing the Notifications feature. This document explains what was changed and how to re-enable ads for production.

---

## 🔧 Changes Made

### 1. App.tsx - Main App Component

#### AdMob Initialization (Lines 140-151)
**DISABLED:**
```typescript
// Initialize Google Mobile Ads
// COMMENTED OUT FOR TESTING - Uncomment for production
// useEffect(() => {
//   MobileAds()
//     .initialize()
//     .then(adapterStatuses => {
//       console.log('AdMob initialized:', adapterStatuses);
//     })
//     .catch(error => {
//       console.error('AdMob initialization error:', error);
//     });
// }, []);
```

#### Interstitial Ad Hook (Lines 153-159)
**DISABLED:**
```typescript
// Interstitial ad hook for tab navigation
// COMMENTED OUT FOR TESTING - Uncomment for production
// const { showAd, isLoaded } = useInterstitialAd();

// Exit ad hook - shows rewarded interstitial when user presses back button
// COMMENTED OUT FOR TESTING - Uncomment for production
// useExitAd({ enabled: true });
```

#### Navigation Ad Logic (Lines 225-240)
**DISABLED:**
```typescript
// Handle navigation state changes to show interstitial ads
// COMMENTED OUT FOR TESTING - Uncomment for production
const handleNavigationStateChange = (state: any) => {
  if (!state) return;

  const currentRoute = state.routes[state.index]?.name;

  // Show interstitial ad occasionally when switching tabs
  // Show ad 30% of the time when changing tabs
  // if (currentRoute && currentRoute !== previousRoute && isLoaded && Math.random() < 0.3) {
  //   console.log(`Tab changed from ${previousRoute} to ${currentRoute}, showing interstitial ad`);
  //   showAd();
  // }

  setPreviousRoute(currentRoute);
};
```

### 2. NotificationsScreen.tsx

#### AdBanner Import (Line 21)
**DISABLED:**
```typescript
// COMMENTED OUT FOR TESTING - Uncomment for production
// import AdBanner from '../components/AdBanner';
```

#### AdBanner Component (Lines 255-258)
**DISABLED:**
```typescript
{/* COMMENTED OUT FOR TESTING - Uncomment for production */}
{/* <View style={styles.adContainer}>
  <AdBanner />
</View> */}
```

---

## ✅ Re-enabling Ads for Production

### Step 1: App.tsx Changes

#### 1.1 Uncomment AdMob Initialization
```typescript
// Initialize Google Mobile Ads
useEffect(() => {
  MobileAds()
    .initialize()
    .then(adapterStatuses => {
      console.log('AdMob initialized:', adapterStatuses);
    })
    .catch(error => {
      console.error('AdMob initialization error:', error);
    });
}, []);
```

#### 1.2 Uncomment Ad Hooks
```typescript
// Interstitial ad hook for tab navigation
const { showAd, isLoaded } = useInterstitialAd();

// Exit ad hook - shows rewarded interstitial when user presses back button
useExitAd({ enabled: true });
```

#### 1.3 Uncomment Navigation Ad Logic
```typescript
const handleNavigationStateChange = (state: any) => {
  if (!state) return;

  const currentRoute = state.routes[state.index]?.name;

  // Show interstitial ad occasionally when switching tabs (not every time to avoid annoyance)
  // Show ad 30% of the time when changing tabs
  if (currentRoute && currentRoute !== previousRoute && isLoaded && Math.random() < 0.3) {
    console.log(`Tab changed from ${previousRoute} to ${currentRoute}, showing interstitial ad`);
    showAd();
  }

  setPreviousRoute(currentRoute);
};
```

### Step 2: NotificationsScreen.tsx Changes

#### 2.1 Uncomment AdBanner Import
```typescript
import AdBanner from '../components/AdBanner';
```

#### 2.2 Uncomment AdBanner Component
```typescript
<View style={styles.adContainer}>
  <AdBanner />
</View>
```

---

## 🚀 Quick Re-enable Script

### Using Find & Replace (Recommended)

**Find:**
```
// COMMENTED OUT FOR TESTING - Uncomment for production
```

**Replace with:** (empty string)

Then remove the comment markers (`//` or `/* */`) from the actual code.

### Manual Steps Summary

1. **Open App.tsx**
   - Remove comment markers from lines 140-151 (AdMob init)
   - Remove comment markers from lines 153-159 (Ad hooks)
   - Uncomment the if statement in handleNavigationStateChange (line 234-237)

2. **Open NotificationsScreen.tsx**
   - Uncomment line 21 (AdBanner import)
   - Uncomment lines 256-258 (AdBanner component)

3. **Test**
   - Run `npm start` or `expo start`
   - Verify ads load correctly
   - Test interstitial ads on tab navigation
   - Test exit ad on back button

---

## 🧪 Testing the Disabled State

### What Should Work Without Ads:
- ✅ App launches normally
- ✅ All navigation tabs work
- ✅ Notifications screen displays correctly
- ✅ No ad-related errors in console
- ✅ Tab switching has no delays
- ✅ Back button works normally

### What Won't Work:
- ❌ Banner ads won't display
- ❌ Interstitial ads won't show
- ❌ Exit ads won't trigger
- ❌ AdMob revenue tracking disabled

---

## 📊 Ad Configuration Details

### Current AdMob Setup
```javascript
AdMob App ID: ca-app-pub-5029120740748641~7524355155

Ad Types Configured:
- Banner Ads: Bottom of screens
- Interstitial Ads: 30% chance on tab navigation
- Rewarded Interstitial: On app exit (back button)

Ad Frequency:
- Banners: Always visible
- Interstitial: ~30% of tab switches
- Exit: Every back button press
```

### Ad Unit IDs
Check `app.config.js` for production Ad Unit IDs:
```javascript
plugins: [
  [
    "react-native-google-mobile-ads",
    {
      androidAppId: "ca-app-pub-5029120740748641~7524355155"
    }
  ]
]
```

---

## 🔍 Verification Checklist

### After Re-enabling Ads

- [ ] AdMob initializes successfully (check console logs)
- [ ] Banner ads display on all screens
- [ ] Interstitial ads show occasionally on tab navigation
- [ ] Exit ad appears on back button press
- [ ] No console errors related to ads
- [ ] Ad loading doesn't block UI
- [ ] Ad impressions tracked in AdMob dashboard
- [ ] Test ads work in development mode
- [ ] Production ads work in APK build

---

## 🐛 Troubleshooting

### Ads Not Showing After Re-enabling

**Problem**: No ads display after uncommenting
**Solutions**:
1. Clear app cache: `expo start -c`
2. Rebuild the app
3. Check AdMob account status
4. Verify Ad Unit IDs are correct
5. Check internet connection
6. Review console for initialization errors

### App Crashes After Re-enabling

**Problem**: App crashes when ads are enabled
**Solutions**:
1. Verify all imports are uncommented
2. Check for syntax errors after uncommenting
3. Ensure `react-native-google-mobile-ads` is installed
4. Check `google-services.json` is present
5. Review app.config.js plugin configuration

### Ads Show in Dev but Not Production

**Problem**: Test ads work, real ads don't
**Solutions**:
1. Verify production Ad Unit IDs
2. Check AdMob account approval status
3. Allow 24-48 hours for new apps
4. Ensure app ID matches AdMob dashboard
5. Check for policy violations

---

## 📝 Notes

### Why Ads Were Disabled
- To test Notifications feature without interruption
- To improve development/testing speed
- To isolate notification functionality
- To prevent accidental ad impressions during testing

### Best Practices
- Always test with ads disabled first (feature testing)
- Re-enable ads before production builds
- Use test ad units during development
- Monitor AdMob dashboard after re-enabling
- Document any ad-related configuration changes

### Important Reminders
- ⚠️ Do not commit production Ad Unit IDs to public repos
- ⚠️ Always use test ads during development
- ⚠️ Follow AdMob policies for ad placement
- ⚠️ Don't click your own ads (policy violation)
- ⚠️ Respect user experience - don't overuse ads

---

## 🔄 Version Control

### Git Commands

**To see what was changed:**
```bash
git diff App.tsx screens/NotificationsScreen.tsx
```

**To revert changes (re-enable ads):**
```bash
git checkout App.tsx screens/NotificationsScreen.tsx
```

**To create a testing branch:**
```bash
git checkout -b testing-no-ads
git add .
git commit -m "Disable ads for notification testing"
```

**To switch back to ads-enabled:**
```bash
git checkout main
```

---

## 📞 Support

### If You Need Help Re-enabling:
1. Check this document thoroughly
2. Review AdMob implementation docs
3. Test in development mode first
4. Check console logs for errors
5. Contact support with specific error messages

### Useful Links:
- [AdMob Documentation](https://developers.google.com/admob)
- [React Native Google Mobile Ads](https://docs.page/invertase/react-native-google-mobile-ads)
- [Expo AdMob Guide](https://docs.expo.dev/versions/latest/sdk/admob/)

---

## 📅 Change Log

**October 30, 2025**
- ✅ Disabled AdMob initialization in App.tsx
- ✅ Disabled interstitial ad hooks
- ✅ Disabled exit ad functionality
- ✅ Commented out AdBanner in NotificationsScreen
- ✅ Created this documentation

**To Re-enable:**
- Follow steps in "Re-enabling Ads for Production" section
- Test thoroughly before deployment
- Update this document with re-enable date

---

*Last Updated: October 30, 2025*
*Status: ADS DISABLED FOR TESTING*
*Next Action: Re-enable before production build*
