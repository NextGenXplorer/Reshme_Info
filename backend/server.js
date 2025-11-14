const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
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
  projectId: process.env.FIREBASE_PROJECT_ID || 'reshmeinfo',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'reshmeinfo.appspot.com'
});

const db = admin.firestore();
const messaging = admin.messaging();
const bucket = admin.storage().bucket();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Serve static files from public directory
app.use(express.static('public'));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ReshmeInfo Notification Server is running',
    timestamp: new Date().toISOString()
  });
});

// Helper function to validate image URL
function isValidImageUrl(url) {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    const validProtocols = ['http:', 'https:'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

    // Check protocol
    if (!validProtocols.includes(urlObj.protocol)) {
      return false;
    }

    // Check if URL ends with image extension or contains common image hosting patterns
    const pathname = urlObj.pathname.toLowerCase();
    const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
    const isCommonImageHost = [
      'github.com',
      'githubusercontent.com',
      'imgur.com',
      'i.imgur.com',
      'storage.googleapis.com',
      'firebasestorage.googleapis.com',
      'cloudinary.com',
      'imgbb.com',
      'postimg.cc'
    ].some(host => urlObj.hostname.includes(host));

    return hasImageExtension || isCommonImageHost;
  } catch (e) {
    return false;
  }
}

// Validate image URL endpoint
app.post('/validate-image-url', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'imageUrl is required'
      });
    }

    const isValid = isValidImageUrl(imageUrl);

    if (!isValid) {
      return res.json({
        success: false,
        valid: false,
        message: 'Invalid image URL. Please use a direct image URL from GitHub, Imgur, or other image hosting services.'
      });
    }

    // Try to fetch the image to verify it's accessible
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');

      if (!response.ok) {
        return res.json({
          success: false,
          valid: false,
          message: 'Image URL is not accessible (HTTP ' + response.status + ')'
        });
      }

      if (!contentType || !contentType.startsWith('image/')) {
        return res.json({
          success: false,
          valid: false,
          message: 'URL does not point to an image (content-type: ' + contentType + ')'
        });
      }

      return res.json({
        success: true,
        valid: true,
        message: 'Image URL is valid and accessible',
        contentType: contentType
      });
    } catch (fetchError) {
      return res.json({
        success: false,
        valid: false,
        message: 'Unable to verify image accessibility: ' + fetchError.message
      });
    }

  } catch (error) {
    console.error('Error validating image URL:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Image upload endpoint (optional - for uploading to Firebase Storage)
app.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    // Process image with sharp (optimize and resize)
    const processedImageBuffer = await sharp(req.file.buffer)
      .resize(1200, 1200, { // Max dimensions
        fit: 'inside',
        withoutEnlargement: true
      })
      .png({ quality: 85 }) // Convert to PNG with quality optimization
      .toBuffer();

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `notification-images/${timestamp}-${req.file.originalname.replace(/\s+/g, '-')}`;

    // Upload to Firebase Storage
    const file = bucket.file(filename);
    await file.save(processedImageBuffer, {
      metadata: {
        contentType: 'image/png',
        metadata: {
          uploadedAt: new Date().toISOString(),
          originalName: req.file.originalname
        }
      }
    });

    // Make file publicly accessible
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: publicUrl,
      filename: filename,
      size: processedImageBuffer.length
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete image endpoint
app.delete('/delete-image', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'imageUrl is required'
      });
    }

    // Extract filename from URL
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const fullPath = `notification-images/${filename}`;

    // Delete from Firebase Storage
    await bucket.file(fullPath).delete();

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List uploaded images endpoint
app.get('/list-images', async (req, res) => {
  try {
    const [files] = await bucket.getFiles({
      prefix: 'notification-images/'
    });

    const images = files.map(file => ({
      name: file.name,
      url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
      created: file.metadata.timeCreated,
      size: file.metadata.size
    }));

    res.json({
      success: true,
      images: images
    });

  } catch (error) {
    console.error('Error listing images:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send custom admin notification endpoint
app.post('/send-custom-notification', async (req, res) => {
  try {
    const { title, message, priority, targetAudience, targetMarket, imageUrl } = req.body;

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

    // Use ALL tokens as FCM tokens (Firebase Cloud Messaging only)
    const fcmTokens = allTokens.map(t => t.token);

    console.log(`📊 Total FCM tokens: ${fcmTokens.length}`);

    let fcmSent = 0;
    let fcmFailed = 0;
    let invalidTokensRemoved = 0;

    // Send to ALL tokens via FCM (Firebase Cloud Messaging)
    if (fcmTokens.length > 0) {
      console.log(`📱 Sending custom notification to ${fcmTokens.length} FCM tokens...`);

      // Use provided imageUrl or fallback to default logo
      const notificationImageUrl = imageUrl || 'https://raw.githubusercontent.com/NextGenXplorer/Reshme_Info/main/assets/reshme_logo.png';

      const fcmMessage = {
        notification: {
          title: title,
          body: message,
          imageUrl: notificationImageUrl,
        },
        data: {
          type: 'custom',
          priority: priority || 'medium',
          targetAudience: targetAudience || 'all',
          targetMarket: targetMarket || '',
          imageUrl: notificationImageUrl, // Include in data for app-level handling
        },
        android: {
          notification: {
            color: priority === 'high' ? '#EF4444' : priority === 'medium' ? '#F59E0B' : '#10B981',
            sound: 'default',
            priority: priority === 'high' ? 'high' : 'default',
            imageUrl: notificationImageUrl,
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
          fcmOptions: {
            imageUrl: notificationImageUrl,
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

    res.json({
      success: true,
      message: 'Custom notification sent via FCM to all devices',
      fcmSent,
      totalSent: fcmSent,
      totalFailed: fcmFailed,
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

// Send notification endpoint (FCM only - Firebase Cloud Messaging)
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

    // Use ALL tokens as FCM tokens (Firebase Cloud Messaging only)
    const fcmTokens = allTokens.map(t => t.token);

    console.log(`📊 Total FCM tokens for price notification: ${fcmTokens.length}`);

    const notificationTitle = `${priceData.market} - ${priceData.breed} Price Update`;
    const notificationBody = `Min: ₹${priceData.minPrice} | Max: ₹${priceData.maxPrice} | Avg: ₹${priceData.avgPrice}/kg`;

    let fcmSent = 0;
    let fcmFailed = 0;
    let invalidTokensRemoved = 0;

    // Send to ALL tokens via FCM (Firebase Cloud Messaging)
    if (fcmTokens.length > 0) {
      console.log(`📱 Sending to ${fcmTokens.length} FCM tokens...`);

      const fcmMessage = {
        notification: {
          title: notificationTitle,
          body: notificationBody,
          imageUrl: 'https://raw.githubusercontent.com/NextGenXplorer/Reshme_Info/main/assets/reshme_logo.png',
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
            imageUrl: 'https://raw.githubusercontent.com/NextGenXplorer/Reshme_Info/main/assets/reshme_logo.png',
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
          fcmOptions: {
            imageUrl: 'https://raw.githubusercontent.com/NextGenXplorer/Reshme_Info/main/assets/reshme_logo.png',
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

    res.json({
      success: true,
      message: 'Price notifications sent via FCM to all devices',
      fcmSent,
      totalSent: fcmSent,
      totalFailed: fcmFailed,
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
