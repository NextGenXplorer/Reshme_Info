import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase.config';
import { AdminUser, PriceFormData } from '../types';
import {
  extractMarketDataWithAI,
  ExtractedMarketData,
  validateExtractedData,
  getProviderCount,
  getRateLimitStatus,
  AIProvider
} from '../utils/aiExtraction';
import { adminAuth } from '../utils/adminAuth';
import Header from '../components/Header';

interface AdminAIExtractScreenProps {
  user: AdminUser;
  onBack: () => void;
}

export default function AdminAIExtractScreen({ user, onBack }: AdminAIExtractScreenProps) {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedMarketData | null>(null);
  const [priceEntries, setPriceEntries] = useState<PriceFormData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [usedProvider, setUsedProvider] = useState<AIProvider | null>(null);
  const [triedProviders, setTriedProviders] = useState<AIProvider[]>([]);
  const [providerStatus, setProviderStatus] = useState<{ total: number; available: number }>({ total: 0, available: 0 });

  // Update provider status on mount and after extraction
  React.useEffect(() => {
    updateProviderStatus();
  }, []);

  const updateProviderStatus = () => {
    setProviderStatus(getProviderCount());
  };

  const handleExtract = async () => {
    if (!inputText.trim()) {
      Alert.alert('Error', 'Please paste market data text');
      return;
    }

    setLoading(true);
    setUsedProvider(null);
    setTriedProviders([]);

    try {
      const result = await extractMarketDataWithAI(inputText);

      // Update provider info
      if (result.provider) setUsedProvider(result.provider);
      if (result.triedProviders) setTriedProviders(result.triedProviders);
      updateProviderStatus();

      if (!result.success) {
        const errorMsg = result.isRateLimited
          ? `${result.error}\n\nTried providers: ${result.triedProviders?.join(', ') || 'none'}`
          : result.error || 'Failed to extract data';
        Alert.alert('Extraction Failed', errorMsg);
        return;
      }

      if (!result.data || !result.priceEntries) {
        Alert.alert('No Data', 'Could not extract any valid data from the text');
        return;
      }

      // Validate extracted data
      const validation = validateExtractedData(result.data);
      if (!validation.valid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }

      setExtractedData(result.data);
      setPriceEntries(result.priceEntries);
      setShowPreview(true);
    } catch (error) {
      console.error('Extract error:', error);
      Alert.alert('Error', 'An unexpected error occurred during extraction');
    } finally {
      setLoading(false);
    }
  };

  const sendPushNotifications = async (priceData: any) => {
    try {
      // Get backend server URL from environment or use default
      const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

      // Send notification request to backend server
      const response = await fetch(`${BACKEND_URL}/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceData }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Notifications sent successfully');
        console.log(`📨 FCM: ${result.fcmSent || 0}, Expo: ${result.expoSent || 0}, Total: ${result.totalSent || 0}`);
        if (result.totalFailed > 0) {
          console.log(`❌ Failed: ${result.totalFailed}`);
        }
        if (result.invalidTokensRemoved > 0) {
          console.log(`🗑️ Removed ${result.invalidTokensRemoved} invalid tokens`);
        }
      } else {
        console.error('❌ Notification error:', result.error);
      }
    } catch (error) {
      console.error('Error sending push notifications:', error);
      // Don't throw error - allow price save to complete even if notifications fail
    }
  };

  const handleSaveAll = async () => {
    if (!extractedData || priceEntries.length === 0) {
      Alert.alert('Error', 'No data to save');
      return;
    }

    // Check permissions for the extracted market
    if (!adminAuth.hasMarketPermission(user, extractedData.market)) {
      Alert.alert(
        'Permission Denied',
        `You do not have permission to update prices for ${extractedData.market} market`
      );
      return;
    }

    Alert.alert(
      'Save Extracted Data',
      `This will add ${priceEntries.length} price ${priceEntries.length === 1 ? 'entry' : 'entries'} to the database. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save All',
          onPress: async () => {
            setLoading(true);
            try {
              const now = Timestamp.now();
              const sevenDaysFromNow = Timestamp.fromDate(
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              );

              let successCount = 0;
              let failCount = 0;

              for (const entry of priceEntries) {
                try {
                  const priceData = {
                    ...entry,
                    source: user.username,
                    verified: true,
                    lastUpdated: now,
                    expiresAt: sevenDaysFromNow,
                  };

                  await addDoc(collection(db, COLLECTIONS.COCOON_PRICES), priceData);

                  // Send push notification for this price entry
                  await sendPushNotifications(priceData);

                  successCount++;
                } catch (error) {
                  console.error('Error saving entry:', error);
                  failCount++;
                }
              }

              if (successCount > 0) {
                Alert.alert(
                  'Success',
                  `Successfully added ${successCount} price ${successCount === 1 ? 'entry' : 'entries'}${
                    failCount > 0 ? `. ${failCount} failed.` : ''
                  }`
                );

                // Reset form
                setInputText('');
                setExtractedData(null);
                setPriceEntries([]);
                setShowPreview(false);
              } else {
                Alert.alert('Error', 'Failed to save any entries');
              }
            } catch (error) {
              console.error('Save error:', error);
              Alert.alert('Error', 'Failed to save price entries');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const updatePriceEntry = (index: number, field: keyof PriceFormData, value: any) => {
    const updated = [...priceEntries];
    updated[index] = { ...updated[index], [field]: value };
    setPriceEntries(updated);
  };

  const removePriceEntry = (index: number) => {
    const updated = priceEntries.filter((_, i) => i !== index);
    setPriceEntries(updated);
  };

  const renderPriceEntry = (entry: PriceFormData, index: number) => {
    const isEditing = editingIndex === index;
    const markets = ['Ramanagara', 'Kollegala', 'Kanakapura', 'Siddalagatta', 'Kolar'];

    return (
      <View key={index} style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View style={styles.entryInfo}>
            <View style={[styles.breedBadge, {
              backgroundColor: entry.breed === 'CB' ? '#3B82F615' : '#10B98115'
            }]}>
              <Text style={[styles.breedText, {
                color: entry.breed === 'CB' ? '#3B82F6' : '#10B981'
              }]}>
                {entry.breed}
              </Text>
            </View>
            <View style={[styles.qualityBadge]}>
              <Text style={styles.qualityText}>Grade {entry.quality}</Text>
            </View>
          </View>
          <View style={styles.entryActions}>
            <TouchableOpacity
              onPress={() => setEditingIndex(isEditing ? null : index)}
              style={styles.editIconButton}
            >
              <Ionicons
                name={isEditing ? "checkmark-circle" : "create"}
                size={24}
                color={isEditing ? "#10B981" : "#3B82F6"}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removePriceEntry(index)}>
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {isEditing ? (
          // Edit Mode
          <View style={styles.editForm}>
            {/* Market Selection */}
            <View style={styles.editField}>
              <Text style={styles.editFieldLabel}>Market:</Text>
              <View style={styles.marketChips}>
                {markets.map(market => (
                  <TouchableOpacity
                    key={market}
                    style={[
                      styles.marketChip,
                      entry.market === market && styles.marketChipActive
                    ]}
                    onPress={() => updatePriceEntry(index, 'market', market)}
                  >
                    <Text style={[
                      styles.marketChipText,
                      entry.market === market && styles.marketChipTextActive
                    ]}>
                      {market}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Breed Selection */}
            <View style={styles.editField}>
              <Text style={styles.editFieldLabel}>Breed:</Text>
              <View style={styles.breedChips}>
                {['CB', 'BV'].map(breed => (
                  <TouchableOpacity
                    key={breed}
                    style={[
                      styles.breedChip,
                      entry.breed === breed && styles.breedChipActive
                    ]}
                    onPress={() => updatePriceEntry(index, 'breed', breed)}
                  >
                    <Text style={[
                      styles.breedChipText,
                      entry.breed === breed && styles.breedChipTextActive
                    ]}>
                      {breed}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quality Selection */}
            <View style={styles.editField}>
              <Text style={styles.editFieldLabel}>Quality Grade:</Text>
              <View style={styles.qualityChips}>
                {(['A', 'B', 'C'] as const).map(quality => (
                  <TouchableOpacity
                    key={quality}
                    style={[
                      styles.qualityChip,
                      entry.quality === quality && styles.qualityChipActive
                    ]}
                    onPress={() => updatePriceEntry(index, 'quality', quality)}
                  >
                    <Text style={[
                      styles.qualityChipText,
                      entry.quality === quality && styles.qualityChipTextActive
                    ]}>
                      Grade {quality}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Lot Number */}
            <View style={styles.editField}>
              <Text style={styles.editFieldLabel}>Lot Number:</Text>
              <TextInput
                style={styles.editInput}
                value={String(entry.lotNumber || '')}
                onChangeText={(text) => updatePriceEntry(index, 'lotNumber', Number(text) || 0)}
                placeholder="Enter lot number"
                keyboardType="numeric"
              />
            </View>

            {/* Price Inputs */}
            <View style={styles.priceInputsRow}>
              <View style={styles.priceInputField}>
                <Text style={styles.editFieldLabel}>Max (₹/kg):</Text>
                <TextInput
                  style={styles.priceInput}
                  value={String(entry.maxPrice || '')}
                  onChangeText={(text) => updatePriceEntry(index, 'maxPrice', Number(text) || 0)}
                  placeholder="Max"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.priceInputField}>
                <Text style={styles.editFieldLabel}>Avg (₹/kg):</Text>
                <TextInput
                  style={styles.priceInput}
                  value={String(entry.avgPrice || '')}
                  onChangeText={(text) => {
                    const val = Number(text) || 0;
                    updatePriceEntry(index, 'avgPrice', val);
                    updatePriceEntry(index, 'pricePerKg', val);
                  }}
                  placeholder="Avg"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.priceInputField}>
                <Text style={styles.editFieldLabel}>Min (₹/kg):</Text>
                <TextInput
                  style={styles.priceInput}
                  value={String(entry.minPrice || '')}
                  onChangeText={(text) => updatePriceEntry(index, 'minPrice', Number(text) || 0)}
                  placeholder="Min"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        ) : (
          // View Mode
          <View style={styles.entryDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Market:</Text>
              <Text style={styles.detailValue}>{entry.market}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Lots:</Text>
              <Text style={styles.detailValue}>{entry.lotNumber}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Maximum Price:</Text>
              <Text style={styles.detailValue}>₹{entry.maxPrice}/kg</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Average Price:</Text>
              <Text style={[styles.detailValue, styles.priceHighlight]}>₹{entry.avgPrice}/kg</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Minimum Price:</Text>
              <Text style={styles.detailValue}>₹{entry.minPrice}/kg</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header
        title="AI Data Extract"
        subtitle={undefined}
        leftComponent={
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#6B7280" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          {/* Instructions */}
          <View style={styles.instructionCard}>
            <View style={styles.instructionHeader}>
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <Text style={styles.instructionTitle}>How to Use</Text>
            </View>
            <Text style={styles.instructionText}>
              1. Copy market transaction data (Kannada or English){'\n'}
              2. Paste it in the text area below{'\n'}
              3. Click "Extract Data" to let AI analyze it{'\n'}
              4. Review and adjust the extracted data{'\n'}
              5. Click "Save All" to update the database
            </Text>
          </View>

          {/* AI Provider Status */}
          <View style={styles.providerStatusCard}>
            <View style={styles.providerStatusHeader}>
              <Ionicons name="hardware-chip" size={20} color="#8B5CF6" />
              <Text style={styles.providerStatusTitle}>AI Providers</Text>
              <View style={[
                styles.providerCountBadge,
                { backgroundColor: providerStatus.available > 0 ? '#10B98120' : '#EF444420' }
              ]}>
                <Text style={[
                  styles.providerCountText,
                  { color: providerStatus.available > 0 ? '#10B981' : '#EF4444' }
                ]}>
                  {providerStatus.available}/{providerStatus.total} available
                </Text>
              </View>
            </View>
            <View style={styles.providerList}>
              {['gemini', 'groq', 'openrouter'].map((provider) => {
                const status = getRateLimitStatus().find(s => s.provider === provider);
                const isConfigured = providerStatus.total > 0 && status !== undefined;
                const isLimited = status?.isLimited || false;
                const isUsed = usedProvider === provider;

                return (
                  <View key={provider} style={[
                    styles.providerChip,
                    isUsed && styles.providerChipUsed,
                    isLimited && styles.providerChipLimited,
                    !isConfigured && styles.providerChipDisabled,
                  ]}>
                    <Ionicons
                      name={isUsed ? 'checkmark-circle' : isLimited ? 'time' : isConfigured ? 'ellipse' : 'ellipse-outline'}
                      size={14}
                      color={isUsed ? '#10B981' : isLimited ? '#F59E0B' : isConfigured ? '#6B7280' : '#D1D5DB'}
                    />
                    <Text style={[
                      styles.providerChipText,
                      isUsed && styles.providerChipTextUsed,
                      isLimited && styles.providerChipTextLimited,
                      !isConfigured && styles.providerChipTextDisabled,
                    ]}>
                      {provider === 'gemini' ? 'Gemini' : provider === 'groq' ? 'Groq' : 'OpenRouter'}
                      {isLimited && status?.remainingSeconds ? ` (${Math.ceil(status.remainingSeconds)}s)` : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
            {usedProvider && (
              <Text style={styles.usedProviderText}>
                Last extraction: {usedProvider === 'gemini' ? 'Gemini' : usedProvider === 'groq' ? 'Groq' : 'OpenRouter'}
                {triedProviders.length > 1 && ` (tried ${triedProviders.length} providers)`}
              </Text>
            )}
          </View>

          {/* Input Area */}
          {!showPreview ? (
            <>
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Market Data Text</Text>
                <TextInput
                  style={styles.textArea}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Paste market transaction data here (Kannada or English)..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={12}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.extractButton, loading && styles.extractButtonDisabled]}
                onPress={handleExtract}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                    <Text style={styles.extractButtonText}>Extract Data with AI</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Preview Section */}
              <View style={styles.previewSection}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle}>Extracted Data Preview</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowPreview(false);
                      setExtractedData(null);
                      setPriceEntries([]);
                    }}
                  >
                    <Text style={styles.editTextLink}>Edit Text</Text>
                  </TouchableOpacity>
                </View>

                {extractedData && (
                  <View style={styles.metadataCard}>
                    <View style={styles.metadataRow}>
                      <Ionicons name="location" size={18} color="#6B7280" />
                      <Text style={styles.metadataText}>{extractedData.market}</Text>
                    </View>
                    <View style={styles.metadataRow}>
                      <Ionicons name="calendar" size={18} color="#6B7280" />
                      <Text style={styles.metadataText}>{extractedData.date}</Text>
                    </View>
                  </View>
                )}

                <Text style={styles.entriesTitle}>
                  {priceEntries.length} Price {priceEntries.length === 1 ? 'Entry' : 'Entries'}
                </Text>

                {priceEntries.map((entry, index) => renderPriceEntry(entry, index))}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowPreview(false);
                    setExtractedData(null);
                    setPriceEntries([]);
                    setInputText('');
                  }}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                  onPress={handleSaveAll}
                  disabled={loading || priceEntries.length === 0}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>Save All ({priceEntries.length})</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },

  // Instructions
  instructionCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
  },
  instructionText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 22,
  },

  // Provider Status
  providerStatusCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  providerStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  providerStatusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6D28D9',
    flex: 1,
  },
  providerCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  providerCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  providerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  providerChipUsed: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  providerChipLimited: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  providerChipDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  providerChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  providerChipTextUsed: {
    color: '#059669',
    fontWeight: '600',
  },
  providerChipTextLimited: {
    color: '#D97706',
  },
  providerChipTextDisabled: {
    color: '#9CA3AF',
  },
  usedProviderText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 10,
    fontStyle: 'italic',
  },

  // Input
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#111827',
    minHeight: 200,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Extract Button
  extractButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  extractButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  extractButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Preview
  previewSection: {
    marginBottom: 24,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  editTextLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  metadataCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metadataText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  entriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },

  // Entry Cards
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryInfo: {
    flexDirection: 'row',
    gap: 8,
  },
  breedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  breedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  qualityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  entryDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  priceHighlight: {
    color: '#3B82F6',
    fontSize: 16,
  },

  // Quality Edit
  qualityEdit: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  qualityChips: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qualityChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  qualityChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  qualityChipTextActive: {
    color: '#FFFFFF',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Edit Mode Styles
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editIconButton: {
    padding: 4,
  },
  editForm: {
    gap: 16,
    marginTop: 12,
  },
  editField: {
    gap: 8,
  },
  editFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  editInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },

  // Market Chips
  marketChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  marketChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  marketChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  marketChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  marketChipTextActive: {
    color: '#FFFFFF',
  },

  // Breed Chips
  breedChips: {
    flexDirection: 'row',
    gap: 8,
  },
  breedChip: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  breedChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  breedChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  breedChipTextActive: {
    color: '#FFFFFF',
  },

  // Price Inputs
  priceInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priceInputField: {
    flex: 1,
    gap: 6,
  },
  priceInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    textAlign: 'center',
    fontWeight: '600',
  },
});
