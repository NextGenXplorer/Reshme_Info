# ReshmeInfo Notification Backend

Express.js backend server for sending FCM (Firebase Cloud Messaging) notifications to ReshmeInfo mobile app users.

## 🎯 Purpose

Automatically sends push notifications to all production users when admin updates cocoon prices.

## 🏗️ Architecture

```
Admin updates price → Firestore → App calls backend → Backend sends FCM notifications → Users receive alerts
```

## 📁 Project Structure

```
backend/
├── server.js              # Main Express server
├── package.json           # Dependencies
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
├── DEPLOYMENT_GUIDE.md    # Complete deployment instructions
└── README.md              # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Get Firebase Service Account

1. Firebase Console → Project Settings → Service accounts
2. Click "Generate new private key"
3. Download JSON file

### 3. Setup Environment

```bash
cp .env.example .env
```

Edit `.env` and add:
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_SERVICE_ACCOUNT` - Paste the entire service account JSON (minified)

### 4. Run Locally

```bash
npm start
```

Server runs on `http://localhost:3000`

### 5. Test

Health check:
```bash
curl http://localhost:3000/
```

Send test notification:
```bash
curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d '{"priceData":{"market":"Test","breed":"CB","minPrice":100,"maxPrice":200,"avgPrice":150}}'
```

## 📡 API Endpoints

### GET /
Health check endpoint

**Response**:
```json
{
  "status": "ok",
  "message": "ReshmeInfo Notification Server is running",
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

### POST /send-notification
Send FCM notifications to all users

**Request Body**:
```json
{
  "priceData": {
    "market": "Koyambedu",
    "breed": "CB",
    "minPrice": 130,
    "maxPrice": 150,
    "avgPrice": 140
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Notifications sent successfully",
  "sent": 5,
  "failed": 0,
  "invalidTokensRemoved": 1
}
```

## 🌐 Deployment

See **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** for complete deployment instructions for:
- ✅ Render.com (Free tier)
- ✅ Railway.app (Free tier)
- ✅ Environment setup
- ✅ Testing procedures

## 🔒 Security

- ✅ Service account JSON stored as environment variable (not in code)
- ✅ `.gitignore` prevents committing secrets
- ✅ CORS enabled for app domain only (update in production)
- ✅ HTTPS enforced on Render/Railway

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Firebase**: Admin SDK
- **Hosting**: Render.com / Railway.app (recommended)

## 📊 Monitoring

Monitor in production:
- Check deployment logs on Render/Railway
- Track notification success/failure rates
- Monitor invalid token cleanup

## 🐛 Troubleshooting

**Issue**: No notifications sent
- Check FCM tokens exist in Firestore with `tokenType: "fcm"`
- Verify service account has correct permissions
- Check backend logs for errors

**Issue**: Backend not responding
- Verify deployment is running (not sleeping)
- Check environment variables are set
- Test health endpoint

## 📝 Development

```bash
# Install dependencies
npm install

# Run in development mode (with auto-reload)
npm run dev

# Run in production mode
npm start
```

## 📚 Resources

- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Express.js Guide](https://expressjs.com/en/starter/installing.html)
- [Render Deployment](https://render.com/docs)
- [Railway Deployment](https://docs.railway.app/)

---

**Built for ReshmeInfo Mobile App**
