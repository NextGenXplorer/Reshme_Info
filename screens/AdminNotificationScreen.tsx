import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Dimensions,
  FlatList,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, addDoc, deleteDoc, doc, orderBy, query, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase.config';
import { AdminUser, Notification, NotificationFormData } from '../types';
import { adminAuth } from '../utils/adminAuth';
import Header from '../components/Header';

const { width } = Dimensions.get('window');

interface AdminNotificationScreenProps {
  user: AdminUser;
  onBack: () => void;
}

export default function AdminNotificationScreen({
  user,
  onBack,
}: AdminNotificationScreenProps) {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState<NotificationFormData>({
    title: '',
    message: '',
    imageUrl: '',
    priority: 'medium',
    targetAudience: 'all',
    targetMarket: undefined,
    expiryDays: 7,
  });

  const availableMarkets = adminAuth.getAvailableMarkets(user);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, COLLECTIONS.NOTIFICATIONS), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const notificationsData: Notification[] = [];

      querySnapshot.forEach((document) => {
        const data = document.data();
        notificationsData.push({
          id: document.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          expiresAt: data.expiresAt ? data.expiresAt.toDate() : null,
        } as Notification);
      });

      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert(t('error'), t('notificationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      Alert.alert(t('validationError'), 'Please fill in all required fields');
      return;
    }

    try {
      const expiresAt = formData.expiryDays > 0
        ? Timestamp.fromDate(new Date(Date.now() + formData.expiryDays * 24 * 60 * 60 * 1000))
        : null;

      // Step 1: Save to Firestore (for in-app notification management)
      const notificationData: any = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        targetAudience: formData.targetAudience,
        createdBy: user.username,
        createdAt: Timestamp.now(),
        expiresAt,
        isActive: true,
      };

      // Only include imageUrl if it's provided
      if (formData.imageUrl && formData.imageUrl.trim()) {
        notificationData.imageUrl = formData.imageUrl.trim();
      }

      // Only include targetMarket if it's defined
      if (formData.targetMarket) {
        notificationData.targetMarket = formData.targetMarket;
      }

      await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), notificationData);

      // Step 2: Send push notification via backend
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://reshme-info.vercel.app';

      try {
        const pushResponse = await fetch(`${backendUrl}/send-custom-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: formData.title.trim(),
            message: formData.message.trim(),
            priority: formData.priority,
            targetAudience: formData.targetAudience,
            targetMarket: formData.targetMarket,
            imageUrl: formData.imageUrl?.trim() || undefined,
          }),
        });

        const pushResult = await pushResponse.json();

        if (pushResult.success) {
          console.log('✅ Push notification sent:', pushResult);
          Alert.alert(
            t('success'),
            `${t('notificationSent')}\n\nSent to ${pushResult.totalSent} devices`
          );
        } else {
          console.error('Push notification failed:', pushResult.error);
          Alert.alert(
            t('success'),
            `${t('notificationSent')}\n\n⚠️ Push delivery failed: ${pushResult.error}`
          );
        }
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
        Alert.alert(
          t('success'),
          `${t('notificationSent')}\n\n⚠️ Push notification delivery failed (saved in-app only)`
        );
      }

      setShowForm(false);
      resetForm();
      fetchNotifications();
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert(t('error'), t('notificationFailed'));
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    Alert.alert(
      t('deleteNotification'),
      t('deleteNotificationConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('deleteNotification'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId));
              Alert.alert(t('success'), t('notificationDeleted'));
              fetchNotifications();
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert(t('error'), t('notificationFailed'));
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      imageUrl: '',
      priority: 'medium',
      targetAudience: 'all',
      targetMarket: undefined,
      expiryDays: 7,
    });
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

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const isExpired = item.expiresAt && item.expiresAt < new Date();
    const priorityColor = getPriorityColor(item.priority);

    return (
      <View style={[styles.notificationCard, isExpired && styles.expiredCard]}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <View style={styles.notificationMeta}>
              <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}15` }]}>
                <Text style={[styles.priorityText, { color: priorityColor }]}>
                  {t(`priority${item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}`)}
                </Text>
              </View>
              {item.targetAudience === 'market_specific' && item.targetMarket && (
                <View style={styles.marketBadge}>
                  <Text style={styles.marketText}>{item.targetMarket}</Text>
                </View>
              )}
              {isExpired && (
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredText}>Expired</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteNotification(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <Text style={styles.notificationMessage}>{item.message}</Text>

        <View style={styles.notificationFooter}>
          <Text style={styles.footerText}>
            {t('createdBy')}: {item.createdBy}
          </Text>
          <Text style={styles.footerText}>
            {item.createdAt.toLocaleDateString('en-IN')}
          </Text>
        </View>

        {item.expiresAt && (
          <Text style={styles.expiryText}>
            {t('expiresOn')}: {item.expiresAt.toLocaleDateString('en-IN')}
          </Text>
        )}
      </View>
    );
  };

  const FilterChip = ({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.filterChip, isActive && styles.filterChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const activeNotifications = notifications.filter(n => !n.expiresAt || n.expiresAt > new Date());
  const expiredNotifications = notifications.filter(n => n.expiresAt && n.expiresAt <= new Date());

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('manageNotifications')}
        subtitle={`${activeNotifications.length} ${t('activeNotifications')}`}
        leftComponent={
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!showForm ? (
          <>
            {/* Create Notification Button */}
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowForm(true)}
            >
              <Ionicons name="add-circle" size={24} color="#FFFFFF" />
              <Text style={styles.createButtonText}>{t('createNotification')}</Text>
            </TouchableOpacity>

            {/* Active Notifications */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('activeNotifications')}</Text>
              {activeNotifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyText}>{t('noActiveNotifications')}</Text>
                </View>
              ) : (
                <FlatList
                  data={activeNotifications}
                  renderItem={renderNotificationItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              )}
            </View>

            {/* Expired Notifications */}
            {expiredNotifications.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('expiredNotifications')}</Text>
                <FlatList
                  data={expiredNotifications}
                  renderItem={renderNotificationItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}
          </>
        ) : (
          <>
            {/* Notification Form */}
            <View style={styles.formContainer}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>{t('createNotification')}</Text>
                <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('notificationTitle')} *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                  placeholder="Enter notification title"
                  maxLength={100}
                />
              </View>

              {/* Message Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('notificationMessage')} *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.message}
                  onChangeText={(text) => setFormData({ ...formData, message: text })}
                  placeholder="Enter notification message"
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
              </View>

              {/* Image URL Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Image URL (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.imageUrl}
                  onChangeText={(text) => setFormData({ ...formData, imageUrl: text })}
                  placeholder="https://example.com/image.jpg"
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.helperText}>
                  Add an image URL to display with this notification
                </Text>
              </View>

              {/* Priority Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('notificationPriority')}</Text>
                <View style={styles.filterChipsContainer}>
                  {(['low', 'medium', 'high'] as const).map((priority) => (
                    <FilterChip
                      key={priority}
                      label={t(`priority${priority.charAt(0).toUpperCase() + priority.slice(1)}`)}
                      isActive={formData.priority === priority}
                      onPress={() => setFormData({ ...formData, priority })}
                    />
                  ))}
                </View>
              </View>

              {/* Target Audience */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('targetAudience')}</Text>
                <View style={styles.filterChipsContainer}>
                  <FilterChip
                    label={t('audienceAll')}
                    isActive={formData.targetAudience === 'all'}
                    onPress={() => setFormData({ ...formData, targetAudience: 'all', targetMarket: undefined })}
                  />
                  <FilterChip
                    label={t('audienceMarketSpecific')}
                    isActive={formData.targetAudience === 'market_specific'}
                    onPress={() => setFormData({ ...formData, targetAudience: 'market_specific' })}
                  />
                </View>
              </View>

              {/* Market Selection (if market-specific) */}
              {formData.targetAudience === 'market_specific' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('selectTargetMarket')}</Text>
                  <View style={styles.filterChipsContainer}>
                    {availableMarkets.map((market) => (
                      <FilterChip
                        key={market}
                        label={market}
                        isActive={formData.targetMarket === market}
                        onPress={() => setFormData({ ...formData, targetMarket: market })}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Expiry Days */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('expiryDays')}</Text>
                <View style={styles.filterChipsContainer}>
                  {[0, 1, 3, 7, 14, 30].map((days) => (
                    <FilterChip
                      key={days}
                      label={days === 0 ? t('expiryNever') : `${days} days`}
                      isActive={formData.expiryDays === days}
                      onPress={() => setFormData({ ...formData, expiryDays: days })}
                    />
                  ))}
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSendNotification}
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>{t('sendNotificationBtn')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Create Button
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Section
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },

  // Empty State
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '500',
  },

  // Notification Card
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  expiredCard: {
    opacity: 0.6,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  notificationMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  marketBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#3B82F615',
  },
  marketText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  expiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#EF444415',
  },
  expiredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  expiryText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 8,
  },

  // Form
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
