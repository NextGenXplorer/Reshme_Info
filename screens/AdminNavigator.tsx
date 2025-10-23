import React, { useState, useEffect } from 'react';
import { Alert, BackHandler } from 'react-native';
import { adminAuth } from '../utils/adminAuth';
import { AdminUser, CocoonPrice } from '../types';
import AdminLoginScreen from './AdminLoginScreen';
import AdminDashboardScreen from './AdminDashboardScreen';
import AdminPriceFormScreen from './AdminPriceFormScreen';
import AdminNotificationScreen from './AdminNotificationScreen';
import AdminAIExtractScreen from './AdminAIExtractScreen';

type AdminScreen = 'login' | 'dashboard' | 'add_price' | 'edit_price' | 'notifications' | 'ai_extract';

interface AdminNavigatorProps {
  onExit: () => void;
}

export default function AdminNavigator({ onExit }: AdminNavigatorProps) {
  const [currentScreen, setCurrentScreen] = useState<AdminScreen>('login');
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [priceToEdit, setPriceToEdit] = useState<CocoonPrice | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    checkExistingSession();
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [currentScreen]);

  const checkExistingSession = async () => {
    try {
      const { authenticated, user } = await adminAuth.isAuthenticated();
      if (authenticated && user) {
        setCurrentUser(user);
        setCurrentScreen('dashboard');
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setInitializing(false);
    }
  };

  const handleBackPress = (): boolean => {
    switch (currentScreen) {
      case 'login':
        onExit();
        return true;

      case 'dashboard':
        Alert.alert(
          'Exit Admin Panel',
          'Are you sure you want to exit the admin panel?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit', style: 'default', onPress: onExit },
          ]
        );
        return true;

      case 'notifications':
      case 'ai_extract':
        setCurrentScreen('dashboard');
        return true;

      case 'add_price':
      case 'edit_price':
        Alert.alert(
          'Cancel Form',
          'Are you sure you want to cancel? Any unsaved changes will be lost.',
          [
            { text: 'Keep Editing', style: 'cancel' },
            {
              text: 'Cancel',
              style: 'destructive',
              onPress: () => {
                setPriceToEdit(null);
                setCurrentScreen('dashboard');
              }
            },
          ]
        );
        return true;

      default:
        return false;
    }
  };

  const handleLoginSuccess = (user: AdminUser) => {
    setCurrentUser(user);
    setCurrentScreen('dashboard');

    // Refresh session
    adminAuth.refreshSession();
  };

  const handleLogout = async () => {
    await adminAuth.logout();
    setCurrentUser(null);
    setPriceToEdit(null);
    setCurrentScreen('login');
  };

  const handleAddPrice = () => {
    setPriceToEdit(null);
    setCurrentScreen('add_price');
  };

  const handleEditPrice = (price: CocoonPrice) => {
    setPriceToEdit(price);
    setCurrentScreen('edit_price');
  };

  const handleManageNotifications = () => {
    setCurrentScreen('notifications');
  };

  const handleAIExtract = () => {
    setCurrentScreen('ai_extract');
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
  };

  const handlePriceSaved = () => {
    setPriceToEdit(null);
    setCurrentScreen('dashboard');
  };

  const handleCancelForm = () => {
    setPriceToEdit(null);
    setCurrentScreen('dashboard');
  };

  if (initializing) {
    // You could add a loading screen here
    return null;
  }

  switch (currentScreen) {
    case 'login':
      return (
        <AdminLoginScreen
          onLoginSuccess={handleLoginSuccess}
          onCancel={onExit}
        />
      );

    case 'dashboard':
      return currentUser ? (
        <AdminDashboardScreen
          user={currentUser}
          onLogout={handleLogout}
          onAddPrice={handleAddPrice}
          onEditPrice={handleEditPrice}
          onManageNotifications={handleManageNotifications}
          onAIExtract={handleAIExtract}
        />
      ) : null;

    case 'notifications':
      return currentUser ? (
        <AdminNotificationScreen
          user={currentUser}
          onBack={handleBackToDashboard}
        />
      ) : null;

    case 'ai_extract':
      return currentUser ? (
        <AdminAIExtractScreen
          user={currentUser}
          onBack={handleBackToDashboard}
        />
      ) : null;

    case 'add_price':
    case 'edit_price':
      return currentUser ? (
        <AdminPriceFormScreen
          user={currentUser}
          priceToEdit={priceToEdit}
          onSave={handlePriceSaved}
          onCancel={handleCancelForm}
        />
      ) : null;

    default:
      return null;
  }
}