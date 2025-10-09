# Backend Server - Quick Start Guide

## ✅ What's Been Created

Your notification backend is ready! Here's what's set up:

```
backend/
├── server.js              # Express server with FCM integration
├── package.json           # Dependencies (Express, Firebase Admin SDK)
├── .env.example           # Environment template
├── .gitignore             # Security (prevents committing secrets)
├── README.md              # Backend documentation
└── DEPLOYMENT_GUIDE.md    # Complete deployment instructions
```

**App Updated**:
- ✅ `AdminPriceFormScreen.tsx` - Now calls backend API
- ✅ `.env` - Backend URL added

---

## 🚀 Deploy in 3 Steps

### Step 1: Get Firebase Service Account (2 minutes)

1. Go to **Firebase Console**: https://console.firebase.google.com/
2. Select **reshmeinfo** project
3. Click **⚙️ Settings** → **Project settings** → **Service accounts** tab
4. Click **"Generate new private key"** → Download JSON
5. **Save it securely!**

### Step 2: Deploy to Render.com (5 minutes)

1. **Push backend to GitHub**:
   ```bash
   cd backend
   git init
   git add .
   git commit -m "Add notification backend"
   # Create repo on GitHub: reshmeinfo-backend
   git remote add origin https://github.com/YOUR_USERNAME/reshmeinfo-backend.git
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Go to https://render.com/ → Sign up/Login
   - Click **"New +"** → **"Web Service"**
   - Connect GitHub repo
   - Configure:
     - **Name**: `reshmeinfo-notifications`
     - **Build**: `npm install`
     - **Start**: `npm start`
     - **Plan**: Free

3. **Add Environment Variables**:
   - Click **"Advanced"** → **"Add Environment Variable"**
   - Add `FIREBASE_PROJECT_ID` = `reshmeinfo`
   - Add `FIREBASE_SERVICE_ACCOUNT` = (paste JSON from Step 1 - **as one line, no spaces**)

   **Example**:
   ```
   {"type":"service_account","project_id":"reshmeinfo","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nXXXXX\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxx@reshmeinfo.iam.gserviceaccount.com",...}
   ```

4. **Deploy** → Copy your live URL: `https://reshmeinfo-notifications.onrender.com`

### Step 3: Update App (2 minutes)

1. **Update `.env` with deployed URL**:
   ```bash
   # Replace localhost with your Render URL
   EXPO_PUBLIC_BACKEND_URL="https://reshmeinfo-notifications.onrender.com"
   ```

2. **Build new APK**:
   ```bash
   eas build --platform android --profile production
   ```

3. **Install & Test**:
   - Install new APK
   - Admin updates price
   - Users receive notifications! 🎉

---

## 🧪 Testing

### Test 1: Backend Health

```bash
curl https://reshmeinfo-notifications.onrender.com/
```

**Expected**:
```json
{"status":"ok","message":"ReshmeInfo Notification Server is running"}
```

### Test 2: Send Notification

```bash
curl -X POST https://reshmeinfo-notifications.onrender.com/send-notification \
  -H "Content-Type: application/json" \
  -d '{"priceData":{"market":"Test","breed":"CB","minPrice":100,"maxPrice":200,"avgPrice":150}}'
```

**Expected**:
```json
{"success":true,"sent":2,"failed":0}
```

### Test 3: End-to-End

1. Open admin panel in app
2. Update any price
3. Save
4. Check production users receive notification ✅

---

## 🔄 How It Works

```
┌─────────────┐
│   Admin     │
│ Updates     │  1. Save price to Firestore
│   Price     │  ────────────────────────────┐
└─────────────┘                              ▼
                                    ┌─────────────────┐
                                    │   Firestore     │
                                    │  (Price saved)  │
                                    └─────────────────┘
                                             │
                                             │ 2. App calls backend
                                             ▼
                              ┌──────────────────────────┐
                              │   Backend Server         │
                              │   (Render/Railway)       │
                              │                          │
                              │ 1. Get FCM tokens        │
                              │ 2. Send notifications    │
                              │ 3. Clean invalid tokens  │
                              └──────────────────────────┘
                                             │
                                             │ 3. FCM notifications
                                             ▼
                              ┌──────────────────────────┐
                              │   Production Users       │
                              │   (Receive alerts 🔔)    │
                              └──────────────────────────┘
```

---

## 💰 Costs

**Render.com Free Tier**:
- ✅ 750 hours/month
- ✅ Free SSL/HTTPS
- ⚠️ Spins down after 15min inactivity (first request slower)

**Alternative - Railway.app Free Tier**:
- ✅ $5 credit/month
- ✅ Always on (no sleep)
- ✅ Free SSL/HTTPS

**Firebase**: Free (Admin SDK included)

---

## 🔒 Security Checklist

- [x] Service account JSON in environment variable (not in code)
- [x] `.gitignore` prevents committing secrets
- [x] HTTPS enabled (automatic on Render/Railway)
- [x] Backend URL in app `.env` (not hardcoded)

---

## 🐛 Troubleshooting

**Backend not working?**
1. Check Render logs: Dashboard → Service → Logs
2. Verify environment variables are set
3. Test health endpoint: `curl https://YOUR_URL/`

**No notifications sent?**
1. Check Firestore has FCM tokens (`tokenType: "fcm"`)
2. Verify service account permissions
3. Check app console logs

**Notifications still manual?**
1. Verify `.env` has correct `EXPO_PUBLIC_BACKEND_URL`
2. Rebuild APK with new URL
3. Install fresh APK (uninstall old one first)

---

## 📚 Full Documentation

- **Backend README**: `backend/README.md`
- **Deployment Guide**: `backend/DEPLOYMENT_GUIDE.md`
- **Automatic Notifications Guide**: `AUTOMATIC_NOTIFICATIONS_GUIDE.md`

---

## ✅ Success Checklist

- [ ] Firebase service account JSON downloaded
- [ ] Backend code pushed to GitHub
- [ ] Deployed to Render.com or Railway.app
- [ ] Environment variables configured
- [ ] Backend URL updated in app `.env`
- [ ] New APK built with backend URL
- [ ] APK tested - notifications work! 🎉

---

**🎉 Done! Admin updates now trigger automatic notifications to all users!**

**Questions?** Check the full deployment guide in `backend/DEPLOYMENT_GUIDE.md`
