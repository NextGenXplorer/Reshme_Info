import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, TouchableOpacity, View, StyleSheet } from 'react-native';
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
import AdminNavigator from './screens/AdminNavigator';

const Tab = createBottomTabNavigator();

export default function App() {
  const { t } = useTranslation();
  const [showAdminPanel, setShowAdminPanel] = useState(false);

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
        {/* Admin Access Button - Hidden in Production */}
        {__DEV__ && (
          <View style={styles.adminAccess}>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => setShowAdminPanel(true)}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        )}

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

const styles = StyleSheet.create({
  adminAccess: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
  },
  adminButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});
