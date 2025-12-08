# Privacy Policy & Terms - Backend Integration

## ✅ What's Been Added

Your backend server (`server.js`) now serves the privacy policy and terms of service pages as static files.

## 📍 Available Endpoints

### 1. Privacy Policy
**URL**: `http://your-backend-url/privacy-policy.html`

Example:
- Local: `http://localhost:3000/privacy-policy.html`
- Production: `https://your-domain.com/privacy-policy.html`

### 2. Terms of Service
**URL**: `http://your-backend-url/terms.html`

Example:
- Local: `http://localhost:3000/terms.html`
- Production: `https://your-domain.com/terms.html`

### 3. Homepage
**URL**: `http://your-backend-url/index.html`

Example:
- Local: `http://localhost:3000/index.html`
- Production: `https://your-domain.com/index.html`

## 🔧 How It Works

The backend now includes:
```javascript
// Serve static files from public directory
app.use(express.static('public'));
```

This automatically serves all files from the `public/` directory:
- `public/privacy-policy.html` → `/privacy-policy.html`
- `public/terms.html` → `/terms.html`
- `public/index.html` → `/index.html`
- `public/app-ads.txt` → `/app-ads.txt`

## 🚀 Testing Locally

1. Start your backend server:
```bash
cd backend
node server.js
```

2. Open in browser:
- Privacy Policy: http://localhost:3000/privacy-policy.html
- Terms: http://localhost:3000/terms.html
- Homepage: http://localhost:3000/index.html

## 📦 Deployment

When you deploy your backend to a hosting service (Render, Railway, etc.), the static files will automatically be served.

### For Google Play Console:

**If using your own backend domain:**
```
Privacy Policy URL: https://your-backend-domain.com/privacy-policy.html
Terms URL: https://your-backend-domain.com/terms.html
```

**Or continue using Firebase Hosting:**
```
Privacy Policy URL: https://reshmeinfo.web.app/privacy-policy.html
Terms URL: https://reshmeinfo.web.app/terms.html
```

Both will work! Choose whichever is easier for you.

## 📁 File Structure

```
backend/
├── server.js              (serves static files)
├── package.json
└── (other backend files)

public/                    (static files directory)
├── privacy-policy.html    ✅ Served by backend
├── terms.html             ✅ Served by backend
├── index.html             ✅ Served by backend
└── app-ads.txt            ✅ Served by backend
```

## ✨ Benefits of Using Backend

1. **Single Domain**: Everything under one domain
2. **Easy Updates**: Update files without redeploying Firebase
3. **Custom Control**: Full control over headers, redirects, etc.
4. **API Integration**: Can add API endpoints if needed

## 🔄 Updating Content

To update privacy policy or terms:

1. Edit the HTML files in `public/` directory
2. Restart your backend server (if running locally)
3. Changes are live immediately (no build/deploy needed)

## 🌐 Which URL to Use for Play Console?

You have **two options**:

### Option 1: Firebase Hosting (Recommended)
✅ Already deployed and working
✅ Free hosting
✅ Global CDN
✅ HTTPS included

```
https://reshmeinfo.web.app/privacy-policy.html
```

### Option 2: Your Backend
✅ Full control
✅ Single domain for everything
✅ Can add custom logic

```
https://your-backend-domain.com/privacy-policy.html
```

**Recommendation**: Use Firebase Hosting URL for Play Console since it's already deployed and working perfectly!

## 📞 Summary

- ✅ Backend now serves static HTML files
- ✅ Privacy policy available at `/privacy-policy.html`
- ✅ Terms available at `/terms.html`
- ✅ Both Firebase and Backend URLs work
- ✅ Choose whichever is easier for you

**For Google Play submission, use**: https://reshmeinfo.web.app/privacy-policy.html
