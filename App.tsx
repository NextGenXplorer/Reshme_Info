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

// Import screen components
import HomeScreen from './screens/HomeScreen';
import MarketScreen from './screens/MarketScreen';
import StatsScreen from './screens/StatsScreen';
import AboutScreen from './screens/AboutScreen';
import AdminNavigator from './screens/AdminNavigator';

const Tab = createBottomTabNavigator();

async function registerForPushNotificationsAsync() {
  let token;
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
    Alert.alert('Failed to get push token for push notification!');
    return;
  }
  token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log(token);

  if (token) {
    try {
      await setDoc(doc(db, "pushTokens", token), {
        token: token,
        createdAt: new Date(),
      });
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  }

  return token;
}

const AppContent = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification | false>(false);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token || ''));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
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

  return (
    <NavigationContainer>
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