# Deploy to Render.com - Quick Guide (5 minutes)

## Prerequisites
✅ Backend working locally (already done!)
✅ Firebase service account JSON (already have it!)
✅ GitHub account

---

## Step 1: Push Backend to GitHub (2 minutes)

```bash
# Navigate to backend directory
cd /data/data/com.termux/files/home/Reshme_Info/backend

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Add notification backend server"

# Create repo on GitHub
# Go to: https://github.com/new
# Name: reshmeinfo-backend
# Public or Private: Your choice
# Don't initialize with README

# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/reshmeinfo-backend.git

# Push
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy on Render.com (3 minutes)

### 2.1 Create Account
1. Go to https://render.com/
2. Sign up with GitHub
3. Authorize Render to access repositories

### 2.2 Create Web Service
1. Click **"New +"** button
2. Select **"Web Service"**
3. Connect **reshmeinfo-backend** repository
4. Configure:

```yaml
Name: reshmeinfo-notifications
Region: Choose closest to your users (e.g., Singapore for India)
Branch: main
Root Directory: (leave blank)
Runtime: Node
Build Command: npm install
Start Command: npm start
Instance Type: Free
```

### 2.3 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

**Add these variables:**

```bash
# Variable 1
Key: PORT
Value: 3000

# Variable 2
Key: FIREBASE_PROJECT_ID
Value: reshmeinfo

# Variable 3
Key: FIREBASE_SERVICE_ACCOUNT
Value: PASTE_YOUR_SERVICE_ACCOUNT_JSON_HERE
```

**IMPORTANT for Variable 3:**
- Get your service account JSON from `backend/.env` (the FIREBASE_SERVICE_ACCOUNT value)
- It should be ONE LINE with no line breaks
- Example format: `{"type":"service_account","project_id":"reshmeinfo",...}`

### 2.4 Deploy
1. Click **"Create Web Service"**
2. Wait 2-3 minutes for build
3. You'll get a URL like: `https://reshmeinfo-notifications.onrender.com`

---

## Step 3: Test Deployed Backend

```bash
# Test health endpoint
curl https://reshmeinfo-notifications.onrender.com/

# Expected: {"status":"ok","message":"ReshmeInfo Notification Server is running"}

# Test notification endpoint
curl -X POST https://reshmeinfo-notifications.onrender.com/send-notification \
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

# Expected: {"success":true,"fcmSent":1,"expoSent":2,...}
```

---

## Step 4: Update App to Use Deployed Backend

### 4.1 Update .env
```bash
cd /data/data/com.termux/files/home/Reshme_Info

# Edit .env file
nano .env

# Update this line:
EXPO_PUBLIC_BACKEND_URL="https://reshmeinfo-notifications.onrender.com"

# Save: Ctrl+O, Enter, Ctrl+X
```

### 4.2 Rebuild APK
```bash
# Build new production APK with deployed backend
eas build --platform android --profile production

# Wait for build to complete
# Download new APK
```

### 4.3 Test
1. Install new APK on test device
2. Open app (push token registers automatically)
3. Login as admin
4. Update a price
5. Users should receive notification! 🎉

---

## Step 5: Monitor & Logs

### View Logs on Render
1. Go to Render dashboard
2. Click your service: **reshmeinfo-notifications**
3. Click **"Logs"** tab
4. See real-time logs:
   ```
   🚀 Server running on port 3000
   📡 FCM Notification Server ready
   📱 Sending to 3 FCM tokens...
   ✅ FCM sent: 3
   ```

### Check Service Status
- Dashboard shows: **Live** (green) = working
- Dashboard shows: **Failed** (red) = check logs

---

## Troubleshooting

### Error: "Build failed"
**Check:**
- `package.json` exists in repository
- `server.js` exists
- No syntax errors in code

**Fix:**
```bash
# Test locally first
cd backend
npm install
npm start

# If works locally, commit and push again
git add .
git commit -m "Fix build errors"
git push
```

### Error: "Service won't start"
**Check Render logs for:**
- `Cannot find module` → Missing dependency in package.json
- `Firebase error` → Check FIREBASE_SERVICE_ACCOUNT env variable
- `Port already in use` → Not possible on Render (ignore if local)

**Fix:**
1. Go to Render dashboard
2. Click service → **Environment**
3. Verify all 3 environment variables are set correctly
4. Click **"Manual Deploy"** → **"Clear build cache & deploy"**

### Error: "Notifications not sending"
**Check:**
1. Render logs show: `📱 Sending to X FCM tokens`
2. App `.env` has correct Render URL
3. APK rebuilt with new backend URL
4. Fresh APK installed (uninstall old one first)

### Free Tier Limitations
**Render free tier:**
- Spins down after 15 min inactivity
- First request after sleep: 30-60 seconds delay
- Subsequent requests: Fast

**If first notification is slow:**
- Normal behavior on free tier
- Keep-alive service (optional): Add cron job to ping every 10 min
- Or upgrade to paid tier ($7/month) for always-on

---

## Success Checklist

- [ ] Backend code pushed to GitHub
- [ ] Render service created and deployed
- [ ] All 3 environment variables configured
- [ ] Service shows "Live" status
- [ ] Health endpoint responds: `{"status":"ok"}`
- [ ] Test notification succeeds
- [ ] App `.env` updated with Render URL
- [ ] New APK built and tested
- [ ] Users receive notifications! 🎉

---

## Cost

**Render.com Free Tier:**
- 750 hours/month (enough for 24/7 operation)
- Unlimited requests
- Free SSL/HTTPS
- **Cost: $0/month**

**If you need always-on (no sleep):**
- Upgrade to Starter plan: **$7/month**
- Or use Railway.app free $5 credit

---

## Alternative: Deploy to Railway.app

If Render sleeps too much, try Railway:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Add environment variables
railway variables set FIREBASE_PROJECT_ID=reshmeinfo
railway variables set FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'

# Deploy
railway up

# Get URL
railway domain
```

Railway gives you $5 free credit/month = ~500k requests/month, always-on.

---

**🎉 Your notification backend is now deployed and production-ready!**
