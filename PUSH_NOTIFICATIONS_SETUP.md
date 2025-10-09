# Push Notifications Setup Guide for ReshmeInfo

## Current Issues Explained

### Why Notifications Show Expo Logo & Open Expo Go?
**Reason**: You're running the app in **development mode** through Expo Go.
- Development mode uses Expo's infrastructure
- All notifications route through Expo Go app
- This is normal for development/testing

### Why Others Don't Receive Notifications?
**Reason**: Expo Go notifications **only work for devices with Expo Go installed**.
- Users without Expo Go cannot receive notifications
- Production apps need standalone builds with FCM (Firebase Cloud Messaging)
- Your current setup only works in development

## Solution: Build Standalone APK

You need to create a **production APK** with proper FCM credentials. Here's how:

---

## Step 1: Get Firebase Cloud Messaging (FCM) Credentials

### 1.1 Go to Firebase Console
1. Visit: https://console.firebase.google.com/
2. Select your project
3. Click **Project Settings** (gear icon)

### 1.2 Add/Configure Android App
1. In Project Settings, scroll to **Your apps**
2. Click **Add app** → Select **Android**
3. Enter package name: `com.master.reshmeinfo`
4. Click **Register app**

### 1.3 Download google-services.json
1. Firebase will generate **google-services.json**
2. Click **Download google-services.json**
3. Save it to your project root: `Reshme_Info/google-services.json`

```bash
# Place the file here:
Reshme_Info/
├── google-services.json  ← Put it here (same level as package.json)
├── app.config.js
├── package.json
└── ...
```

### 1.4 Enable Cloud Messaging API
1. In Firebase Console → **Project Settings** → **Cloud Messaging** tab
2. Under **Cloud Messaging API (Legacy)**, note your **Server Key** (you'll need this for sending notifications)
3. Make sure **Firebase Cloud Messaging API** is enabled

---

## Step 2: Update .gitignore (Security)

Add to your `.gitignore`:
```
google-services.json
```

**Important**: Never commit `google-services.json` to public repos!

---

## Step 3: Build Standalone APK

### 3.1 Install EAS CLI (if not installed)
```bash
npm install -g eas-cli
```

### 3.2 Login to Expo
```bash
eas login
```

### 3.3 Build Production APK
```bash
eas build --platform android --profile production
```

**What happens**:
- EAS will use your `google-services.json`
- Creates standalone APK with your app icon/logo
- Notifications will show **your app icon**, not Expo logo
- Tapping notification opens **your app**, not Expo Go

### 3.4 Download APK
- Build completes in ~10-20 minutes
- Download APK from Expo dashboard
- Distribute to users

---

## Step 4: Verify Notification Setup

### 4.1 Install Standalone APK
- Uninstall Expo Go version (if installed)
- Install the new standalone APK
- Open app and grant notification permissions

### 4.2 Test Notifications
- Go to Firebase Console → **Cloud Messaging**
- Click **Send test message**
- Enter your device's push token (check app logs)
- Send notification

**Expected Result**:
✅ Notification shows with **your app icon**
✅ Tapping opens **your app** (not Expo Go)
✅ All users can receive notifications (no Expo Go required)

---

## Step 5: Send Notifications from Admin Panel

When admin adds/updates prices, the backend should send notifications using Firebase Admin SDK or FCM HTTP API.

### Option A: Firebase Admin SDK (Recommended)

**Backend setup** (Node.js example):
```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function sendPriceUpdateNotification(tokens, market, breed, minPrice, maxPrice, avgPrice) {
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
    tokens: tokens, // Array of push tokens from Firestore
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log('Successfully sent:', response.successCount);
    console.log('Failed:', response.failureCount);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}
```

### Option B: FCM HTTP API

**Direct HTTP request** (using fetch):
```javascript
async function sendNotification(token, market, breed, minPrice, maxPrice, avgPrice) {
  const FCM_SERVER_KEY = 'your-fcm-server-key'; // From Firebase Console

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
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

  return response.json();
}
```

---

## Step 6: Notification Icon

Your app is already configured to use `reshme_logo.png` as the notification icon.

**Current Setup**:
- Icon: `assets/reshme_logo.png`
- Color: #3B82F6 (Blue)
- This will be used for all push notifications

**Note**: The notification icon will automatically use your existing app logo.

---

## Architecture: How It Works

### Development (Expo Go):
```
Your App → Expo Push → Expo Go → User
          (Expo servers)
```
❌ Only works with Expo Go installed

### Production (Standalone APK):
```
Your App → FCM → Your APK → User
       (Firebase Cloud Messaging)
```
✅ Works for all users (no Expo Go needed)

---

## Troubleshooting

### Issue: "google-services.json not found"
**Solution**: Place file in project root (same level as package.json)

### Issue: Build fails with FCM errors
**Solution**:
1. Verify package name matches: `com.master.reshmeinfo`
2. Check Firebase app is configured for Android
3. Re-download `google-services.json`

### Issue: Notifications not received in production
**Solution**:
1. Check push token is saved to Firestore
2. Verify FCM API is enabled in Firebase
3. Test with Firebase Console "Send test message"
4. Check device notification permissions

### Issue: Still shows Expo logo
**Solution**: You're still running in Expo Go. Build standalone APK.

---

## Quick Checklist

- [ ] Download `google-services.json` from Firebase
- [ ] Place `google-services.json` in project root
- [ ] Add to `.gitignore`
- [ ] Run `eas build --platform android --profile production`
- [ ] Download & distribute APK
- [ ] Test notifications on standalone APK
- [ ] Verify app icon appears in notifications
- [ ] Configure backend to send notifications via FCM

---

## Security Notes

1. **Never commit** `google-services.json` to public repos
2. **Protect FCM Server Key** - use environment variables
3. **Validate tokens** before sending notifications
4. **Clean up old tokens** in Firestore (devices that uninstalled)

---

## Support

**Firebase Issues**: https://firebase.google.com/support
**EAS Build Issues**: https://docs.expo.dev/build/introduction/
**Expo Notifications**: https://docs.expo.dev/push-notifications/overview/

---

## Summary

**The Fix**:
1. Get `google-services.json` from Firebase
2. Build standalone APK with `eas build`
3. Distribute APK to users (not Expo Go)

**Result**:
✅ Notifications show your app icon
✅ All users receive notifications
✅ Tapping opens your app
✅ Professional production experience
