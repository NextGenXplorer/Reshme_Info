import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import './i18n';

// Import screen components
import HomeScreen from './screens/HomeScreen';
import MarketScreen from './screens/MarketScreen';
import StatsScreen from './screens/StatsScreen';
import AboutScreen from './screens/AboutScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const { t } = useTranslation();

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
              paddingBottom: 8,
              height: 70,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 8,
            },
            tabBarLabelStyle: {
              fontSize: 12,
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
              tabBarLabel: t('home') || 'Home',
            }}
          />
          <Tab.Screen
            name="Market"
            component={MarketScreen}
            options={{
              tabBarLabel: t('market') || 'Market',
            }}
          />
          <Tab.Screen
            name="Stats"
            component={StatsScreen}
            options={{
              tabBarLabel: t('stats') || 'Stats',
            }}
          />
          <Tab.Screen
            name="About"
            component={AboutScreen}
            options={{
              tabBarLabel: t('about') || 'About',
            }}
          />
        </Tab.Navigator>
        <StatusBar style="dark" />
      </SafeAreaView>
    </NavigationContainer>
  );
}