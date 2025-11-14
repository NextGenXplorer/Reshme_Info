import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface LocationPermissionDisclosureProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function LocationPermissionDisclosure({
  visible,
  onAccept,
  onDecline,
}: LocationPermissionDisclosureProps) {
  const { t } = useTranslation();

  const openPrivacyPolicy = () => {
    Linking.openURL('https://reshmeinfo.web.app/privacy-policy.html');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView style={styles.scrollView}>
            {/* Header */}
            <View style={styles.header}>
              <Ionicons name="location" size={48} color="#3B82F6" />
              <Text style={styles.title}>{t('locationPermissionTitle')}</Text>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
              <Text style={styles.subtitle}>
                {t('locationPermissionSubtitle')}
              </Text>

              {/* Why We Need Location */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="information-circle" size={24} color="#3B82F6" />
                  <Text style={styles.sectionTitle}>
                    {t('whyWeNeedLocation')}
                  </Text>
                </View>

                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <Ionicons name="cloud" size={20} color="#10B981" />
                    <Text style={styles.featureText}>
                      {t('locationFeature1')}
                    </Text>
                  </View>

                  <View style={styles.featureItem}>
                    <Ionicons name="pricetag" size={20} color="#10B981" />
                    <Text style={styles.featureText}>
                      {t('locationFeature2')}
                    </Text>
                  </View>

                  <View style={styles.featureItem}>
                    <Ionicons name="leaf" size={20} color="#10B981" />
                    <Text style={styles.featureText}>
                      {t('locationFeature3')}
                    </Text>
                  </View>

                  <View style={styles.featureItem}>
                    <Ionicons name="notifications" size={20} color="#10B981" />
                    <Text style={styles.featureText}>
                      {t('locationFeature4')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Background Location Disclosure */}
              <View style={[styles.section, styles.backgroundSection]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="time" size={24} color="#F59E0B" />
                  <Text style={styles.sectionTitle}>
                    {t('backgroundLocationTitle')}
                  </Text>
                </View>

                <Text style={styles.backgroundText}>
                  {t('backgroundLocationDescription')}
                </Text>

                <View style={styles.warningBox}>
                  <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                  <Text style={styles.warningText}>
                    {t('backgroundLocationPrivacy')}
                  </Text>
                </View>
              </View>

              {/* Your Privacy Matters */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="lock-closed" size={24} color="#8B5CF6" />
                  <Text style={styles.sectionTitle}>
                    {t('yourPrivacyMatters')}
                  </Text>
                </View>

                <Text style={styles.privacyText}>
                  {t('privacyDescription')}
                </Text>

                <TouchableOpacity
                  style={styles.privacyLink}
                  onPress={openPrivacyPolicy}
                >
                  <Text style={styles.privacyLinkText}>
                    {t('readPrivacyPolicy')}
                  </Text>
                  <Ionicons name="open-outline" size={16} color="#3B82F6" />
                </TouchableOpacity>
              </View>

              {/* You Can Always Change This */}
              <View style={[styles.section, styles.lastSection]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="settings" size={24} color="#6B7280" />
                  <Text style={styles.sectionTitle}>
                    {t('youCanChangeThis')}
                  </Text>
                </View>

                <Text style={styles.settingsText}>
                  {t('changePermissionsDescription')}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.declineButton]}
                onPress={onDecline}
              >
                <Text style={styles.declineButtonText}>
                  {t('notNow')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.acceptButton]}
                onPress={onAccept}
              >
                <Text style={styles.acceptButtonText}>
                  {t('allowLocation')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxWidth: 500,
    width: '100%',
    maxHeight: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  scrollView: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  content: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  lastSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  featureList: {
    marginLeft: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  backgroundSection: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  backgroundText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 12,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  warningText: {
    fontSize: 13,
    color: '#065F46',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  privacyText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  privacyLinkText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
    marginRight: 4,
  },
  settingsText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  acceptButton: {
    backgroundColor: '#3B82F6',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
