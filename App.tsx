import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, TouchableOpacity, View, StyleSheet, Platform, Alert } from 'react-native';
import './i18n';
import * as Notifications from 'expo-notifications';
import { db } from './firebase.config';
import { doc, setDoc } from 'firebase/firestore';
import { useInterstitialAd } from './hooks/useInterstitialAd';
import { useExitAd } from './hooks/useExitAd';
import MobileAds from 'react-native-google-mobile-ads';

// Import screen components
import HomeScreen from './screens/HomeScreen';
import MarketScreen from './screens/MarketScreen';
import StatsScreen from './screens/StatsScreen';
import AboutScreen from './screens/AboutScreen';
import AdminNavigator from './screens/AdminNavigator';

const Tab = createBottomTabNavigator();

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token: string | undefined;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Push notifications permission is required to receive price alerts and updates.',
        [{ text: 'OK' }]
      );
      return undefined;
    }

    // Get device-specific FCM token for production (works in standalone APK)
    // Falls back to Expo token for development in Expo Go
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      token = deviceToken.data;
      console.log('FCM Push Token (Production):', token);
    } catch (deviceTokenError) {
      console.log('Could not get FCM token, falling back to Expo token (Development)');
      const expoPushToken = await Notifications.getExpoPushTokenAsync();
      token = expoPushToken.data;
      console.log('Expo Push Token (Development):', token);
    }

    if (token) {
      await setDoc(doc(db, "pushTokens", token), {
        token: token,
        createdAt: new Date(),
        platform: Platform.OS,
        tokenType: token.startsWith('ExponentPushToken') ? 'expo' : 'fcm',
        deviceInfo: {
          os: Platform.OS,
          version: Platform.Version,
        },
      });
      console.log('Push token saved to Firestore');
    }

    return token;
  } catch (error) {
    console.error('Error in registerForPushNotificationsAsync:', error);
    Alert.alert(
      'Notification Setup Error',
      'Failed to set up push notifications. Please try again later.',
      [{ text: 'OK' }]
    );
    return undefined;
  }
}

const AppContent = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification | false>(false);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const [previousRoute, setPreviousRoute] = useState<string>('Home');

  // Initialize Google Mobile Ads
  useEffect(() => {
    MobileAds()
      .initialize()
      .then(adapterStatuses => {
        console.log('AdMob initialized:', adapterStatuses);
      })
      .catch(error => {
        console.error('AdMob initialization error:', error);
      });
  }, []);

  // Interstitial ad hook for tab navigation
  const { showAd, isLoaded } = useInterstitialAd();

  // Exit ad hook - shows rewarded interstitial when user presses back button
  useExitAd({ enabled: true });

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        console.log('Push notifications registered successfully');
      }
    });

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      setNotification(notification);
    });

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      const data = response.notification.request.content.data;

      // Handle notification tap - can add navigation logic here
      if (data?.screen) {
        console.log('Navigate to screen:', data.screen);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  if (showAdminPanel) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <AdminNavigator onExit={() => setShowAdminPanel(false)} />
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  // Handle navigation state changes to show interstitial ads
  const handleNavigationStateChange = (state: any) => {
    if (!state) return;

    const currentRoute = state.routes[state.index]?.name;

    // Show interstitial ad occasionally when switching tabs (not every time to avoid annoyance)
    // Show ad 30% of the time when changing tabs
    if (currentRoute && currentRoute !== previousRoute && isLoaded && Math.random() < 0.3) {
      console.log(`Tab changed from ${previousRoute} to ${currentRoute}, showing interstitial ad`);
      showAd();
    }

    setPreviousRoute(currentRoute);
  };

  return (
    <NavigationContainer onStateChange={handleNavigationStateChange}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>

        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: string = 'home';

              if (route.name === 'Home') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === 'Market') {
                iconName = focused ? 'business' : 'business-outline';
              } else if (route.name === 'Stats') {
                iconName = focused ? 'analytics' : 'analytics-outline';
              } else if (route.name === 'About') {
                iconName = focused ? 'information-circle' : 'information-circle-outline';
              }

              return <Ionicons name={iconName as any} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#3B82F6',
            tabBarInactiveTintColor: '#9CA3AF',
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              paddingTop: 8,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
              height: 70 + insets.bottom,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 8,
            },
            tabBarLabelStyle: {
              fontSize: 14,
              fontWeight: '600',
              marginTop: 4,
            },
            headerShown: false,
          })}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              tabBarLabel: t('home'),
            }}
          />
          <Tab.Screen
            name="Market"
            component={MarketScreen}
            options={{
              tabBarLabel: t('market'),
            }}
          />
          <Tab.Screen
            name="Stats"
            component={StatsScreen}
            options={{
              tabBarLabel: t('stats'),
            }}
          />
          <Tab.Screen
            name="About"
            options={{
              tabBarLabel: t('about'),
            }}
          >
            {() => <AboutScreen setShowAdminPanel={setShowAdminPanel} />}
          </Tab.Screen>
        </Tab.Navigator>
        <StatusBar style="dark" />
      </SafeAreaView>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({});