import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase.config';
import { Notification } from '../types';

const READ_NOTIFICATIONS_KEY = '@reshme_read_notifications';

export const getReadNotifications = async (): Promise<string[]> => {
  try {
    const readList = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
    return readList ? JSON.parse(readList) : [];
  } catch (error) {
    console.error('Error loading read notifications:', error);
    return [];
  }
};

export const getUnreadCount = async (): Promise<number> => {
  try {
    // Fetch active notifications
    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const activeNotifications: string[] = [];

    querySnapshot.forEach((document) => {
      const data = document.data();
      const expiresAt = data.expiresAt ? data.expiresAt.toDate() : null;

      // Only count active and non-expired notifications
      if (data.isActive && (!expiresAt || expiresAt > new Date())) {
        activeNotifications.push(document.id);
      }
    });

    // Get read notifications
    const readNotifications = await getReadNotifications();

    // Calculate unread count
    const unreadCount = activeNotifications.filter(
      (id) => !readNotifications.includes(id)
    ).length;

    return unreadCount;
  } catch (error) {
    console.error('Error calculating unread count:', error);
    return 0;
  }
};
