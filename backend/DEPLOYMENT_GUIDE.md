# Backend Server Deployment Guide

This backend server handles automatic FCM notifications for ReshmeInfo app.

## 📋 Prerequisites

- Node.js 18+ installed
- Firebase Admin SDK service account key
- Free hosting account (Render.com or Railway.app recommended)

---

## 🔑 Step 1: Get Firebase Service Account Key

1. Go to **Firebase Console**: https://console.firebase.google.com/
2. Select your project: **reshmeinfo**
3. Click **⚙️ Settings** → **Project settings**
4. Go to **Service accounts** tab
5. Click **"Generate new private key"**
6. Download the JSON file
7. **Keep it safe** - this file has full access to your Firebase project!

The downloaded file looks like:
```json
{
  "type": "service_account",
  "project_id": "reshmeinfo",
  "private_key_id": "xxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxx@reshmeinfo.iam.gserviceaccount.com",
  ...
}
```

---

## 🚀 Step 2: Deploy to Render.com (Free Tier)

### A. Create Render Account
1. Go to https://render.com/
2. Sign up with GitHub (recommended)
3. Verify your email

### B. Deploy Backend

1. **Push code to GitHub** (if not already):
   ```bash
   cd backend
   git init
   git add .
   git commit -m "Add notification backend server"
   git branch -M main
   # Create a new repo on GitHub, then:
   git remote add origin https://github.com/YOUR_USERNAME/reshmeinfo-backend.git
   git push -u origin main
   ```

2. **Create Web Service on Render**:
   - Go to Render Dashboard
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub repository
   - Select the `backend` folder (or root if backend is separate repo)

3. **Configure Service**:
   - **Name**: `reshmeinfo-notifications`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend` (if monorepo) or leave blank
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

4. **Add Environment Variables**:
   Click "Advanced" → "Add Environment Variable":

   - **PORT**: `3000`
   - **FIREBASE_PROJECT_ID**: `reshmeinfo`
   - **FIREBASE_SERVICE_ACCOUNT**:
     - Open your downloaded service account JSON
     - Copy the **entire JSON content** (minified, no line breaks)
     - Paste it as one line:
       ```
       {"type":"service_account","project_id":"reshmeinfo",...}
       ```

5. **Deploy**:
   - Click **"Create Web Service"**
   - Wait 2-3 minutes for deployment
   - Copy your live URL: `https://reshmeinfo-notifications.onrender.com`

---

## 🌐 Alternative: Deploy to Railway.app (Free Tier)

### A. Create Railway Account
1. Go to https://railway.app/
2. Sign up with GitHub
3. Verify your email

### B. Deploy Backend

1. **Railway Dashboard**:
   - Click **"New Project"**
   - Choose **"Deploy from GitHub repo"**
   - Select your backend repository

2. **Configure**:
   - Railway auto-detects Node.js
   - Go to **"Variables"** tab

3. **Add Environment Variables**:
   - `FIREBASE_PROJECT_ID` = `reshmeinfo`
   - `FIREBASE_SERVICE_ACCOUNT` = (paste minified JSON)

4. **Deploy**:
   - Railway automatically deploys
   - Go to **"Settings"** → **"Networking"** → **"Generate Domain"**
   - Copy your URL: `https://reshmeinfo-notifications-production.up.railway.app`

---

## 📱 Step 3: Update React Native App

Add backend URL to your `.env` file:

```bash
# Backend Server URL (use your deployed URL)
EXPO_PUBLIC_BACKEND_URL=https://reshmeinfo-notifications.onrender.com
```

**For local testing**:
```bash
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
```

---

## 🧪 Step 4: Test the Backend

### Test 1: Health Check

```bash
curl https://YOUR_DEPLOYED_URL.onrender.com/
```

**Expected response**:
```json
{
  "status": "ok",
  "message": "ReshmeInfo Notification Server is running",
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

### Test 2: Send Notification

```bash
curl -X POST https://YOUR_DEPLOYED_URL.onrender.com/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "priceData": {
      "market": "Koyambedu",
      "breed": "CB",
      "minPrice": 130,
      "maxPrice": 150,
      "avgPrice": 140
    }
  }'
```

**Expected response**:
```json
{
  "success": true,
  "message": "Notifications sent successfully",
  "sent": 2,
  "failed": 0,
  "invalidTokensRemoved": 0
}
```

---

## 🔄 Step 5: Test End-to-End

1. **Build new APK** with backend URL:
   ```bash
   eas build --platform android --profile production
   ```

2. **Install APK** on test device

3. **Admin updates price**:
   - Open admin panel
   - Update any price
   - Save

4. **Check notifications**:
   - All production users should receive notification
   - Check app console logs for confirmation

---

## 🛡️ Security Best Practices

### ✅ Do's:
- ✅ Keep service account JSON secure (never commit to Git)
- ✅ Use environment variables for secrets
- ✅ Enable HTTPS only (Render/Railway handle this)
- ✅ Monitor server logs for errors

### ❌ Don'ts:
- ❌ Never commit `.env` or service account JSON
- ❌ Never expose service account in client code
- ❌ Never share deployment URL publicly

### Add to `.gitignore`:
```
# Backend secrets
backend/.env
backend/service-account.json
```

---

## 🐛 Troubleshooting

### Issue: "No FCM tokens found"
**Solution**:
- Check Firestore has FCM tokens with `tokenType: "fcm"`
- Install production APK (not Expo Go)

### Issue: "FIREBASE_SERVICE_ACCOUNT not found"
**Solution**:
- Verify environment variable is set on Render/Railway
- Ensure JSON is minified (no line breaks)
- Check quotes are escaped properly

### Issue: "Failed to send notifications"
**Solution**:
- Check service account has `Firebase Cloud Messaging API` role
- Verify project ID matches: `reshmeinfo`
- Check tokens are valid FCM tokens (not Expo tokens)

### Issue: Backend not responding
**Solution**:
- Check Render/Railway deployment logs
- Verify service is running (not sleeping)
- Test health endpoint: `curl https://YOUR_URL/`

---

## 📊 Monitoring

### Render.com:
- Go to Dashboard → Your Service
- Click **"Logs"** to see real-time logs
- Check **"Metrics"** for performance

### Railway.app:
- Go to Dashboard → Your Project
- Click **"Deployments"** → **"View Logs"**
- Check **"Metrics"** tab

### What to monitor:
- ✅ Successful notification sends
- ❌ Failed notification attempts
- 🗑️ Invalid tokens cleaned up
- 📊 Request response times

---

## 💰 Costs

**Render.com Free Tier**:
- ✅ 750 hours/month (enough for 1 service)
- ✅ Spins down after 15 min inactivity
- ✅ Free SSL/HTTPS
- ⚠️ First request after sleep is slow (cold start)

**Railway.app Free Tier**:
- ✅ $5 free credit/month
- ✅ No sleep (always on)
- ✅ Free SSL/HTTPS
- ⚠️ Credit runs out if high traffic

**Firebase Admin SDK**: Free (included with Firebase)

---

## 🎯 Production Checklist

- [ ] Service account JSON downloaded
- [ ] Backend deployed to Render/Railway
- [ ] Environment variables configured
- [ ] Backend URL added to app `.env`
- [ ] New APK built with backend URL
- [ ] APK installed on test device
- [ ] Notification test successful
- [ ] Monitoring/logging enabled
- [ ] Service account JSON backed up securely

---

## 🔄 Updating the Backend

When you need to update server code:

1. **Make changes** to `server.js`
2. **Commit and push** to GitHub:
   ```bash
   git add .
   git commit -m "Update notification logic"
   git push
   ```
3. **Auto-deploy**: Render/Railway automatically redeploys

---

## 📚 API Documentation

### POST /send-notification

Send FCM notifications to all production users.

**Request**:
```json
{
  "priceData": {
    "market": "string",
    "breed": "string",
    "minPrice": number,
    "maxPrice": number,
    "avgPrice": number
  }
}
```

**Response**:
```json
{
  "success": boolean,
  "message": "string",
  "sent": number,
  "failed": number,
  "invalidTokensRemoved": number
}
```

### GET /

Health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "message": "string",
  "timestamp": "string"
}
```

---

## 🆘 Need Help?

- **Render Issues**: https://render.com/docs
- **Railway Issues**: https://docs.railway.app/
- **Firebase Admin**: https://firebase.google.com/docs/admin/setup
- **Express.js**: https://expressjs.com/

---

**🎉 You're all set! Automatic FCM notifications are now live!**
