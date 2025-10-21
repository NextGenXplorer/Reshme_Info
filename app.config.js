// Load environment variables from .env file
require('dotenv').config();

module.exports = {
  expo: {
    name: "ReshmeInfo",
    slug: "ReshmeInfo",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/reshme_logo.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/reshme_logo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    android: {
      package: "com.master.reshmeinfo", // Unique Android package name
      adaptiveIcon: {
        foregroundImage: "./assets/reshme_logo.png",
        backgroundColor: "#ffffff"
      },
      icon: "./assets/reshme_logo.png", // Notification icon
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      googleServicesFile: "./google-services.json",
      permissions: [
        "android.permission.POST_NOTIFICATIONS",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "WAKE_LOCK"
      ]
    },
    notification: {
      icon: "./assets/reshme_logo.png",
      color: "#3B82F6",
      androidMode: "default",
      androidCollapsedTitle: "ReshmeInfo Updates"
    },
    plugins: [
      "expo-font",
      [
        "expo-notifications",
        {
          icon: "./assets/reshme_logo.png",
          color: "#3B82F6",
          sounds: []
        }
      ],
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: "ca-app-pub-5029120740748641~7524355155", // Production AdMob App ID
        }
      ]
    ],
    web: {
      favicon: "./assets/reshme_logo.png"
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

      // EAS Project ID (required for dynamic configs)
      eas: {
        projectId: "2cb9f6e5-78a4-478c-a133-7c87876c655c"
      }
    }
  }
};
