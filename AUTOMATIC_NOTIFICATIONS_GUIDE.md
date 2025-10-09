# Automatic Notifications Setup Guide

## Current Status

✅ **Fixed**: Code now separates FCM tokens from Expo tokens
⚠️ **Issue**: FCM tokens need proper backend to send notifications

## Why FCM Tokens Don't Work from Client

**Security**: FCM requires a **Server Key** which should NEVER be exposed in client code.

**Current Flow**:
```
Admin updates price → sendPushNotifications() called
├── ✅ Expo tokens: Sent via Expo service (works)
└── ❌ FCM tokens: Logged but not sent (needs backend)
```

---

## Solution Options

### Option 1: Manual (Temporary - Works Now!)

When admin updates prices, **manually send from Firebase Console**:

1. Admin updates price in app
2. Check console logs for FCM tokens
3. Open Firebase Console → Cloud Messaging
4. Click "Send test message"
5. Paste FCM token
6. Enter notification details
7. Send

**Pros**: Works immediately, no code changes
**Cons**: Manual process each time

---

### Option 2: Client-Side FCM (Quick but NOT Recommended)

Add FCM Server Key to client code for testing.

⚠️ **WARNING**: This exposes your server key - only for testing!

#### Steps:

**1. Get FCM Server Key:**
- Firebase Console → Project Settings → Cloud Messaging
- Copy **Server Key** (starts with "AAAA...")

**2. Add to .env:**
```bash
EXPO_PUBLIC_FCM_SERVER_KEY="AAAA..." # Your server key
```

**3. Update AdminPriceFormScreen.tsx:**

Replace the FCM section (lines 171-180) with:

```typescript
// Send to FCM tokens (production users)
if (fcmTokens.length > 0) {
  console.log(`Sending to ${fcmTokens.length} FCM tokens`);

  const FCM_SERVER_KEY = process.env.EXPO_PUBLIC_FCM_SERVER_KEY;

  if (!FCM_SERVER_KEY) {
    console.error('FCM_SERVER_KEY not found in .env');
  } else {
    for (const token of fcmTokens) {
      try {
        await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${FCM_SERVER_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: token,
            notification: {
              title: notificationTitle,
              body: notificationBody,
              icon: 'notification_icon',
              color: '#3B82F6',
            },
            data: {
              screen: 'Market',
              market: priceData.market,
              breed: priceData.breed,
            },
          }),
        });
        console.log(`FCM notification sent to: ${token.substring(0, 20)}...`);
      } catch (error) {
        console.error('FCM send error:', error);
      }
    }
  }
}
```

**Pros**: Works automatically, immediate solution
**Cons**:
- ⚠️ Security risk (server key in client)
- ⚠️ Not recommended for production
- ⚠️ Anyone can decompile APK and steal key

---

### Option 3: Firebase Cloud Functions (RECOMMENDED - Production Ready)

Proper backend solution - notifications sent from secure server.

#### Architecture:
```
Admin updates price → Firestore updated → Cloud Function triggered → Send FCM notifications
```

#### Setup Steps:

**1. Install Firebase CLI:**
```bash
npm install -g firebase-tools
firebase login
```

**2. Initialize Cloud Functions:**
```bash
firebase init functions
# Select: JavaScript or TypeScript
# Install dependencies: Yes
```

**3. Create Function (functions/index.js):**

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendPriceUpdateNotification = functions.firestore
  .document('cocoonPrices/{priceId}')
  .onWrite(async (change, context) => {
    // Triggered when price is added or updated
    const priceData = change.after.data();

    if (!priceData) return; // Document was deleted

    try {
      // Get all FCM tokens
      const tokensSnapshot = await admin.firestore()
        .collection('pushTokens')
        .where('tokenType', '==', 'fcm')
        .get();

      const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

      if (tokens.length === 0) {
        console.log('No FCM tokens found');
        return;
      }

      // Create notification message
      const message = {
        notification: {
          title: `${priceData.market} - ${priceData.breed} Price Update`,
          body: `Min: ₹${priceData.minPrice} | Max: ₹${priceData.maxPrice} | Avg: ₹${priceData.avgPrice}/kg`,
        },
        data: {
          screen: 'Market',
          market: priceData.market,
          breed: priceData.breed,
        },
        tokens: tokens,
      };

      // Send to all FCM tokens
      const response = await admin.messaging().sendEachForMulticast(message);

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

        // Delete invalid tokens
        for (const token of failedTokens) {
          await admin.firestore().collection('pushTokens').doc(token).delete();
        }
        console.log(`🗑️ Cleaned up ${failedTokens.length} invalid tokens`);
      }

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  });
```

**4. Deploy:**
```bash
firebase deploy --only functions
```

**5. Remove client-side notification code:**

Update AdminPriceFormScreen.tsx - remove the `await sendPushNotifications(priceData);` call on line 148 since Cloud Function handles it automatically.

**Pros**:
- ✅ Secure (server key never exposed)
- ✅ Automatic (triggers on Firestore changes)
- ✅ Production-ready
- ✅ Reliable (runs on Google servers)

**Cons**:
- Requires Firebase billing (free tier available)
- Initial setup time

---

## Recommended Path

**For Immediate Testing** (Today):
→ Use **Option 1** (Manual Firebase Console)

**For Production** (This Week):
→ Implement **Option 3** (Cloud Functions)

**Avoid**:
→ Option 2 (Client-side FCM) - Security risk

---

## Testing Checklist

After implementing your chosen option:

- [ ] Admin updates price in app
- [ ] Check Firestore - price updated
- [ ] Check console logs - FCM tokens identified
- [ ] Notification sent automatically (Option 2/3) or manually (Option 1)
- [ ] Production APK users receive notification
- [ ] Notification shows app icon
- [ ] Tapping notification opens app to Market screen

---

## Current Code Status

✅ **What's Working**:
- Token type detection (FCM vs Expo)
- Expo token notifications (Expo Go users)
- Logging of FCM tokens

⚠️ **What Needs Implementation**:
- FCM notification sending (choose Option 1, 2, or 3)

---

## Need Help?

**Option 1 (Manual)**: Already working - just use Firebase Console
**Option 2 (Client-side)**: I can add the code if you provide FCM Server Key
**Option 3 (Cloud Functions)**: I can set up the complete Cloud Functions project

Which option would you like to implement?
