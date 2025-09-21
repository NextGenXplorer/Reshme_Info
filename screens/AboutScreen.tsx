import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

export default function AboutScreen() {
  const { t } = useTranslation();

  const teamMembers = [
    {
      name: 'Mithun Gowda B',
      role: 'Founder & Lead Developer',
      description: 'Leading the vision for transparent silk market pricing',
      icon: 'person-circle',
      color: '#3B82F6',
    },
    {
      name: 'Manvanth Gowda M',
      role: 'Developer',
      description: 'Building robust solutions for market transparency',
      icon: 'code-slash',
      color: '#10B981',
    },
    {
      name: 'Market Analysts',
      role: 'Data & Research',
      description: 'Ensuring accurate and real-time market data',
      icon: 'analytics',
      color: '#F59E0B',
    },
  ];

  const features = [
    {
      icon: 'trending-up',
      title: 'Real-time Pricing',
      description: 'Live market rates from verified sources',
      color: '#3B82F6',
    },
    {
      icon: 'location',
      title: 'Multiple Markets',
      description: 'Coverage across Karnataka trading centers',
      color: '#10B981',
    },
    {
      icon: 'language',
      title: 'Multi-language',
      description: 'Available in English and Kannada',
      color: '#8B5CF6',
    },
    {
      icon: 'shield-checkmark',
      title: 'Verified Data',
      description: 'Authenticated market information',
      color: '#F59E0B',
    },
  ];

  const handleContactPress = (type: 'email' | 'github') => {
    switch (type) {
      case 'email':
        Linking.openURL('mailto:mithungowda.b7411@gmail.com');
        break;
      case 'github':
        Linking.openURL('https://github.com/mithun50');
        break;
    }
  };

  const FeatureCard = ({ feature }: { feature: any }) => (
    <View style={styles.featureCard}>
      <View style={[styles.featureIcon, { backgroundColor: `${feature.color}15` }]}>
        <Ionicons name={feature.icon as any} size={24} color={feature.color} />
      </View>
      <Text style={styles.featureTitle}>{feature.title}</Text>
      <Text style={styles.featureDescription}>{feature.description}</Text>
    </View>
  );

  const TeamCard = ({ member }: { member: any }) => (
    <View style={styles.teamCard}>
      <View style={[styles.teamIcon, { backgroundColor: `${member.color}15` }]}>
        <Ionicons name={member.icon as any} size={32} color={member.color} />
      </View>
      <View style={styles.teamInfo}>
        <Text style={styles.teamName}>{member.name}</Text>
        <Text style={styles.teamRole}>{member.role}</Text>
        <Text style={styles.teamDescription}>{member.description}</Text>
      </View>
    </View>
  );

  const ContactCard = ({ icon, title, subtitle, onPress, color }: {
    icon: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    color: string;
  }) => (
    <TouchableOpacity style={styles.contactCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.contactIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactTitle}>{title}</Text>
        <Text style={styles.contactSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('aboutReshmeInfo')} subtitle={t('tagline')} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Mission Section */}
        <View style={styles.missionSection}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/reshme-logo.png')}
              style={styles.largeLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.missionTitle}>{t('ourMission')}</Text>
          <Text style={styles.missionText}>
            {t('missionMessage')}
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>{t('whyChoose')}</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={{...feature, title: t(feature.title), description: t(feature.description)}} />
            ))}
          </View>
        </View>

        {/* Team Section */}
        <View style={styles.teamSection}>
          <Text style={styles.sectionTitle}>{t('ourTeam')}</Text>
          <Text style={styles.sectionSubtitle}>
            {t('teamMessage')}
          </Text>
          {teamMembers.map((member, index) => (
            <TeamCard key={index} member={{...member, role: t(member.role), description: t(member.description)}} />
          ))}
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>{t('getInTouch')}</Text>
          <Text style={styles.sectionSubtitle}>
            {t('getInTouchMessage')}
          </Text>

          <ContactCard
            icon="mail"
            title={t('emailUs')}
            subtitle="mithungowda.b7411@gmail.com"
            onPress={() => handleContactPress('email')}
            color="#3B82F6"
          />

          <ContactCard
            icon="logo-github"
            title={t('github')}
            subtitle="github.com/mithun50"
            onPress={() => handleContactPress('github')}
            color="#10B981"
          />
        </View>

        {/* App Info */}
        <View style={styles.appInfoSection}>
          <View style={styles.appInfoCard}>
            <Text style={styles.appInfoTitle}>{t('appInformation')}</Text>
            <View style={styles.appInfoRow}>
              <Text style={styles.appInfoLabel}>{t('version')}</Text>
              <Text style={styles.appInfoValue}>1.0.0</Text>
            </View>
            <View style={styles.appInfoRow}>
              <Text style={styles.appInfoLabel}>{t('lastUpdated')}</Text>
              <Text style={styles.appInfoValue}>January 2025</Text>
            </View>
            <View style={styles.appInfoRow}>
              <Text style={styles.appInfoLabel}>{t('platform')}</Text>
              <Text style={styles.appInfoValue}>iOS, Android, Web</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('copyright')}
          </Text>
          <Text style={styles.footerSubtext}>
            {t('madeWithLove')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Mission Section
  missionSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  largeLogo: {
    width: 100,
    height: 100,
  },
  missionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  missionText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Features Section
  featuresSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Team Section
  teamSection: {
    marginBottom: 32,
  },
  teamCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teamIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  teamRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 8,
  },
  teamDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // Contact Section
  contactSection: {
    marginBottom: 32,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },

  // App Info Section
  appInfoSection: {
    marginBottom: 32,
  },
  appInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
  },
  appInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  appInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  appInfoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});