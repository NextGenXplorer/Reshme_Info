import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase.config';
import { Notification } from '../types';
import Header from '../components/Header';
import NotificationDetailScreen from './NotificationDetailScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const READ_NOTIFICATIONS_KEY = '@reshme_read_notifications';

interface NotificationsScreenProps {
  onBack?: () => void;
}

export default function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);

  useEffect(() => {
    fetchNotifications();
    loadReadNotifications();
  }, []);

  const loadReadNotifications = async () => {
    try {
      const readList = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
      if (readList) {
        setReadNotifications(JSON.parse(readList));
      }
    } catch (error) {
      console.error('Error loading read notifications:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const now = Timestamp.now();

      // Query notifications - simplified for immediate testing
      // OPTION 1: Simple query (works without index - use this for immediate testing)
      const q = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        orderBy('createdAt', 'desc')
      );

      // OPTION 2: After deploying indexes, uncomment this for better performance
      // const q = query(
      //   collection(db, COLLECTIONS.NOTIFICATIONS),
      //   where('isActive', '==', true),
      //   orderBy('createdAt', 'desc')
      // );

      const querySnapshot = await getDocs(q);
      const notificationsData: Notification[] = [];

      querySnapshot.forEach((document) => {
        const data = document.data();
        const expiresAt = data.expiresAt ? data.expiresAt.toDate() : null;

        // Client-side filtering for active and non-expired notifications
        if (data.isActive && (!expiresAt || expiresAt > new Date())) {
          notificationsData.push({
            id: document.id,
            ...data,
            createdAt: data.createdAt.toDate(),
            expiresAt,
          } as Notification);
        }
      });

      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert(t('error'), t('failedToLoadNotifications'));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    await loadReadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: Notification) => {
    setSelectedNotification(notification);
  };

  const handleBackFromDetail = async () => {
    setSelectedNotification(null);
    // Reload read notifications after viewing detail
    await loadReadNotifications();
  };

  const isNotificationRead = (notificationId: string) => {
    return readNotifications.includes(notificationId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#EF4444'; // Red
      case 'medium':
        return '#F59E0B'; // Orange
      case 'low':
        return '#10B981'; // Green
      default:
        return '#6B7280'; // Gray
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'alert-circle';
      case 'medium':
        return 'information-circle';
      case 'low':
        return 'checkmark-circle';
      default:
        return 'ellipse';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('justNow');
    if (diffMins < 60) return t('minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('daysAgo', { count: diffDays });

    return date.toLocaleDateString();
  };

  const filteredNotifications = selectedPriority === 'all'
    ? notifications
    : notifications.filter(n => n.priority === selectedPriority);

  const renderFilterChip = (priority: 'all' | 'low' | 'medium' | 'high', label: string) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        selectedPriority === priority && styles.filterChipActive,
        selectedPriority === priority && { backgroundColor: priority === 'all' ? '#3B82F6' : getPriorityColor(priority) }
      ]}
      onPress={() => setSelectedPriority(priority)}
    >
      <Text
        style={[
          styles.filterChipText,
          selectedPriority === priority && styles.filterChipTextActive
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderNotificationCard = (notification: Notification) => {
    const isRead = isNotificationRead(notification.id);

    return (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationCard,
        !isRead && styles.unreadNotificationCard
      ]}
      onPress={() => handleNotificationPress(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.priorityBadge}>
          <Ionicons
            name={getPriorityIcon(notification.priority) as any}
            size={16}
            color={getPriorityColor(notification.priority)}
          />
          <Text style={[styles.priorityText, { color: getPriorityColor(notification.priority) }]}>
            {t(notification.priority)}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {!isRead && <View style={styles.unreadDot} />}
          <Text style={styles.dateText}>{formatDate(notification.createdAt)}</Text>
        </View>
      </View>

      <Text style={[styles.notificationTitle, !isRead && styles.unreadTitle]}>
        {notification.title}
      </Text>
      <Text style={styles.notificationMessage} numberOfLines={2}>
        {notification.message}
      </Text>

      {notification.targetAudience === 'market_specific' && notification.targetMarket && (
        <View style={styles.marketTag}>
          <Ionicons name="location" size={14} color="#3B82F6" />
          <Text style={styles.marketTagText}>{notification.targetMarket}</Text>
        </View>
      )}

      {notification.imageUrl && (
        <View style={styles.imageIndicator}>
          <Ionicons name="image" size={14} color="#6B7280" />
          <Text style={styles.imageIndicatorText}>{t('hasImage')}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        {notification.expiresAt && (
          <Text style={styles.expiryText}>
            {t('expiresOn')}: {notification.expiresAt.toLocaleDateString()}
          </Text>
        )}
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
};

  // Show detail screen if notification is selected
  if (selectedNotification) {
    return (
      <NotificationDetailScreen
        notification={selectedNotification}
        onBack={handleBackFromDetail}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={t('notifications')}
        leftComponent={onBack ? (
          <TouchableOpacity onPress={onBack} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
        ) : undefined}
      />

      {/* Filter Section */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {renderFilterChip('all', t('all'))}
          {renderFilterChip('high', t('high'))}
          {renderFilterChip('medium', t('medium'))}
          {renderFilterChip('low', t('low'))}
        </ScrollView>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>{t('loading')}</Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.emptyIconContainer}
            >
              <Ionicons name="notifications-off-outline" size={60} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>{t('noNotifications')}</Text>
            <Text style={styles.emptySubtitle}>{t('noNotificationsDesc')}</Text>
          </View>
        ) : (
          <>
            {/* Statistics Card */}
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{filteredNotifications.length}</Text>
                <Text style={styles.statLabel}>{t('total')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>
                  {notifications.filter(n => n.priority === 'high').length}
                </Text>
                <Text style={styles.statLabel}>{t('high')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                  {notifications.filter(n => n.priority === 'medium').length}
                </Text>
                <Text style={styles.statLabel}>{t('medium')}</Text>
              </View>
            </View>

            {/* Notifications */}
            {filteredNotifications.map(renderNotificationCard)}
          </>
        )}

        {/* COMMENTED OUT FOR TESTING - Uncomment for production */}
        {/* <View style={styles.adContainer}>
          <AdBanner />
        </View> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    borderColor: 'transparent',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  unreadNotificationCard: {
    backgroundColor: '#EFF6FF',
    borderLeftColor: '#3B82F6',
    borderLeftWidth: 6,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  unreadTitle: {
    fontWeight: '800',
    color: '#1F2937',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  marketTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    marginBottom: 8,
  },
  marketTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  imageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  imageIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  expiryText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  adContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
});
