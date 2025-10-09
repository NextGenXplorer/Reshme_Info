# Notification Testing Guide

## Quick Test (2 minutes)

### Option A: Using Test Script (Automated)

```bash
# 1. Start backend server (Terminal 1)
cd backend
npm start

# 2. Run test script (Terminal 2 - new terminal)
cd backend
node test-notifications.js
```

### Option B: Manual Testing with curl

```bash
# 1. Start backend
cd backend
npm start

# 2. Test health endpoint
curl http://localhost:3000/

# Expected: {"status":"ok","message":"ReshmeInfo Notification Server is running"}

# 3. Test notification sending
curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "priceData": {
      "market": "Test Market",
      "breed": "CB",
      "minPrice": 450,
      "maxPrice": 550,
      "avgPrice": 500
    }
  }'

# Expected: {"success":true,"fcmSent":0,"expoSent":0,...}
```

---

## Complete End-to-End Test (5 minutes)

### Step 1: Start Backend Server

**Terminal 1:**
```bash
cd backend
npm start

# You should see:
# 🚀 Server running on port 3000
# 📡 FCM Notification Server ready
```

### Step 2: Verify Backend is Running

**Terminal 2:**
```bash
# Test health endpoint
curl http://localhost:3000/

# ✅ Expected output:
{
  "status": "ok",
  "message": "ReshmeInfo Notification Server is running",
  "timestamp": "2025-10-09T..."
}
```

### Step 3: Check Push Tokens in Firestore

Open Firebase Console:
1. Go to https://console.firebase.google.com/
2. Select **reshmeinfo** project
3. Click **Firestore Database**
4. Look for **pushTokens** collection
5. You should see tokens with `tokenType: "fcm"` or `"expo"`

**Example token document:**
```json
{
  "token": "ExponentPushToken[xxx]" or "fcm_token_xxx",
  "tokenType": "expo" or "fcm",
  "platform": "android",
  "createdAt": "timestamp",
  "deviceInfo": {
    "os": "android",
    "version": "14"
  }
}
```

### Step 4: Test Notification Endpoint

```bash
curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "priceData": {
      "market": "Ramanagara",
      "breed": "CB",
      "minPrice": 450,
      "maxPrice": 550,
      "avgPrice": 500,
      "quality": "A",
      "lotNumber": 123
    }
  }'
```

**✅ Success Response:**
```json
{
  "success": true,
  "message": "Notifications sent successfully",
  "fcmSent": 2,      // Number of FCM notifications sent
  "expoSent": 1,     // Number of Expo notifications sent
  "totalSent": 3,
  "totalFailed": 0,
  "invalidTokensRemoved": 0
}
```

**Check backend console logs:**
```
📱 Sending to 2 FCM tokens...
✅ FCM sent: 2
❌ FCM failed: 0
📱 Sending to 1 Expo tokens...
✅ Expo sent: 1
❌ Expo failed: 0
```

### Step 5: End-to-End Test in App

1. **Open app on test device**
2. **Check logs** to confirm token registration:
   ```
   Push Token (Production): fcm_token_xxx
   Push token saved to Firestore
   ```

3. **Login as Admin:**
   - Username: `super_admin`
   - Password: `@Mithun#7411`

4. **Update a Price:**
   - Market: Ramanagara
   - Breed: CB
   - Prices: Min 450, Max 550, Avg 500
   - Save

5. **Check App Logs:**
   ```
   ✅ Notifications sent successfully
   📨 FCM: 2, Expo: 1, Total: 3
   ```

6. **Users Should Receive Notification:**
   - Title: "Ramanagara - CB Price Update"
   - Body: "Min: ₹450 | Max: ₹550 | Avg: ₹500/kg"

---

## Troubleshooting

### Backend Not Starting

**Error:** `Cannot find module 'firebase-admin'`
```bash
cd backend
npm install
npm start
```

**Error:** `Firebase service account invalid`
- Check `backend/.env` has valid `FIREBASE_SERVICE_ACCOUNT`
- Regenerate from Firebase Console → Settings → Service Accounts

### No Tokens Found

**Problem:** `No FCM tokens found`

**Solution:**
1. Open app on device
2. Grant notification permission
3. Check Firebase Console → Firestore → pushTokens
4. Token should appear within 5 seconds

### Notifications Not Received

**Check 1: Backend URL in App**
```bash
# App .env should have:
EXPO_PUBLIC_BACKEND_URL="http://YOUR_NETWORK_IP:3000"

# NOT localhost if testing on physical device!
```

**Check 2: Network Connection**
```bash
# Test from device browser or curl from another machine:
curl http://192.168.1.100:3000/
```

**Check 3: Firebase Permissions**
- Service account must have "Firebase Cloud Messaging API" enabled
- Check Firebase Console → Settings → Service Accounts → Permissions

### Testing on Local Network

**Find your local IP:**
```bash
# Linux/Mac
ifconfig | grep "inet " | grep -v 127.0.0.1

# Output: inet 192.168.1.100
```

**Update app .env:**
```bash
EXPO_PUBLIC_BACKEND_URL="http://192.168.1.100:3000"
```

**Restart app:**
```bash
npm start
# Press 'a' for Android
```

---

## Testing Checklist

- [ ] Backend server starts without errors
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Firestore has push tokens in `pushTokens` collection
- [ ] Test notification endpoint succeeds
- [ ] Backend logs show notifications sent
- [ ] App logs show correct response fields
- [ ] Users receive notifications on device
- [ ] Tapping notification opens app
- [ ] Invalid tokens are cleaned up

---

## Production Testing

### After Deploying to Render/Railway

**Update app .env:**
```bash
EXPO_PUBLIC_BACKEND_URL="https://your-app.onrender.com"
```

**Rebuild APK:**
```bash
eas build --platform android --profile production
```

**Test deployed backend:**
```bash
curl https://your-app.onrender.com/

curl -X POST https://your-app.onrender.com/send-notification \
  -H "Content-Type: application/json" \
  -d '{"priceData":{"market":"Test","breed":"CB","minPrice":100,"maxPrice":200,"avgPrice":150}}'
```

---

## Success Criteria

✅ All automated tests pass
✅ Backend logs show successful sends
✅ Users receive notifications
✅ Invalid tokens cleaned up automatically
✅ Price saves complete even if notifications fail
✅ No errors in app or backend logs

**🎉 Notification system is working!**
