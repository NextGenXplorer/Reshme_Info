import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Notification } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface NotificationDetailScreenProps {
  notification: Notification;
  onBack: () => void;
}

const DEVICE_ID_KEY = '@reshme_device_id';
const READ_NOTIFICATIONS_KEY = '@reshme_read_notifications';

export default function NotificationDetailScreen({
  notification,
  onBack,
}: NotificationDetailScreenProps) {
  const { t } = useTranslation();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Mark notification as read
    markAsRead();
  }, [notification.id]);

  const markAsRead = async () => {
    try {
      const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        // Generate device ID if doesn't exist
        const newDeviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(DEVICE_ID_KEY, newDeviceId);
      }

      // Get existing read notifications
      const readNotifications = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
      const readList = readNotifications ? JSON.parse(readNotifications) : [];

      // Add this notification if not already read
      if (!readList.includes(notification.id)) {
        readList.push(notification.id);
        await AsyncStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(readList));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
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
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <LinearGradient
        colors={['#3B82F6', '#2563EB']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('notificationDetails')}</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Priority Badge */}
        <View style={[styles.priorityBanner, { backgroundColor: getPriorityColor(notification.priority) }]}>
          <Ionicons
            name={getPriorityIcon(notification.priority) as any}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.priorityBannerText}>
            {t(notification.priority)} {t('priority')}
          </Text>
        </View>

        {/* Image (if exists) */}
        {notification.imageUrl && !imageError && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: notification.imageUrl }}
              style={styles.notificationImage}
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
              resizeMode="cover"
            />
            {imageLoading && (
              <View style={styles.imageLoadingOverlay}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            )}
          </View>
        )}

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
        </View>

        {/* Metadata */}
        <View style={styles.metadataContainer}>
          <View style={styles.metadataRow}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.metadataText}>{formatDate(notification.createdAt)}</Text>
          </View>

          {notification.targetAudience === 'market_specific' && notification.targetMarket && (
            <View style={styles.metadataRow}>
              <Ionicons name="location" size={16} color="#3B82F6" />
              <Text style={[styles.metadataText, { color: '#3B82F6' }]}>
                {notification.targetMarket}
              </Text>
            </View>
          )}

          <View style={styles.metadataRow}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={styles.metadataText}>
              {t('createdBy')}: {notification.createdBy}
            </Text>
          </View>

          {notification.expiresAt && (
            <View style={styles.metadataRow}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={styles.metadataText}>
                {t('expiresOn')}: {notification.expiresAt.toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Message Content */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageLabel}>{t('message')}:</Text>
          <Text style={styles.messageText}>{notification.message}</Text>
        </View>

        {/* Action Buttons (if needed in future) */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onBack}
          >
            <Text style={styles.closeButtonText}>{t('close')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  priorityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  priorityBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  imageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  notificationImage: {
    width: '100%',
    height: '100%',
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  notificationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 32,
  },
  metadataContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metadataText: {
    fontSize: 14,
    color: '#6B7280',
  },
  messageContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  actionContainer: {
    padding: 20,
    marginTop: 12,
  },
  closeButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
