# Production Notifications Fix - Complete Guide

## ✅ What's Fixed

**App.tsx Updated:**
- ✅ Now uses `getDevicePushTokenAsync()` for production (FCM tokens)
- ✅ Falls back to Expo tokens for development in Expo Go
- ✅ Stores token type in Firestore (`expo` vs `fcm`)
- ✅ Added device info for better tracking

**.gitignore Updated:**
- ✅ Added `google-services.json` to prevent accidental commits

---

## 🚀 Next Steps to Fix Notifications

### Step 1: Build Production APK

```bash
# Make sure you're logged in to Expo
eas login

# Build production APK with FCM support
eas build --platform android --profile production
```

**What happens:**
- EAS uses your `google-services.json` for FCM credentials
- Builds standalone APK with your app icon
- Takes ~10-20 minutes
- You'll get a download link when done

### Step 2: Download & Install APK

1. Download APK from the EAS build link
2. Send APK to test devices
3. Install APK (allow "Install from Unknown Sources" if needed)
4. **Important:** Uninstall Expo Go version first if installed

### Step 3: Test Notifications

**On the device:**
1. Open the installed APK
2. Grant notification permissions when prompted
3. Check the console logs to see the FCM token

**Check Firestore:**
```
Collection: pushTokens
Document: [token]
Fields:
  - token: "abc123..." (FCM token, NOT ExponentPushToken)
  - tokenType: "fcm" (not "expo")
  - platform: "android"
  - createdAt: [timestamp]
```

---

## 📱 Sending Notifications

### Method 1: Firebase Console (Quick Test)

1. Go to https://console.firebase.google.com/
2. Select your project
3. Click **Cloud Messaging** → **Send test message**
4. Enter the FCM token from Firestore
5. Send notification

**Expected Result:**
- ✅ Notification shows with **your app icon** (not Expo logo)
- ✅ Tapping opens **your app** (not Expo Go)
- ✅ Works for all users (no Expo Go needed)

### Method 2: From Admin Panel (Production)

You'll need to update your backend to send notifications using FCM. Here are two approaches:

#### Option A: Firebase Admin SDK (Recommended)

**Install:**
```bash
npm install firebase-admin
```

**Backend code (Node.js/Cloud Functions):**
```javascript
const admin = require('firebase-admin');

// Initialize (only once)
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Send notification when price is updated
async function sendPriceUpdateNotification(market, breed, minPrice, maxPrice, avgPrice) {
  try {
    // Get all FCM tokens from Firestore
    const tokensSnapshot = await admin.firestore()
      .collection('pushTokens')
      .where('tokenType', '==', 'fcm')
      .get();

    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

    if (tokens.length === 0) {
      console.log('No FCM tokens found');
      return;
    }

    // Send to all tokens
    const message = {
      notification: {
        title: `${market} - ${breed} Price Update`,
        body: `Min: ₹${minPrice} | Max: ₹${maxPrice} | Avg: ₹${avgPrice}/kg`,
      },
      data: {
        screen: 'Market',
        market: market,
        breed: breed,
      },
      tokens: tokens, // Send to multiple devices
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(`✅ Successfully sent: ${response.successCount}`);
    console.log(`❌ Failed: ${response.failureCount}`);

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });

      // Delete invalid tokens from Firestore
      for (const token of failedTokens) {
        await admin.firestore().collection('pushTokens').doc(token).delete();
      }
      console.log(`🗑️ Cleaned up ${failedTokens.length} invalid tokens`);
    }

  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// Call this when admin updates prices
sendPriceUpdateNotification('Koyambedu', 'Broiler', 130, 150, 140);
```

#### Option B: FCM HTTP API (Simple)

**Get FCM Server Key:**
1. Firebase Console → Project Settings → Cloud Messaging
2. Copy **Server Key**

**Send notification:**
```javascript
async function sendNotification(fcmToken, market, breed, minPrice, maxPrice, avgPrice) {
  const FCM_SERVER_KEY = 'YOUR_FCM_SERVER_KEY'; // From Firebase Console

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: fcmToken, // Single token
      notification: {
        title: `${market} - ${breed} Price Update`,
        body: `Min: ₹${minPrice} | Max: ₹${maxPrice} | Avg: ₹${avgPrice}/kg`,
        icon: 'notification_icon',
        color: '#3B82F6',
      },
      data: {
        screen: 'Market',
        market: market,
        breed: breed,
      },
    }),
  });

  const result = await response.json();
  console.log('Notification sent:', result);
  return result;
}

// Send to all FCM tokens
async function sendToAllUsers(market, breed, minPrice, maxPrice, avgPrice) {
  const tokensSnapshot = await db.collection('pushTokens')
    .where('tokenType', '==', 'fcm')
    .get();

  for (const doc of tokensSnapshot.docs) {
    const token = doc.data().token;
    await sendNotification(token, market, breed, minPrice, maxPrice, avgPrice);
  }
}
```

---

## 🔍 Troubleshooting

### Issue: Still showing Expo logo
**Cause:** You're still running in Expo Go
**Solution:** Build and install standalone APK

### Issue: Notifications not received
**Check:**
1. Device notification permissions granted?
2. FCM token saved in Firestore with `tokenType: "fcm"`?
3. Firebase Cloud Messaging API enabled?
4. App is the standalone APK, not Expo Go?

### Issue: Build fails
**Check:**
1. `google-services.json` exists in project root
2. Package name in Firebase matches: `com.master.reshmeinfo`
3. Run `eas build:configure` first

### Issue: Token type is still "expo"
**Cause:** App is running in Expo Go
**Solution:** Must install standalone APK for FCM tokens

---

## 📋 Quick Checklist

- [x] ✅ App.tsx updated to use FCM tokens
- [x] ✅ .gitignore updated to exclude google-services.json
- [x] ✅ google-services.json exists in project root
- [ ] ⏳ Build production APK with `eas build`
- [ ] ⏳ Download and install APK on test device
- [ ] ⏳ Verify FCM token in Firestore (`tokenType: "fcm"`)
- [ ] ⏳ Test notification from Firebase Console
- [ ] ⏳ Update backend to send notifications via FCM
- [ ] ⏳ Test end-to-end flow

---

## 🎯 Expected Results

**Before (Expo Go):**
- ❌ Shows Expo logo
- ❌ Opens Expo Go
- ❌ Only works for you
- ❌ Token type: "expo"

**After (Production APK):**
- ✅ Shows your app icon (reshme_logo.png)
- ✅ Opens your app
- ✅ Works for all users
- ✅ Token type: "fcm"

---

## 📚 References

- **Firebase Cloud Messaging**: https://firebase.google.com/docs/cloud-messaging
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **Expo Notifications**: https://docs.expo.dev/push-notifications/overview/
- **Firebase Admin SDK**: https://firebase.google.com/docs/admin/setup

---

## 🆘 Need Help?

If you encounter issues:
1. Check Firestore for token type (`expo` vs `fcm`)
2. Check build logs in EAS dashboard
3. Test notification from Firebase Console first
4. Verify google-services.json package name matches

---

**Next Step:** Run `eas build --platform android --profile production`
