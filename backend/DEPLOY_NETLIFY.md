# Deploy to Netlify - Serverless Functions Guide

## ⚠️ Important Differences

**Your current backend (Express):**
```javascript
app.listen(3000) // Server always running
```

**Netlify requires (Serverless Functions):**
```javascript
exports.handler = async (event) => { ... } // Runs on-demand
```

---

## Pros & Cons

### ✅ Pros
- Free tier: Generous limits
- Always-on (no cold starts in most cases)
- Global CDN
- Automatic HTTPS
- Easy deployments

### ⚠️ Cons
- **Requires code changes** (convert Express → serverless)
- 10-second function timeout
- More complex setup than Render/Railway

---

## Should You Use Netlify?

**Use Netlify if:**
- You want always-on without sleep
- Your notifications send in < 10 seconds
- You're comfortable with serverless architecture

**Use Render/Railway if:**
- You want to deploy **as-is** (no code changes)
- Simpler setup preferred
- Traditional server architecture

---

## Option 1: Convert to Netlify Functions (Recommended)

### Step 1: Restructure Project

**Create new file structure:**
```
backend/
├── netlify/
│   └── functions/
│       └── send-notification.js  ← Serverless function
├── netlify.toml                   ← Config file
├── package.json
└── .env
```

### Step 2: Create Serverless Function

**File: `netlify/functions/send-notification.js`**
```javascript
const admin = require('firebase-admin');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || 'reshmeinfo'
  });
}

const db = admin.firestore();
const messaging = admin.messaging();

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { priceData } = JSON.parse(event.body);

    if (!priceData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'priceData is required',
        }),
      };
    }

    // Get all tokens from Firestore
    const tokensSnapshot = await db.collection('pushTokens').get();

    if (tokensSnapshot.empty) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No tokens found',
          fcmSent: 0,
          expoSent: 0,
          totalSent: 0,
          totalFailed: 0,
          invalidTokensRemoved: 0,
        }),
      };
    }

    const allTokens = tokensSnapshot.docs.map(doc => doc.data());
    const fcmTokens = allTokens.filter(t => t.tokenType === 'fcm').map(t => t.token);
    const expoTokens = allTokens.filter(t => t.tokenType === 'expo' || !t.tokenType).map(t => t.token);

    const notificationTitle = `${priceData.market} - ${priceData.breed} Price Update`;
    const notificationBody = `Min: ₹${priceData.minPrice} | Max: ₹${priceData.maxPrice} | Avg: ₹${priceData.avgPrice}/kg`;

    let fcmSent = 0;
    let fcmFailed = 0;
    let expoSent = 0;
    let expoFailed = 0;
    let invalidTokensRemoved = 0;

    // Send to FCM tokens
    if (fcmTokens.length > 0) {
      const fcmMessage = {
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        data: {
          screen: 'Market',
          market: priceData.market,
          breed: priceData.breed,
          minPrice: String(priceData.minPrice),
          maxPrice: String(priceData.maxPrice),
          avgPrice: String(priceData.avgPrice),
        },
        android: {
          notification: {
            color: '#3B82F6',
            sound: 'default',
          },
        },
        tokens: fcmTokens,
      };

      const fcmResponse = await messaging.sendEachForMulticast(fcmMessage);
      fcmSent = fcmResponse.successCount;
      fcmFailed = fcmResponse.failureCount;

      // Clean up invalid FCM tokens
      const invalidFcmTokens = [];
      fcmResponse.responses.forEach((resp, idx) => {
        if (!resp.success) {
          invalidFcmTokens.push(fcmTokens[idx]);
        }
      });

      if (invalidFcmTokens.length > 0) {
        await Promise.all(
          invalidFcmTokens.map(token =>
            db.collection('pushTokens').doc(token).delete()
          )
        );
        invalidTokensRemoved += invalidFcmTokens.length;
      }
    }

    // Send to Expo tokens
    if (expoTokens.length > 0) {
      const expoMessage = {
        to: expoTokens,
        sound: 'default',
        title: notificationTitle,
        body: notificationBody,
        data: {
          priceData,
          screen: 'Market',
          market: priceData.market,
          breed: priceData.breed,
        },
      };

      const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expoMessage),
      });

      const expoResult = await expoResponse.json();

      if (expoResult.data && Array.isArray(expoResult.data)) {
        expoSent = expoResult.data.filter(r => r.status === 'ok').length;
        expoFailed = expoResult.data.filter(r => r.status === 'error').length;

        const invalidExpoTokens = [];
        expoResult.data.forEach((resp, idx) => {
          if (resp.status === 'error') {
            invalidExpoTokens.push(expoTokens[idx]);
          }
        });

        if (invalidExpoTokens.length > 0) {
          await Promise.all(
            invalidExpoTokens.map(token =>
              db.collection('pushTokens').doc(token).delete()
            )
          );
          invalidTokensRemoved += invalidExpoTokens.length;
        }
      } else {
        expoFailed = expoTokens.length;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Notifications sent successfully',
        fcmSent,
        expoSent,
        totalSent: fcmSent + expoSent,
        totalFailed: fcmFailed + expoFailed,
        invalidTokensRemoved,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};
```

### Step 3: Create netlify.toml

**File: `netlify.toml`**
```toml
[build]
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

### Step 4: Update package.json

```json
{
  "name": "reshmeinfo-notification-server",
  "version": "1.0.0",
  "description": "Notification server for ReshmeInfo",
  "dependencies": {
    "firebase-admin": "^12.7.0"
  }
}
```

### Step 5: Deploy to Netlify

**Via Netlify CLI:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize
netlify init

# Deploy
netlify deploy --prod
```

**Via GitHub (Easier):**
1. Push code to GitHub
2. Go to https://app.netlify.com/
3. Click "Add new site" → "Import an existing project"
4. Connect GitHub repository
5. Configure:
   - Build command: (leave empty)
   - Publish directory: (leave empty)
   - Functions directory: `netlify/functions`
6. Add environment variables:
   - `FIREBASE_PROJECT_ID`: reshmeinfo
   - `FIREBASE_SERVICE_ACCOUNT`: (your service account JSON)
7. Deploy!

### Step 6: Get Your URL

Netlify gives you:
```
https://reshmeinfo-notifications.netlify.app/.netlify/functions/send-notification
```

Update app `.env`:
```bash
EXPO_PUBLIC_BACKEND_URL="https://reshmeinfo-notifications.netlify.app/.netlify/functions"
```

Update app code to call:
```javascript
await fetch(`${BACKEND_URL}/send-notification`, ...)
```

---

## Option 2: Keep Express + Use Netlify Dev (Not Recommended)

This keeps your Express code but requires running `netlify dev` locally.
**Not suitable for production deployment.**

---

## Testing

```bash
# Test serverless function
curl -X POST https://reshmeinfo-notifications.netlify.app/.netlify/functions/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "priceData": {
      "market": "Test",
      "breed": "CB",
      "minPrice": 100,
      "maxPrice": 200,
      "avgPrice": 150
    }
  }'
```

---

## Limitations

1. **10-second timeout**: If sending to many users (>100), might timeout
2. **Cold starts**: First request might be slower (~1-2 sec)
3. **Code changes**: Must convert Express → serverless
4. **Complexity**: More complex than Render/Railway

---

## Cost

**Netlify Free Tier:**
- 125K function invocations/month
- 100 GB bandwidth
- **Cost: $0/month**

For your use case (~100-1000 notifications/month):
✅ Completely free, will never hit limits

---

## Recommendation

**For your use case, I recommend:**

1. **Best: Render.com** - Deploy as-is, no code changes
2. **Good: Railway.app** - Always-on, deploy as-is
3. **Advanced: Netlify** - If you want to learn serverless

**Netlify is overkill for your needs** - Render/Railway are simpler and work with your existing code.

---

## Quick Comparison

| Aspect | Netlify | Render | Railway |
|--------|---------|--------|---------|
| Code changes | ⚠️ Required | ✅ None | ✅ None |
| Setup time | 20 min | 5 min | 5 min |
| Always-on | ✅ Yes | ❌ Sleeps | ✅ Yes |
| Learning curve | Medium | Easy | Easy |
| Your use case | ⚠️ Overkill | ✅ Perfect | ✅ Perfect |

---

## Decision

**Should you use Netlify?**

- ❌ **No**, if you want simplest deployment → Use Render.com
- ✅ **Yes**, if you want to learn serverless architecture
- ✅ **Yes**, if you need always-on FREE tier

**My recommendation: Start with Render.com** (easiest), then migrate to Netlify later if needed.
