import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { adminAuth } from '../utils/adminAuth';
import { AdminUser } from '../types';
import Header from '../components/Header';

const { width, height } = Dimensions.get('window');

interface AdminLoginScreenProps {
  onLoginSuccess: (user: AdminUser) => void;
  onCancel: () => void;
}

export default function AdminLoginScreen({ onLoginSuccess, onCancel }: AdminLoginScreenProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isDefaultPassword, setIsDefaultPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successUser, setSuccessUser] = useState<AdminUser | null>(null);
  const successTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Check if already authenticated
  useEffect(() => {
    checkExistingSession();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const checkExistingSession = async () => {
    try {
      const { authenticated, user } = await adminAuth.isAuthenticated();
      if (authenticated && user) {
        onLoginSuccess(user);
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    if (attempts >= 3) {
      Alert.alert(
        'Too Many Attempts',
        'Too many failed login attempts. Please wait 5 minutes before trying again.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);

    try {
      const result = await adminAuth.authenticate(username.trim(), password);

      if (result.success && result.user) {
        // Check for default password usage in dev mode
        const insecurePasswords = [
          'ReshmeSuper@2025!',
          'Reshme@2025!Rama',
          'Reshme@2025!Koll',
          'Reshme@2025!Kana',
          'Reshme@2025!Sidd',
        ];
        if (__DEV__ && insecurePasswords.includes(password)) {
          setIsDefaultPassword(true);
        } else {
          setIsDefaultPassword(false);
        }

        // Show custom success modal
        setSuccessUser(result.user);
        setShowSuccessModal(true);
        setAttempts(0);

        // Auto-proceed after 3 seconds with cleanup
        successTimerRef.current = setTimeout(() => {
          setShowSuccessModal(false);
          onLoginSuccess(result.user!);
        }, 3000);
      } else {
        setAttempts(prev => prev + 1);
        Alert.alert(
          'Login Failed',
          result.message,
          [{ text: 'Try Again' }]
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Login failed due to system error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Password Recovery',
      'Please contact your system administrator for password recovery.\n\nSupport: nxgextra@gmail.com',
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header
        title="Admin Login"
        subtitle={undefined}
        leftComponent={
          <TouchableOpacity style={styles.backButton} onPress={onCancel}>
            <Ionicons name="arrow-back" size={24} color="#6B7280" />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="shield-checkmark" size={60} color="#3B82F6" />
          </View>
          <Text style={styles.logoTitle}>Reshme Info</Text>
          <Text style={styles.logoSubtitle}>Administrative Portal</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Secure Access</Text>
          <Text style={styles.formSubtitle}>
            Enter your administrator credentials to continue
          </Text>

          {/* Username Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#6B7280" />
              <TextInput
                style={styles.textInput}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Attempt Warning */}
          {attempts > 0 && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning-outline" size={16} color="#F59E0B" />
              <Text style={styles.warningText}>
                {attempts}/3 failed attempts. {3 - attempts} attempts remaining.
              </Text>
            </View>
          )}

          {/* Default Password Warning */}
          {isDefaultPassword && (
            <View style={styles.defaultPasswordWarningContainer}>
              <Ionicons name="shield-half-outline" size={20} color="#B45309" />
              <View style={{ flex: 1 }}>
                <Text style={styles.defaultPasswordWarningTitle}>Security Warning</Text>
                <Text style={styles.defaultPasswordWarningText}>
                  You are using a default password. Please change it in your .env file for better security.
                </Text>
              </View>
            </View>
          )}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading || attempts >= 3}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
                <Text style={styles.loginButtonText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotButtonText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
          <Text style={styles.securityText}>
            This is a secure administrative area. All activities are logged and monitored.
          </Text>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <View style={styles.successIconOuter}>
                <View style={styles.successIconInner}>
                  <Ionicons name="checkmark" size={48} color="#FFFFFF" />
                </View>
              </View>
            </View>

            {/* Success Message */}
            <Text style={styles.successTitle}>Authentication Successful!</Text>
            <Text style={styles.successSubtitle}>Welcome back, {successUser?.username}</Text>

            {/* User Info Cards */}
            <View style={styles.successInfoContainer}>
              <View style={styles.successInfoCard}>
                <View style={styles.successInfoIconContainer}>
                  <Ionicons name="person" size={20} color="#3B82F6" />
                </View>
                <View style={styles.successInfoText}>
                  <Text style={styles.successInfoLabel}>Role</Text>
                  <Text style={styles.successInfoValue}>
                    {successUser?.role === 'super_admin' ? 'Super Admin' : 'Market Admin'}
                  </Text>
                </View>
              </View>

              <View style={styles.successInfoCard}>
                <View style={styles.successInfoIconContainer}>
                  <Ionicons name="location" size={20} color="#10B981" />
                </View>
                <View style={styles.successInfoText}>
                  <Text style={styles.successInfoLabel}>Market Access</Text>
                  <Text style={styles.successInfoValue}>{successUser?.market}</Text>
                </View>
              </View>

              <View style={styles.successInfoCard}>
                <View style={styles.successInfoIconContainer}>
                  <Ionicons name="time" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.successInfoText}>
                  <Text style={styles.successInfoLabel}>Session Duration</Text>
                  <Text style={styles.successInfoValue}>7 Days</Text>
                </View>
              </View>
            </View>

            {/* Auto-redirect message */}
            <View style={styles.successFooter}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.successFooterText}>Redirecting to dashboard...</Text>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },

  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },

  // Logo Section
  logoSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  logoSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Form
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },

  // Input Fields
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },

  // Warning
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },

  // Default Password Warning
  defaultPasswordWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  defaultPasswordWarningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  defaultPasswordWarningText: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },

  // Buttons
  loginButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  forgotButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },

  // Security Notice
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
  },

  // Success Modal
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  successInfoContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  successInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  successInfoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successInfoText: {
    flex: 1,
  },
  successInfoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  successInfoValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  successFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    width: '100%',
    justifyContent: 'center',
  },
  successFooterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});