# Exit Ad Implementation - Back Button Rewarded Interstitial

## Overview

When users press the **back button** to exit the app, a **Rewarded Interstitial Ad** is shown. This is a longer-duration ad that can't be skipped immediately, maximizing ad revenue from exit attempts.

## Implementation Details

### Ad Type: Rewarded Interstitial
- **Longer Duration**: 15-30 seconds (vs 5 seconds for regular interstitial)
- **Non-Skippable Initially**: User must watch for several seconds before skip button appears
- **Higher Revenue**: Typically pays 2-5x more than regular interstitials
- **User-Friendly**: Only shows when user is already leaving the app

### Current Configuration (TEST MODE)

```typescript
// Test Ad Unit ID (in useExitAd.ts)
const TEST_AD_UNIT_ID = TestIds.REWARDED_INTERSTITIAL;

// Test ID Value: ca-app-pub-3940256099942544/5354046379
```

## How It Works

### User Flow

1. **User presses back button** on main screen
2. **Exit ad loads** (if not already loaded)
3. **Ad shows immediately** (full-screen rewarded interstitial)
4. **User watches ad** (15-30 seconds, can't skip initially)
5. **Ad closes** → App exits

### Technical Flow

```
Back Button Press
    ↓
Check if ad loaded?
    ↓ YES
Show Rewarded Interstitial
    ↓
User watches/closes ad
    ↓
BackHandler.exitApp()
```

```
Back Button Press
    ↓
Check if ad loaded?
    ↓ NO
Load ad for next time
    ↓
Allow immediate exit
```

## Files

### Created
- `hooks/useExitAd.ts` - Exit ad hook with back button handling

### Modified
- `App.tsx` - Integrated useExitAd hook

## Code Implementation

### useExitAd Hook

```typescript
import { useExitAd } from './hooks/useExitAd';

// In your App component
export default function App() {
  // Enable exit ad on back button
  useExitAd({ enabled: true });

  // ... rest of your app
}
```

### Configuration Options

```typescript
useExitAd({
  enabled: true,        // Enable/disable exit ads
  adUnitId: 'custom-id' // Optional: custom ad unit ID
});
```

## Testing Instructions

### Test the Exit Ad

1. **Build the app** (native build required)
   ```bash
   eas build --profile development --platform android
   ```

2. **Install on device**

3. **Open the app**

4. **Press back button** (hardware back button)

5. **Expected behavior:**
   - Full-screen ad appears
   - Ad plays for 15-30 seconds
   - Skip button appears after ~5 seconds
   - Closing ad exits the app

### Console Logs

```bash
adb logcat | grep -i "exit ad\|rewarded"
```

**Expected logs:**
```
✅ Exit ad (Rewarded Interstitial) loaded successfully
🚪 Back button pressed (attempt 1), showing exit ad...
🎁 User earned reward: [reward details]
🚪 Exit ad closed
```

## Production Deployment

### Step 1: Create Ad Unit in AdMob

1. Go to [AdMob Console](https://apps.admob.com/)
2. Select your app
3. Click **Ad units** → **Add Ad Unit**
4. Select **Rewarded Interstitial**
5. Name it: "Exit Ad - Rewarded Interstitial"
6. Copy the ad unit ID

### Step 2: Update Code

In `hooks/useExitAd.ts`:

```typescript
// Replace this:
const TEST_AD_UNIT_ID = TestIds.REWARDED_INTERSTITIAL;

// With your production ID:
const PRODUCTION_AD_UNIT_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY';

// Update usage:
const adUnitId = options?.adUnitId || PRODUCTION_AD_UNIT_ID;
```

### Step 3: Test Production Ad

Before going live:
1. Add your device as test device in AdMob console
2. Build with production ad unit ID
3. Test that ad shows correctly
4. Never click your own ads!

## Revenue Impact

### Estimated Earnings

**Assumptions:**
- 1,000 daily active users
- 50% exit via back button = 500 exit ad impressions
- $5 CPM for rewarded interstitial (higher than regular)

**Calculation:**
- Daily: 500 impressions / 1,000 × $5 = **$2.50/day**
- Monthly: $2.50 × 30 = **$75/month**

**Combined with other ads:**
- Banner ads: ~$300/month
- Regular interstitials: ~$100/month
- Exit ads: ~$75/month
- **Total: ~$475/month**

### Revenue Optimization

1. **Load Early**: Ad loads on app start, ready for back button
2. **High Fill Rate**: Test ads ensure it always loads
3. **Non-Intrusive**: Only shows when user is leaving anyway
4. **User-Friendly**: Doesn't disrupt normal app usage

## User Experience Considerations

### Pros ✅
- Only shows when user is exiting (not intrusive)
- Doesn't interrupt app usage
- Higher revenue per impression
- Still allows exit (ad can be closed)

### Cons ⚠️
- Slightly delays app exit
- User might find it annoying if happening too often
- Must balance revenue vs user retention

### Best Practices

1. **Don't Abuse It**: Only show on actual exit attempts
2. **Quick Exit Path**: Allow closing after a few seconds
3. **Test Frequency**: Monitor if users uninstall due to exit ads
4. **A/B Testing**: Test with/without to measure retention impact

## Customization Options

### Disable Exit Ads

```typescript
// In App.tsx
useExitAd({ enabled: false }); // Disable exit ads
```

### Frequency Control

Currently shows **every time** user presses back button. To reduce frequency:

```typescript
// In useExitAd.ts, modify the back handler:
if (isLoaded && rewardedInterstitial && Math.random() < 0.5) {
  // Only show 50% of the time
  rewardedInterstitial.show();
  return true;
}
```

### Skip After X Attempts

Show ad only after multiple back presses:

```typescript
const MIN_ATTEMPTS_BEFORE_AD = 2;

if (exitAttempts.current >= MIN_ATTEMPTS_BEFORE_AD && isLoaded) {
  // Show ad only after 2nd back press
  rewardedInterstitial.show();
  exitAttempts.current = 0; // Reset
  return true;
}
```

## Troubleshooting

### Ad Not Showing

**Check:**
1. Is the app built natively? (Not Expo Go)
2. Are you using test ad unit ID?
3. Check console for "Exit ad loaded" message
4. Is internet connected?

**Fix:**
```bash
# Check logs
adb logcat | grep -i "exit ad"

# Expected:
# ✅ Exit ad (Rewarded Interstitial) loaded successfully
```

### Ad Shows But Won't Close

**Issue**: Ad UI might be stuck

**Fix:**
- Wait 30 seconds (max ad duration)
- Check for close button (usually top-right)
- Restart app and try again

### Back Button Doesn't Work

**Issue**: Back handler might be conflicting

**Fix:**
```typescript
// Disable temporarily to debug
useExitAd({ enabled: false });
```

## Testing Checklist

### Before Production

- [ ] Exit ad loads on app start
- [ ] Back button triggers ad
- [ ] Ad plays for reasonable duration
- [ ] Skip button appears
- [ ] Closing ad exits app
- [ ] Ad reloads for next exit attempt
- [ ] No crashes or freezes
- [ ] Logs show successful loading/showing

### Production Validation

- [ ] Production ad unit ID configured
- [ ] Test device added to AdMob
- [ ] Ad shows with real content
- [ ] Revenue tracking in AdMob dashboard
- [ ] User retention metrics stable
- [ ] No user complaints about excessive ads

## Analytics & Monitoring

### Key Metrics to Track

1. **Show Rate**: % of back presses that show ad
2. **Completion Rate**: % of users who watch full ad
3. **Skip Rate**: % of users who skip ad
4. **Revenue Per User**: Average earnings per active user
5. **Retention Impact**: User retention before/after exit ads

### AdMob Dashboard

Monitor in AdMob console:
- Impressions (should match exit attempts)
- Click-through rate (CTR)
- Revenue per 1000 impressions (RPM)
- Fill rate (should be ~100% with test ads)

## FAQ

### Q: Will this annoy users?
**A**: Possibly, but it only shows when they're leaving anyway. Monitor retention metrics.

### Q: How much revenue can I expect?
**A**: Rewarded interstitials typically earn $3-7 CPM, so $50-100/month for 1000 daily users.

### Q: Can users exit without watching?
**A**: Yes, they can skip after a few seconds or close the ad.

### Q: Does this work on iOS?
**A**: Yes, with iOS test ad unit ID. Currently only Android is configured.

### Q: How often should it show?
**A**: Currently every exit attempt. Consider reducing to 50% or after 2 presses.

### Q: What if ad fails to load?
**A**: App exits normally. Ad loads for next time.

## Summary

✅ **Implemented**: Rewarded interstitial ad on back button press
✅ **Test Mode**: Using Google's test ad unit ID
✅ **User Flow**: Back button → Ad → Exit
✅ **Revenue Boost**: Additional $50-100/month estimated

**Next Steps:**
1. Build and test the app
2. Verify exit ad shows on back button
3. Monitor user feedback
4. Create production ad unit when ready
5. Update with production ID

---

**Implementation Date**: 2025-10-18
**Status**: ✅ Ready for Testing
**Test Ad Unit**: `TestIds.REWARDED_INTERSTITIAL`
