const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID || 'reshmeinfo'
});

const db = admin.firestore();
const messaging = admin.messaging();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ReshmeInfo Notification Server is running',
    timestamp: new Date().toISOString()
  });
});

// Send custom admin notification endpoint
app.post('/send-custom-notification', async (req, res) => {
  try {
    const { title, message, priority, targetAudience, targetMarket } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'title and message are required'
      });
    }

    // Get all tokens from Firestore
    const tokensSnapshot = await db.collection('pushTokens').get();

    if (tokensSnapshot.empty) {
      return res.json({
        success: true,
        message: 'No tokens found',
        fcmSent: 0,
        expoSent: 0,
        failed: 0
      });
    }

    let allTokens = tokensSnapshot.docs.map(doc => doc.data());

    // Filter tokens by target market if market-specific
    if (targetAudience === 'market_specific' && targetMarket) {
      // For market-specific, we'll send to all users and rely on the app to filter
      // Or you can implement user-market mapping in Firestore if needed
      console.log(`📍 Market-specific notification for: ${targetMarket}`);
    }

    // Separate FCM and Expo tokens
    const fcmTokens = allTokens.filter(t => t.tokenType === 'fcm').map(t => t.token);
    const expoTokens = allTokens.filter(t => t.tokenType === 'expo' || !t.tokenType).map(t => t.token);

    let fcmSent = 0;
    let fcmFailed = 0;
    let expoSent = 0;
    let expoFailed = 0;
    let invalidTokensRemoved = 0;

    // Send to FCM tokens (production users)
    if (fcmTokens.length > 0) {
      console.log(`📱 Sending custom notification to ${fcmTokens.length} FCM tokens...`);

      const fcmMessage = {
        notification: {
          title: title,
          body: message,
        },
        data: {
          type: 'custom',
          priority: priority || 'medium',
          targetAudience: targetAudience || 'all',
          targetMarket: targetMarket || '',
        },
        android: {
          notification: {
            color: priority === 'high' ? '#EF4444' : priority === 'medium' ? '#F59E0B' : '#10B981',
            sound: 'default',
            priority: priority === 'high' ? 'high' : 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        tokens: fcmTokens,
      };

      const fcmResponse = await messaging.sendEachForMulticast(fcmMessage);
      fcmSent = fcmResponse.successCount;
      fcmFailed = fcmResponse.failureCount;

      console.log(`✅ FCM sent: ${fcmSent}`);
      console.log(`❌ FCM failed: ${fcmFailed}`);

      // Clean up invalid FCM tokens
      const invalidFcmTokens = [];
      fcmResponse.responses.forEach((resp, idx) => {
        if (!resp.success) {
          invalidFcmTokens.push(fcmTokens[idx]);
          console.error(`Failed FCM token ${idx}:`, resp.error);
        }
      });

      if (invalidFcmTokens.length > 0) {
        const deletePromises = invalidFcmTokens.map(token =>
          db.collection('pushTokens').doc(token).delete()
        );
        await Promise.all(deletePromises);
        invalidTokensRemoved += invalidFcmTokens.length;
        console.log(`🗑️ Cleaned up ${invalidFcmTokens.length} invalid FCM tokens`);
      }
    }

    // Send to Expo tokens (Expo Go users)
    if (expoTokens.length > 0) {
      console.log(`📱 Sending custom notification to ${expoTokens.length} Expo tokens...`);

      const expoMessage = {
        to: expoTokens,
        sound: 'default',
        title: title,
        body: message,
        data: {
          type: 'custom',
          priority: priority || 'medium',
          targetAudience: targetAudience || 'all',
          targetMarket: targetMarket || '',
        },
        priority: priority === 'high' ? 'high' : 'default',
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

        console.log(`✅ Expo sent: ${expoSent}`);
        console.log(`❌ Expo failed: ${expoFailed}`);

        // Clean up invalid Expo tokens
        const invalidExpoTokens = [];
        expoResult.data.forEach((resp, idx) => {
          if (resp.status === 'error') {
            invalidExpoTokens.push(expoTokens[idx]);
            console.error(`Failed Expo token ${idx}:`, resp.message || resp.details);
          }
        });

        if (invalidExpoTokens.length > 0) {
          const deletePromises = invalidExpoTokens.map(token =>
            db.collection('pushTokens').doc(token).delete()
          );
          await Promise.all(deletePromises);
          invalidTokensRemoved += invalidExpoTokens.length;
          console.log(`🗑️ Cleaned up ${invalidExpoTokens.length} invalid Expo tokens`);
        }
      } else {
        console.error('Unexpected Expo response format:', expoResult);
        expoFailed = expoTokens.length;
        console.log(`❌ Expo failed: ${expoFailed} (unexpected response format)`);
      }
    }

    res.json({
      success: true,
      message: 'Custom notification sent successfully',
      fcmSent,
      expoSent,
      totalSent: fcmSent + expoSent,
      totalFailed: fcmFailed + expoFailed,
      invalidTokensRemoved
    });

  } catch (error) {
    console.error('Error sending custom notification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send notification endpoint (supports both FCM and Expo tokens)
app.post('/send-notification', async (req, res) => {
  try {
    const { priceData } = req.body;

    if (!priceData) {
      return res.status(400).json({
        success: false,
        error: 'priceData is required'
      });
    }

    // Get all tokens from Firestore
    const tokensSnapshot = await db.collection('pushTokens').get();

    if (tokensSnapshot.empty) {
      return res.json({
        success: true,
        message: 'No tokens found',
        fcmSent: 0,
        expoSent: 0,
        failed: 0
      });
    }

    const allTokens = tokensSnapshot.docs.map(doc => doc.data());

    // Separate FCM and Expo tokens
    const fcmTokens = allTokens.filter(t => t.tokenType === 'fcm').map(t => t.token);
    const expoTokens = allTokens.filter(t => t.tokenType === 'expo' || !t.tokenType).map(t => t.token);

    const notificationTitle = `${priceData.market} - ${priceData.breed} Price Update`;
    const notificationBody = `Min: ₹${priceData.minPrice} | Max: ₹${priceData.maxPrice} | Avg: ₹${priceData.avgPrice}/kg`;

    let fcmSent = 0;
    let fcmFailed = 0;
    let expoSent = 0;
    let expoFailed = 0;
    let invalidTokensRemoved = 0;

    // Send to FCM tokens (production users)
    if (fcmTokens.length > 0) {
      console.log(`📱 Sending to ${fcmTokens.length} FCM tokens...`);

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
            icon: 'notification_icon', // Uses app's notification icon
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        tokens: fcmTokens,
      };

      const fcmResponse = await messaging.sendEachForMulticast(fcmMessage);
      fcmSent = fcmResponse.successCount;
      fcmFailed = fcmResponse.failureCount;

      console.log(`✅ FCM sent: ${fcmSent}`);
      console.log(`❌ FCM failed: ${fcmFailed}`);

      // Clean up invalid FCM tokens
      const invalidFcmTokens = [];
      fcmResponse.responses.forEach((resp, idx) => {
        if (!resp.success) {
          invalidFcmTokens.push(fcmTokens[idx]);
          console.error(`Failed FCM token ${idx}:`, resp.error);
        }
      });

      if (invalidFcmTokens.length > 0) {
        const deletePromises = invalidFcmTokens.map(token =>
          db.collection('pushTokens').doc(token).delete()
        );
        await Promise.all(deletePromises);
        invalidTokensRemoved += invalidFcmTokens.length;
        console.log(`🗑️ Cleaned up ${invalidFcmTokens.length} invalid FCM tokens`);
      }
    }

    // Send to Expo tokens (Expo Go users)
    if (expoTokens.length > 0) {
      console.log(`📱 Sending to ${expoTokens.length} Expo tokens...`);

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

        console.log(`✅ Expo sent: ${expoSent}`);
        console.log(`❌ Expo failed: ${expoFailed}`);

        // Clean up invalid Expo tokens
        const invalidExpoTokens = [];
        expoResult.data.forEach((resp, idx) => {
          if (resp.status === 'error') {
            invalidExpoTokens.push(expoTokens[idx]);
            console.error(`Failed Expo token ${idx}:`, resp.message || resp.details);
          }
        });

        if (invalidExpoTokens.length > 0) {
          const deletePromises = invalidExpoTokens.map(token =>
            db.collection('pushTokens').doc(token).delete()
          );
          await Promise.all(deletePromises);
          invalidTokensRemoved += invalidExpoTokens.length;
          console.log(`🗑️ Cleaned up ${invalidExpoTokens.length} invalid Expo tokens`);
        }
      } else {
        console.error('Unexpected Expo response format:', expoResult);
        expoFailed = expoTokens.length;
        console.log(`❌ Expo failed: ${expoFailed} (unexpected response format)`);
      }
    }

    res.json({
      success: true,
      message: 'Notifications sent successfully',
      fcmSent,
      expoSent,
      totalSent: fcmSent + expoSent,
      totalFailed: fcmFailed + expoFailed,
      invalidTokensRemoved
    });

  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 FCM Notification Server ready`);
});
