# Firebase Cloud Messaging (FCM) - Quick Guide

## ✅ What's Ready

Your app is already configured with **Firebase Cloud Messaging (FCM)**!
- ✅ App.tsx configured with FCM token support
- ✅ app.config.js has expo-notifications plugin
- ✅ google-services.json in place
- ✅ Firebase project already set up

---

## 🚀 Next Steps (Super Simple!)

### Step 1: Build Production APK

```bash
eas build --platform android --profile production
```

**What happens:**
- Builds standalone APK with FCM support
- Uses your google-services.json for credentials
- Takes ~10-20 minutes

---

### Step 2: Install APK & Get Token

1. Download APK from EAS build link
2. Install on test device
3. Open app → Grant notification permission
4. Check console logs → Copy the **FCM token**
   - Looks like: `dKj3...xyz` (long string)
   - Shows as: `FCM Push Token (Production): ...`

---

### Step 3: Send Test Notification from Firebase Console

**No coding needed! Use Firebase web interface:**

#### Method A: Send to Single Device (Testing)

1. Go to https://console.firebase.google.com/
2. Select your project
3. Click **Cloud Messaging** (left sidebar)
4. Click **Send your first message**
5. **Notification title:** "Test Notification"
6. **Notification text:** "Hello from ReshmeInfo!"
7. Click **Next**
8. **Send test message**
9. Paste your FCM token
10. Click **Test** → **Done!** 🎉

#### Method B: Send to All Users (Production)

1. Firebase Console → **Cloud Messaging**
2. Click **New campaign** → **Firebase Notification messages**
3. Fill in:
   - **Notification title:** "Koyambedu - Broiler Price Update"
   - **Notification text:** "Min: ₹130 | Max: ₹150 | Avg: ₹140/kg"
   - **Notification image (optional):** Upload image if needed
4. Click **Next**
5. **Target:** Select your Android app
6. Click **Next** → **Review** → **Publish**

**All users get the notification!** ✅

---

## 📨 Send Notifications - Different Methods

### Option 1: Firebase Console (Easiest - No Code!)

**Perfect for manual price updates!**

1. Admin opens Firebase Console
2. Cloud Messaging → New notification
3. Enter details → Send
4. **Done!**

**Pros:**
- ✅ No coding needed
- ✅ Free
- ✅ Easy to use

**Cons:**
- ⚠️ Manual process (need to open browser each time)

---

### Option 2: Firebase Admin SDK (Automated)

**For automated notifications when admin updates prices in your app.**

#### Backend Setup (Node.js example):

**1. Install Firebase Admin SDK:**
```bash
npm install firebase-admin
```

**2. Download Service Account Key:**
- Firebase Console → Project Settings → Service Accounts
- Click **Generate new private key**
- Save as `serviceAccountKey.json`
- **Keep it secret!** Don't commit to Git

**3. Send Notification Code:**

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize (only once)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Function to send price update notification
async function sendPriceUpdate(market, breed, minPrice, maxPrice, avgPrice) {
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

    // Create message
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
      tokens: tokens, // Send to all devices
    };

    // Send notification
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log('✅ Success:', response.successCount);
    console.log('❌ Failed:', response.failureCount);

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });

      // Delete invalid tokens
      for (const token of failedTokens) {
        await admin.firestore().collection('pushTokens').doc(token).delete();
      }
      console.log(`🗑️ Cleaned up ${failedTokens.length} invalid tokens`);
    }

  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// Example usage
sendPriceUpdate('Koyambedu', 'Broiler', 130, 150, 140);
```

**4. Call from Admin Panel:**

When admin updates price in your app, call this function:

```javascript
// In your admin price update handler
await sendPriceUpdate(market, breed, minPrice, maxPrice, avgPrice);
```

---

### Option 3: FCM HTTP v1 API (REST API)

**Direct HTTP calls - works from any backend.**

**1. Get Access Token:**

You need OAuth 2.0 token from your service account.

**2. Send Request:**

```javascript
async function sendNotificationHTTP(market, breed, minPrice, maxPrice, avgPrice) {
  const PROJECT_ID = 'your-project-id'; // From Firebase Console
  const ACCESS_TOKEN = 'your-oauth-token'; // From service account

  // Get all FCM tokens from your database
  const tokens = await getTokensFromFirestore();

  for (const token of tokens) {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: token,
            notification: {
              title: `${market} - ${breed} Price Update`,
              body: `Min: ₹${minPrice} | Max: ₹${maxPrice} | Avg: ₹${avgPrice}/kg`,
            },
            data: {
              screen: 'Market',
              market: market,
            },
            android: {
              notification: {
                icon: 'notification_icon',
                color: '#3B82F6',
              },
            },
          },
        }),
      }
    );

    const result = await response.json();
    console.log('Notification sent:', result);
  }
}
```

---

## 🎯 Recommended Approach

**Start Simple → Add Automation Later**

### Phase 1: Manual (Launch quickly!)
- Use **Firebase Console** to send notifications
- Admin opens browser → sends notification
- **No code needed!**

### Phase 2: Automated (Add later)
- Integrate **Firebase Admin SDK** into your backend
- Auto-send when admin updates prices
- **Better user experience**

---

## 📊 Check Notification Delivery

**Firebase Console → Cloud Messaging → Campaigns**

See:
- ✅ Notifications sent
- ✅ Delivery rate
- ✅ Open rate
- ✅ Devices reached

---

## 🔧 Token Management

Your app already saves tokens to Firestore:

**Collection:** `pushTokens`
**Document:** `[token]`
**Fields:**
- `token`: FCM token
- `tokenType`: "fcm" or "expo"
- `platform`: "android"
- `createdAt`: timestamp
- `deviceInfo`: OS details

**View tokens:**
```javascript
// In Firestore console or your admin panel
const tokensSnapshot = await db.collection('pushTokens').get();
tokensSnapshot.forEach(doc => {
  console.log('Token:', doc.data().token);
});
```

---

## ✅ Complete Checklist

- [x] ✅ FCM integrated in app
- [x] ✅ google-services.json added
- [x] ✅ Firebase project configured
- [ ] ⏳ Build production APK
- [ ] ⏳ Install APK on device
- [ ] ⏳ Get FCM token from console logs
- [ ] ⏳ Test notification from Firebase Console
- [ ] ⏳ Verify notification shows your app icon
- [ ] ⏳ Share APK with users

---

## 🎯 Expected Results

**After Building APK:**
- ✅ Notifications show **your app icon** (reshme_logo.png)
- ✅ Tapping notification opens **your app**
- ✅ Works for **all users** (no Expo Go needed)
- ✅ Send from **Firebase Console** (no coding!)

---

## 🆘 Troubleshooting

### Issue: Notifications not received

**Check:**
1. Device has internet connection?
2. Notification permission granted?
3. FCM token saved in Firestore?
4. Token type is "fcm" not "expo"?
5. Using production APK (not Expo Go)?

### Issue: Still shows Expo logo

**Solution:** You're running in Expo Go. Build production APK.

### Issue: Token not in Firestore

**Check:**
1. App logs show token?
2. Firestore permissions allow writes?
3. App has internet at first launch?

---

## 📚 Firebase Documentation

- **Cloud Messaging:** https://firebase.google.com/docs/cloud-messaging
- **Admin SDK:** https://firebase.google.com/docs/admin/setup
- **Send Messages:** https://firebase.google.com/docs/cloud-messaging/send-message

---

## 🚀 Next Step

**Run this command now:**

```bash
eas build --platform android --profile production
```

**Then:**
1. Download APK
2. Install on device
3. Open Firebase Console
4. Send your first notification! 🎉

---

## Summary

**What's Done:**
- ✅ App fully configured for FCM
- ✅ Ready to build production APK

**What You Do:**
1. Build APK (1 command)
2. Send notifications from Firebase Console (web browser)

**Result:**
- 🎉 Professional push notifications
- 🆓 Completely free
- 📱 Works for all users

---

**Ready? Build the APK now!** 🚀

```bash
eas build --platform android --profile production
```
