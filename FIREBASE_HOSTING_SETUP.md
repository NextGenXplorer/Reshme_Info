# Firebase Hosting Setup Guide for app-ads.txt

## What Was Created

✅ **Created Files:**
- `public/app-ads.txt` - Your AdMob app-ads.txt file
- `public/index.html` - Simple landing page for your app
- `firebase.json` - Firebase Hosting configuration

## File Contents

### app-ads.txt
```
google.com, pub-5029120740748641, DIRECT, f08c47fec0942fa0
```

This file will be accessible at: `https://your-firebase-domain.web.app/app-ads.txt`

## Deployment Steps

### Step 1: Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase
```bash
firebase login
```

### Step 3: Initialize Firebase Project (if not already done)
```bash
firebase init hosting
```

**When prompted:**
- Select your existing Firebase project
- Set public directory: `public` ✅ (already configured)
- Configure as single-page app: `No`
- Set up automatic builds: `No`

### Step 4: Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

### Step 5: Get Your Hosting URL
After deployment, you'll see output like:
```
✔  Deploy complete!

Hosting URL: https://your-project-id.web.app
```

### Step 6: Update Google Play Store Listing
1. Go to Google Play Console
2. Navigate to your app listing
3. Find the "Developer website" field
4. Enter your Firebase Hosting URL: `https://your-project-id.web.app`
5. Save changes

**Important:** The domain in Google Play MUST match exactly where your app-ads.txt is hosted!

### Step 7: Verify in AdMob (after 24 hours)
1. Go to AdMob console
2. Navigate to Apps → Your App
3. Check "app-ads.txt" status
4. It should show ✅ "Authorized"

## Quick Deploy Commands

```bash
# Deploy for the first time
firebase login
firebase init hosting
firebase deploy --only hosting

# Subsequent updates
firebase deploy --only hosting
```

## Verification

After deployment, verify your app-ads.txt is accessible:
```bash
curl https://your-project-id.web.app/app-ads.txt
```

Expected output:
```
google.com, pub-5029120740748641, DIRECT, f08c47fec0942fa0
```

## Troubleshooting

### Issue: 404 Not Found
- Make sure you deployed with `firebase deploy --only hosting`
- Check that `public/app-ads.txt` exists
- Verify `firebase.json` has correct "public" directory

### Issue: AdMob Still Shows Warning
- Wait 24 hours for AdMob to crawl
- Verify domain in Play Store matches hosting URL exactly
- Check file is accessible via curl/browser

### Issue: Firebase Project Not Found
- Run `firebase projects:list` to see available projects
- Use `firebase use <project-id>` to select correct project
- Check `.env` for correct Firebase project ID

## Alternative: Manual Setup

If Firebase CLI doesn't work, you can also:
1. Go to Firebase Console → Hosting
2. Use Firebase Console's web interface to upload files
3. Deploy directly from the console

## Notes

- **Wait 24 hours** after deployment for AdMob to verify
- The app-ads.txt file must be at the root: `yourdomain.com/app-ads.txt`
- Domain in Play Store must match hosting URL exactly
- Keep the file deployed permanently for AdMob to work

## Your AdMob Configuration

- **Publisher ID:** pub-5029120740748641
- **App ID:** ca-app-pub-5029120740748641~7524355155
- **Package:** com.master.reshmeinfo

## Next Steps

1. Deploy using commands above
2. Update Google Play Store with hosting URL
3. Wait 24 hours
4. Check AdMob dashboard for verification

---

**Need Help?**
- Firebase Hosting Docs: https://firebase.google.com/docs/hosting
- AdMob app-ads.txt Guide: https://support.google.com/admob/answer/9363762
