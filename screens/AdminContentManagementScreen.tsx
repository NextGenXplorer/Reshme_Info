import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, where } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase.config';

interface ContentItem {
  id: string;
  type: 'image' | 'pdf' | 'video' | 'basicInfo';
  title: string;
  titleKn?: string;
  url?: string;
  description?: string;
  descriptionKn?: string;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminContentManagementScreenProps {
  onBack: () => void;
}

export default function AdminContentManagementScreen({ onBack }: AdminContentManagementScreenProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [selectedType, setSelectedType] = useState<'image' | 'pdf' | 'video' | 'basicInfo'>('image');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<{
    show: boolean;
    success: boolean;
    message: string;
    details?: string;
  }>({ show: false, success: false, message: '' });

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    titleKn: '',
    url: '',
    description: '',
    descriptionKn: '',
    order: 0,
    active: true,
    sendNotification: false,
    // Notification customization
    notificationPriority: 'high' as 'low' | 'medium' | 'high',
    notificationExpiry: 7,
    customNotificationTitle: '',
    customNotificationMessage: '',
    notificationSound: true,
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'infoContent'));
      const items: ContentItem[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          type: data.type,
          title: data.title,
          titleKn: data.titleKn,
          url: data.url,
          description: data.description,
          descriptionKn: data.descriptionKn,
          order: data.order,
          active: data.active,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      // Sort by order
      items.sort((a, b) => a.order - b.order);
      setContentItems(items);
    } catch (error) {
      console.error('Error fetching content:', error);
      Alert.alert(t('error'), t('failedToFetchContent'));
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = (type: 'image' | 'pdf' | 'video' | 'basicInfo') => {
    setSelectedType(type);
    setEditingItem(null);
    setFormData({
      title: '',
      titleKn: '',
      url: '',
      description: '',
      descriptionKn: '',
      order: contentItems.filter(item => item.type === type).length,
      active: true,
      sendNotification: false,
      notificationPriority: 'high',
      notificationExpiry: 7,
      customNotificationTitle: '',
      customNotificationMessage: '',
      notificationSound: true,
    });
    setShowModal(true);
  };

  const openEditModal = (item: ContentItem) => {
    setSelectedType(item.type);
    setEditingItem(item);
    setFormData({
      title: item.title,
      titleKn: item.titleKn || '',
      url: item.url || '',
      description: item.description || '',
      descriptionKn: item.descriptionKn || '',
      order: item.order,
      active: item.active,
      sendNotification: false,
      notificationPriority: 'high',
      notificationExpiry: 7,
      customNotificationTitle: '',
      customNotificationMessage: '',
      notificationSound: true,
    });
    setShowModal(true);
  };

  const sendPushNotifications = async (contentData: any) => {
    setSendingNotification(true);

    try {
      // Set defaults for notification customization fields
      const priority = contentData.priority || 'high';
      const expiryDays = contentData.expiryDays !== undefined ? contentData.expiryDays : 7;
      const customTitle = contentData.customTitle || '';
      const customMessage = contentData.customMessage || '';
      const sound = contentData.sound !== undefined ? contentData.sound : true;

      const contentTypeNames = {
        image: t('contentType_image'),
        pdf: t('contentType_pdf'),
        video: t('contentType_video'),
        basicInfo: t('contentType_basicInfo'),
      };

      // Get content type icon
      const contentTypeIcons: any = {
        image: '🖼️',
        pdf: '📄',
        video: '🎥',
        basicInfo: 'ℹ️',
      };

      const icon = contentTypeIcons[contentData.type] || '📢';

      // Use custom title/message if provided, otherwise use defaults
      const notificationTitle = customTitle || `${icon} ${t('newContentAdded')}`;
      const notificationMessage = customMessage || `${contentTypeNames[contentData.type]}: ${contentData.title}`;

      console.log('📨 Starting notification process...');
      console.log('📋 Title:', notificationTitle);
      console.log('📋 Message:', notificationMessage);
      console.log('🎯 Priority:', priority);
      console.log('⏰ Expiry:', expiryDays, 'days');
      console.log('🔊 Sound:', sound ? 'Enabled' : 'Disabled');

      // Step 1: Save to Firestore (for in-app notification management)
      const expiryDate = expiryDays > 0
        ? Timestamp.fromDate(new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000))
        : null;

      const notificationData: any = {
        title: notificationTitle,
        message: notificationMessage,
        priority: priority,
        targetAudience: 'all',
        createdBy: 'admin',
        createdAt: Timestamp.now(),
        expiresAt: expiryDate,
        isActive: true,
        contentId: contentData.id, // Store content ID for deletion later
      };

      // Only include imageUrl if it's an image type content
      if (contentData.url && contentData.type === 'image') {
        notificationData.imageUrl = contentData.url;
        console.log('🖼️ Image URL included:', contentData.url);
      }

      await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), notificationData);
      console.log('✅ Notification saved to Firestore with contentId:', contentData.id);

      // Step 2: Send push notification via backend
      const backendUrl = (process.env.EXPO_PUBLIC_BACKEND_URL || 'https://reshme-info.vercel.app').replace(/\/$/, '');
      console.log('🌐 Backend URL:', backendUrl);

      let pushStats = { fcmSent: 0, expoSent: 0, totalSent: 0, failed: false };

      try {
        const requestBody = {
          title: notificationTitle,
          message: notificationMessage,
          priority: priority,
          targetAudience: 'all',
          imageUrl: contentData.url && contentData.type === 'image' ? contentData.url : undefined,
        };

        console.log('📤 Sending to backend:', JSON.stringify(requestBody, null, 2));

        const pushResponse = await fetch(`${backendUrl}/send-custom-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log('📥 Backend response status:', pushResponse.status);

        const pushResult = await pushResponse.json();
        console.log('📥 Backend response:', JSON.stringify(pushResult, null, 2));

        if (pushResult.success) {
          pushStats = {
            fcmSent: pushResult.fcmSent || 0,
            expoSent: pushResult.expoSent || 0,
            totalSent: pushResult.totalSent || 0,
            failed: false,
          };
          console.log('✅ Push notification sent successfully!');
          console.log(`📊 Stats - FCM: ${pushStats.fcmSent}, Expo: ${pushStats.expoSent}, Total: ${pushStats.totalSent}`);

          if (pushStats.totalSent === 0) {
            console.warn('⚠️ WARNING: No devices received notifications!');
            console.warn('⚠️ This usually means no push tokens are registered in Firestore.');

            setNotificationStatus({
              show: true,
              success: false,
              message: t('notificationPartialSuccess'),
              details: 'No devices registered. In-app notification saved. Users need to register push tokens.',
            });
          } else {
            setNotificationStatus({
              show: true,
              success: true,
              message: t('notificationSentSuccess'),
              details: `${t('sentToDevices', { count: pushStats.totalSent })}\n${t('fcm')}: ${pushStats.fcmSent} | ${t('expo')}: ${pushStats.expoSent}`,
            });
          }
        } else {
          console.error('❌ Push notification failed:', pushResult.error);
          pushStats.failed = true;

          setNotificationStatus({
            show: true,
            success: false,
            message: t('notificationPartialSuccess'),
            details: `${t('savedInAppOnly')}\nError: ${pushResult.error}`,
          });
        }
      } catch (pushError: any) {
        console.error('❌ Error sending push notification:', pushError);
        console.error('❌ Error details:', pushError.message);
        pushStats.failed = true;

        setNotificationStatus({
          show: true,
          success: false,
          message: t('notificationPartialSuccess'),
          details: `${t('pushFailedInAppSaved')}\n${pushError.message}`,
        });
      }
    } catch (error: any) {
      console.error('❌ Notification error:', error);
      console.error('❌ Error details:', error.message);
      setNotificationStatus({
        show: true,
        success: false,
        message: t('error'),
        details: `${t('failedToSendNotification')}\n${error.message}`,
      });
    } finally {
      setSendingNotification(false);
      // Auto-hide status after 8 seconds (increased for reading)
      setTimeout(() => {
        setNotificationStatus({ show: false, success: false, message: '' });
      }, 8000);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert(t('validationError'), t('titleRequired'));
      return;
    }

    if (selectedType !== 'basicInfo' && !formData.url.trim()) {
      Alert.alert(t('validationError'), t('urlRequired'));
      return;
    }

    try {
      const contentData = {
        type: selectedType,
        title: formData.title,
        titleKn: formData.titleKn,
        url: formData.url,
        description: formData.description,
        descriptionKn: formData.descriptionKn,
        order: formData.order,
        active: formData.active,
        updatedAt: Timestamp.now(),
      };

      let savedId = '';

      if (editingItem) {
        // Update existing
        await updateDoc(doc(db, 'infoContent', editingItem.id), contentData);
        savedId = editingItem.id;
        Alert.alert(t('success'), t('contentUpdated'));
      } else {
        // Add new
        const docRef = await addDoc(collection(db, 'infoContent'), {
          ...contentData,
          createdAt: Timestamp.now(),
        });
        savedId = docRef.id;
        Alert.alert(t('success'), t('contentAdded'));
      }

      setShowModal(false);
      fetchContent();

      // Send notification if requested (after modal closes for better UX)
      if (formData.sendNotification && !editingItem) {
        console.log('🔧 Notification customization values:', {
          priority: formData.notificationPriority,
          expiryDays: formData.notificationExpiry,
          customTitle: formData.customNotificationTitle,
          customMessage: formData.customNotificationMessage,
          sound: formData.notificationSound,
        });

        await sendPushNotifications({
          ...contentData,
          id: savedId,
          priority: formData.notificationPriority,
          expiryDays: formData.notificationExpiry,
          customTitle: formData.customNotificationTitle,
          customMessage: formData.customNotificationMessage,
          sound: formData.notificationSound,
        });
      }
    } catch (error) {
      console.error('Error saving content:', error);
      Alert.alert(t('error'), t('failedToSaveContent'));
    }
  };

  const handleDelete = async (item: ContentItem) => {
    Alert.alert(
      t('deleteContent'),
      t('deleteContentConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting content with ID:', item.id);

              // Find and delete associated notification FIRST
              try {
                console.log('🔍 Searching for notifications with contentId:', item.id);
                const notificationsQuery = query(
                  collection(db, COLLECTIONS.NOTIFICATIONS),
                  where('contentId', '==', item.id)
                );
                const notificationSnapshot = await getDocs(notificationsQuery);

                console.log('📊 Found', notificationSnapshot.size, 'notification(s)');

                if (!notificationSnapshot.empty) {
                  // Log each notification before deleting
                  notificationSnapshot.docs.forEach((notificationDoc) => {
                    console.log('📝 Notification to delete:', {
                      id: notificationDoc.id,
                      data: notificationDoc.data(),
                    });
                  });

                  // Delete all notifications associated with this content
                  const deletePromises = notificationSnapshot.docs.map(notificationDoc => {
                    console.log('🗑️ Deleting notification:', notificationDoc.id);
                    return deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationDoc.id));
                  });
                  await Promise.all(deletePromises);
                  console.log(`✅ Deleted ${notificationSnapshot.size} notification(s) associated with content`);
                } else {
                  console.log('ℹ️ No notifications found for contentId:', item.id);

                  // Let's also check all notifications to debug
                  const allNotificationsSnapshot = await getDocs(collection(db, COLLECTIONS.NOTIFICATIONS));
                  console.log('📊 Total notifications in database:', allNotificationsSnapshot.size);
                  if (allNotificationsSnapshot.size > 0) {
                    console.log('📝 Sample notification data:');
                    allNotificationsSnapshot.docs.slice(0, 3).forEach(doc => {
                      console.log('  -', doc.id, ':', doc.data());
                    });
                  }
                }
              } catch (notificationError) {
                console.error('⚠️ Error deleting associated notification:', notificationError);
                // Don't fail the whole operation if notification deletion fails
              }

              // Delete the content
              await deleteDoc(doc(db, 'infoContent', item.id));
              console.log('✅ Content deleted:', item.id);

              Alert.alert(t('success'), t('contentDeleted'));
              fetchContent();
            } catch (error) {
              console.error('Error deleting content:', error);
              Alert.alert(t('error'), t('failedToDeleteContent'));
            }
          },
        },
      ]
    );
  };

  const toggleActive = async (item: ContentItem) => {
    try {
      await updateDoc(doc(db, 'infoContent', item.id), {
        active: !item.active,
        updatedAt: Timestamp.now(),
      });
      fetchContent();
    } catch (error) {
      console.error('Error toggling active:', error);
      Alert.alert(t('error'), t('failedToUpdateContent'));
    }
  };

  const renderContentItem = (item: ContentItem) => {
    const icons = {
      image: 'image',
      pdf: 'document-text',
      video: 'logo-youtube',
      basicInfo: 'information-circle',
    };

    const colors = {
      image: '#10B981',
      pdf: '#EF4444',
      video: '#EF4444',
      basicInfo: '#3B82F6',
    };

    return (
      <View key={item.id} style={styles.contentItem}>
        <View style={styles.contentItemHeader}>
          <View style={styles.contentItemLeft}>
            <View style={[styles.iconContainer, { backgroundColor: `${colors[item.type]}20` }]}>
              <Ionicons name={icons[item.type] as any} size={20} color={colors[item.type]} />
            </View>
            <View style={styles.contentItemInfo}>
              <Text style={styles.contentItemTitle}>{item.title}</Text>
              {item.titleKn && <Text style={styles.contentItemTitleKn}>{item.titleKn}</Text>}
              <Text style={styles.contentItemType}>{t(`contentType_${item.type}`)}</Text>
            </View>
          </View>

          <View style={styles.contentItemActions}>
            <TouchableOpacity
              style={[styles.activeToggle, item.active && styles.activeToggleActive]}
              onPress={() => toggleActive(item)}
            >
              <Ionicons
                name={item.active ? 'eye' : 'eye-off'}
                size={18}
                color={item.active ? '#10B981' : '#9CA3AF'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openEditModal(item)}
            >
              <Ionicons name="create" size={18} color="#3B82F6" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {item.url && (
          <Text style={styles.contentItemUrl} numberOfLines={1}>
            {item.url}
          </Text>
        )}
      </View>
    );
  };

  const renderSection = (type: 'image' | 'pdf' | 'video' | 'basicInfo', icon: string, color: string, title: string) => {
    const items = contentItems.filter(item => item.type === type);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name={icon as any} size={24} color={color} />
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{items.length}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: `${color}20` }]}
            onPress={() => openAddModal(type)}
          >
            <Ionicons name="add" size={20} color={color} />
            <Text style={[styles.addButtonText, { color }]}>{t('add')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContent}>
          {items.length === 0 ? (
            <Text style={styles.emptyText}>{t('noContentItems')}</Text>
          ) : (
            items.map(renderContentItem)
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('manageContent')}</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchContent}>
          <Ionicons name="refresh" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Notification Status Card */}
      {notificationStatus.show && (
        <View style={[
          styles.notificationStatusCard,
          notificationStatus.success ? styles.notificationSuccess : styles.notificationError
        ]}>
          <View style={styles.notificationStatusHeader}>
            <Ionicons
              name={notificationStatus.success ? "checkmark-circle" : "alert-circle"}
              size={24}
              color={notificationStatus.success ? "#10B981" : "#EF4444"}
            />
            <Text style={[
              styles.notificationStatusTitle,
              notificationStatus.success ? styles.successText : styles.errorText
            ]}>
              {notificationStatus.message}
            </Text>
          </View>
          {notificationStatus.details && (
            <Text style={styles.notificationStatusDetails}>{notificationStatus.details}</Text>
          )}
        </View>
      )}

      {/* Loading Overlay for Notification */}
      {sendingNotification && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>{t('sendingNotification')}</Text>
            <Text style={styles.loadingSubtext}>{t('pleaseWaitNotification')}</Text>
          </View>
        </View>
      )}

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderSection('basicInfo', 'information-circle', '#3B82F6', t('basicInformation'))}
        {renderSection('image', 'image', '#10B981', t('images'))}
        {renderSection('pdf', 'document-text', '#EF4444', t('pdfDocuments'))}
        {renderSection('video', 'logo-youtube', '#EF4444', t('videos'))}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
        statusBarTranslucent={true}
      >
        <StatusBar barStyle="light-content" backgroundColor="rgba(0, 0, 0, 0.5)" />
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidContainer}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingItem ? t('editContent') : t('addContent')}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>

              <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {/* Title (English) */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('titleEnglish')} *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                  placeholder={t('enterTitle')}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Title (Kannada) */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('titleKannada')}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.titleKn}
                  onChangeText={(text) => setFormData({ ...formData, titleKn: text })}
                  placeholder={t('enterTitleKannada')}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* URL (not for basicInfo) */}
              {selectedType !== 'basicInfo' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    {selectedType === 'image' ? t('imageUrl') :
                     selectedType === 'pdf' ? t('pdfUrl') :
                     t('videoUrl')} *
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={formData.url}
                    onChangeText={(text) => setFormData({ ...formData, url: text })}
                    placeholder={t('enterUrl')}
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* Description (English) - for basicInfo */}
              {selectedType === 'basicInfo' && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('descriptionEnglish')}</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.description}
                      onChangeText={(text) => setFormData({ ...formData, description: text })}
                      placeholder={t('enterDescription')}
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('descriptionKannada')}</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.descriptionKn}
                      onChangeText={(text) => setFormData({ ...formData, descriptionKn: text })}
                      placeholder={t('enterDescriptionKannada')}
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                    />
                  </View>
                </>
              )}

              {/* Order */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('displayOrder')}</Text>
                <TextInput
                  style={styles.input}
                  value={String(formData.order)}
                  onChangeText={(text) => setFormData({ ...formData, order: parseInt(text) || 0 })}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              {/* Active Toggle */}
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>{t('active')}</Text>
                  <TouchableOpacity
                    style={[styles.switch, formData.active && styles.switchActive]}
                    onPress={() => setFormData({ ...formData, active: !formData.active })}
                  >
                    <View style={[styles.switchThumb, formData.active && styles.switchThumbActive]} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Send Notification Toggle - Only for new content */}
              {!editingItem && (
                <View style={styles.formGroup}>
                  <View style={styles.notificationToggleCard}>
                    <View style={styles.notificationToggleHeader}>
                      <View style={styles.notificationIconContainer}>
                        <Ionicons name="notifications" size={18} color="#3B82F6" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.notificationToggleTitle}>{t('sendNotification')}</Text>
                        <Text style={styles.notificationToggleHint}>{t('sendNotificationHint')}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.switch, formData.sendNotification && styles.switchActive]}
                        onPress={() => setFormData({ ...formData, sendNotification: !formData.sendNotification })}
                      >
                        <View style={[styles.switchThumb, formData.sendNotification && styles.switchThumbActive]} />
                      </TouchableOpacity>
                    </View>
                    {formData.sendNotification && (
                      <>
                        <View style={styles.notificationPreview}>
                          <View style={styles.notificationPreviewHeader}>
                            <Ionicons name="eye" size={16} color="#6B7280" />
                            <Text style={styles.notificationPreviewLabel}>{t('notificationPreview')}</Text>
                          </View>
                          <View style={styles.notificationPreviewContent}>
                            <Text style={styles.notificationPreviewTitle}>
                              {formData.customNotificationTitle || `${selectedType === 'image' ? '🖼️' : selectedType === 'pdf' ? '📄' : selectedType === 'video' ? '🎥' : 'ℹ️'} ${t('newContentAdded')}`}
                            </Text>
                            <Text style={styles.notificationPreviewMessage}>
                              {formData.customNotificationMessage || `${t(`contentType_${selectedType}`)}: ${formData.title || t('untitled')}`}
                            </Text>
                            {formData.url && selectedType === 'image' && (
                              <View style={styles.imagePreviewContainer}>
                                <Image
                                  source={{ uri: formData.url }}
                                  style={styles.imagePreview}
                                  resizeMode="cover"
                                />
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Notification Customization Options */}
                        <View style={styles.notificationCustomization}>
                        {/* Priority Selector */}
                        <View style={styles.customizationGroup}>
                          <Text style={styles.customizationLabel}>{t('notificationPriority')}</Text>
                          <View style={styles.chipContainer}>
                            {(['low', 'medium', 'high'] as const).map((priority) => (
                              <TouchableOpacity
                                key={priority}
                                style={[
                                  styles.chip,
                                  formData.notificationPriority === priority && styles.chipActive,
                                ]}
                                onPress={() => setFormData({ ...formData, notificationPriority: priority })}
                              >
                                <Text style={[
                                  styles.chipText,
                                  formData.notificationPriority === priority && styles.chipTextActive,
                                ]}>
                                  {t(`priority_${priority}`)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>

                        {/* Expiry Selector */}
                        <View style={styles.customizationGroup}>
                          <Text style={styles.customizationLabel}>{t('notificationExpiry')}</Text>
                          <View style={styles.chipContainer}>
                            {[0, 1, 3, 7, 14, 30].map((days) => (
                              <TouchableOpacity
                                key={days}
                                style={[
                                  styles.chip,
                                  formData.notificationExpiry === days && styles.chipActive,
                                ]}
                                onPress={() => setFormData({ ...formData, notificationExpiry: days })}
                              >
                                <Text style={[
                                  styles.chipText,
                                  formData.notificationExpiry === days && styles.chipTextActive,
                                ]}>
                                  {days === 0 ? t('never') : t('daysCount', { count: days })}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>

                        {/* Custom Title */}
                        <View style={styles.customizationGroup}>
                          <Text style={styles.customizationLabel}>{t('customNotificationTitle')}</Text>
                          <TextInput
                            style={styles.customizationInput}
                            value={formData.customNotificationTitle}
                            onChangeText={(text) => setFormData({ ...formData, customNotificationTitle: text })}
                            placeholder={t('customTitlePlaceholder')}
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>

                        {/* Custom Message */}
                        <View style={styles.customizationGroup}>
                          <Text style={styles.customizationLabel}>{t('customNotificationMessage')}</Text>
                          <TextInput
                            style={[styles.customizationInput, styles.customizationTextArea]}
                            value={formData.customNotificationMessage}
                            onChangeText={(text) => setFormData({ ...formData, customNotificationMessage: text })}
                            placeholder={t('customMessagePlaceholder')}
                            placeholderTextColor="#9CA3AF"
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                          />
                        </View>

                        {/* Sound Toggle */}
                        <View style={styles.customizationGroup}>
                          <View style={styles.switchRow}>
                            <View>
                              <Text style={styles.customizationLabel}>{t('notificationSound')}</Text>
                              <Text style={styles.helperText}>{t('notificationSoundHint')}</Text>
                            </View>
                            <TouchableOpacity
                              style={[styles.switch, formData.notificationSound && styles.switchActive]}
                              onPress={() => setFormData({ ...formData, notificationSound: !formData.notificationSound })}
                            >
                              <View style={[styles.switchThumb, formData.notificationSound && styles.switchThumbActive]} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                      </>
                    )}
                  </View>
                </View>
              )}

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>
                    {editingItem ? t('update') : t('add')}
                  </Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  refreshButton: {
    padding: 8,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Section
  section: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  badge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  sectionContent: {
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Content Item
  contentItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contentItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  contentItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  contentItemTitleKn: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  contentItemType: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  contentItemUrl: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 8,
  },
  contentItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeToggle: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  activeToggleActive: {
    backgroundColor: '#D1FAE5',
  },
  actionButton: {
    padding: 6,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidContainer: {
    width: '100%',
    height: '90%',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '100%',
    width: '100%',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 150,
  },

  // Form
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    maxHeight: 150,
    paddingTop: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1D5DB',
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#10B981',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Notification Status Card
  notificationStatusCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  notificationSuccess: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  notificationError: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  notificationStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationStatusTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  successText: {
    color: '#065F46',
  },
  errorText: {
    color: '#991B1B',
  },
  notificationStatusDetails: {
    fontSize: 13,
    color: '#374151',
    marginTop: 8,
    marginLeft: 36,
    lineHeight: 18,
  },

  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },

  // Notification Toggle Card
  notificationToggleCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  notificationToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  notificationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationToggleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  notificationToggleHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  // Notification Preview
  notificationPreview: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 12,
  },
  notificationPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  notificationPreviewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  notificationPreviewContent: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  notificationPreviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  notificationPreviewMessage: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  imagePreviewContainer: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  imagePreview: {
    width: '100%',
    height: 100,
  },

  // Notification Customization
  notificationCustomization: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
  },
  customizationGroup: {
    gap: 6,
  },
  customizationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  chipTextActive: {
    color: '#3B82F6',
  },
  customizationInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
  },
  customizationTextArea: {
    minHeight: 60,
    maxHeight: 80,
    paddingTop: 10,
  },
});
