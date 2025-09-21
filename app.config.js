// Load environment variables from .env file
require('dotenv').config();

module.exports = {
  expo: {
    name: "ReshmeInfo",
    slug: "ReshmeInfo",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/reshme-logo.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/reshme-logo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      "supportsTablet": true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/reshme-logo.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    web: {
      favicon: "./assets/reshme-logo.png"
    },
    extra: {
      // Firebase Environment Variables
      EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,

      // Admin Credentials
      EXPO_PUBLIC_ADMIN_USERNAME_1: process.env.EXPO_PUBLIC_ADMIN_USERNAME_1,
      EXPO_PUBLIC_ADMIN_PASSWORD_1: process.env.EXPO_PUBLIC_ADMIN_PASSWORD_1,
      EXPO_PUBLIC_ADMIN_ROLE_1: process.env.EXPO_PUBLIC_ADMIN_ROLE_1,
      EXPO_PUBLIC_ADMIN_MARKET_1: process.env.EXPO_PUBLIC_ADMIN_MARKET_1,

      EXPO_PUBLIC_ADMIN_USERNAME_2: process.env.EXPO_PUBLIC_ADMIN_USERNAME_2,
      EXPO_PUBLIC_ADMIN_PASSWORD_2: process.env.EXPO_PUBLIC_ADMIN_PASSWORD_2,
      EXPO_PUBLIC_ADMIN_ROLE_2: process.env.EXPO_PUBLIC_ADMIN_ROLE_2,
      EXPO_PUBLIC_ADMIN_MARKET_2: process.env.EXPO_PUBLIC_ADMIN_MARKET_2,

      EXPO_PUBLIC_ADMIN_USERNAME_3: process.env.EXPO_PUBLIC_ADMIN_USERNAME_3,
      EXPO_PUBLIC_ADMIN_PASSWORD_3: process.env.EXPO_PUBLIC_ADMIN_PASSWORD_3,
      EXPO_PUBLIC_ADMIN_ROLE_3: process.env.EXPO_PUBLIC_ADMIN_ROLE_3,
      EXPO_PUBLIC_ADMIN_MARKET_3: process.env.EXPO_PUBLIC_ADMIN_MARKET_3,
    }
  }
};
