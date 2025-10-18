import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  Easing,
  ScrollView,
  Image,
  Platform,
  SafeAreaView,
} from 'react-native';
import { collection, getDocs, orderBy, query, where, Timestamp } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import NetInfo from '@react-native-community/netinfo';
import { db, COLLECTIONS } from '../firebase.config';
import { CocoonPrice } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { saveToCache, loadFromCache, getCacheAge, CACHE_KEYS, CachedData } from '../utils/cacheUtils';
import AdBanner from '../components/AdBanner';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const [prices, setPrices] = useState<CocoonPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<CocoonPrice[]>([]);
  const [selectedBreed, setSelectedBreed] = useState<string>('all');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<string>('');

  const animatedValues = useRef<Animated.Value[]>([]).current;
  const slideAnimation = useRef(new Animated.Value(0)).current;

  const breeds = ['all', 'CB', 'BV'];
  const markets = ['all', 'Ramanagara', 'Kollegala', 'Kanakapura', 'Siddalagatta', 'Kolar'];

  const fetchPrices = async (dateFilter?: Date) => {
    try {
      // Check internet connectivity first
      const netState = await NetInfo.fetch();

      if (!netState.isConnected) {
        // Load from cache when offline
        const cachedData = await loadFromCache(CACHE_KEYS.HOME_PRICES);

        if (cachedData && cachedData.data.length > 0) {
          setPrices(cachedData.data);
          setIsOffline(true);
          setCacheTimestamp(getCacheAge(cachedData));
        } else {
          // No cache available
          Alert.alert(t('noInternet'), t('noInternetMessage'));
        }

        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Online - fetch from Firebase
      setIsOffline(false);

      let q;

      if (dateFilter) {
        const startOfDay = new Date(dateFilter);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(dateFilter);
        endOfDay.setHours(23, 59, 59, 999);

        q = query(
          collection(db, COLLECTIONS.COCOON_PRICES),
          where('lastUpdated', '>=', Timestamp.fromDate(startOfDay)),
          where('lastUpdated', '<=', Timestamp.fromDate(endOfDay)),
          orderBy('lastUpdated', 'desc')
        );
      } else {
        q = query(collection(db, COLLECTIONS.COCOON_PRICES), orderBy('lastUpdated', 'desc'));
      }

      const querySnapshot = await getDocs(q);
      const pricesData: CocoonPrice[] = [];
      const now = new Date();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const expiresAt = data.expiresAt ? data.expiresAt.toDate() : null;

        // Only add non-expired data
        if (!expiresAt || expiresAt > now) {
          pricesData.push({
            id: doc.id,
            ...data,
            lastUpdated: data.lastUpdated.toDate(),
            expiresAt: expiresAt,
          } as CocoonPrice);
        }
      });

      setPrices(pricesData);

      // Save to cache
      await saveToCache(CACHE_KEYS.HOME_PRICES, pricesData);
      setCacheTimestamp('');

      if (dateFilter) {
        const dateExists = pricesData.length > 0;
        if (!dateExists) {
          Alert.alert(t('noData'), t('noDataMessage'));
        }
      }
    } catch (error) {
      // Check if error is due to network issues
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        // Try cache on error
        const cachedData = await loadFromCache(CACHE_KEYS.HOME_PRICES);
        if (cachedData && cachedData.data.length > 0) {
          setPrices(cachedData.data);
          setIsOffline(true);
          setCacheTimestamp(getCacheAge(cachedData));
        } else {
          Alert.alert(t('noInternet'), t('noInternetMessage'));
        }
      } else {
        Alert.alert(t('error'), t('failedToFetch'));
      }
      console.error('Error fetching prices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPrices(selectedDate); // Fetch today's data on initial load
    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 1000,
      delay: 400,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();

  }, []);

  const animateCards = (itemsToAnimate: CocoonPrice[]) => {
    animatedValues.length = 0;
    itemsToAnimate.forEach(() => {
      animatedValues.push(new Animated.Value(0));
    });

    const animations = itemsToAnimate.map((_, i) => {
      return Animated.timing(animatedValues[i], {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
        delay: i * 120,
      });
    });
    Animated.stagger(80, animations).start();
  };

  useEffect(() => {
    let filtered = prices;

    if (selectedBreed !== 'all') {
      filtered = filtered.filter((price) => price.breed === selectedBreed);
    }

    if (selectedMarket !== 'all') {
      filtered = filtered.filter((price) => price.market === selectedMarket);
    }

    // Sort alphabetically by market (A-Z)
    filtered = filtered.sort((a, b) => a.market.localeCompare(b.market));

    setFilteredPrices(filtered);
    animateCards(filtered);
  }, [selectedBreed, selectedMarket, prices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPrices(selectedDate); // Refresh today's data
  };

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
      fetchPrices(date);
    }
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  const resetDateFilter = () => {
    const today = new Date();
    setSelectedDate(today); // Reset to today
    fetchPrices(today); // Fetch today's data
  };

  const formatDateForDisplay = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('yesterday');
    } else {
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  };

  const ModernFilterButton = ({
    title,
    isSelected,
    onPress,
    icon,
  }: {
    title: string;
    isSelected: boolean;
    onPress: () => void;
    icon?: string;
  }) => (
    <TouchableOpacity
      style={[styles.ultraModernFilter, isSelected && styles.ultraModernFilterSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {isSelected ? (
        <View style={styles.ultraModernFilterGradient}>
          {icon && <Ionicons name={icon as any} size={14} color="#FFFFFF" style={{ marginRight: 6 }} />}
          <Text style={styles.ultraModernFilterTextSelected}>{title}</Text>
        </View>
      ) : (
        <View style={styles.ultraModernFilterContent}>
          {icon && <Ionicons name={icon as any} size={14} color="#6B7280" style={{ marginRight: 6 }} />}
          <Text style={styles.ultraModernFilterText}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );


  const renderPriceCard = ({ item }: { item: CocoonPrice }) => {
    return (
      <View style={styles.ultraModernCard}>
        <View style={styles.ultraModernCardGradient}>
          <View style={styles.ultraModernCardContent}>
            {/* Header with breed and quality */}
            <View style={styles.ultraModernCardHeader}>
              <View style={styles.breedSection}>
                <View style={styles.breedIconContainer}>
                  <Ionicons name="leaf" size={18} color="#10B981" />
                </View>
                <View style={styles.breedInfo}>
                  <Text style={styles.ultraModernBreedText}>{t(`breed_${item.breed}` as any, item.breed)}</Text>
                  <View style={styles.qualityBadgeContainer}>
                    <View style={styles.ultraModernQualityBadge}>
                      <Ionicons name="star" size={10} color="#92400E" />
                      <Text style={styles.ultraModernQualityText}>
                        {t('grade')} {item.quality}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.marketBadgeContainer}>
                <View style={styles.ultraModernMarketBadge}>
                  <Ionicons name="location" size={10} color="#5B21B6" />
                  <Text style={styles.ultraModernMarketText}>{t(`market_${item.market}` as any, item.market)}</Text>
                </View>
                <View style={styles.lotNumberBadge}>
                  <Ionicons name="apps" size={10} color="#92400E" />
                  <Text style={styles.lotNumberText}>{t('lot')}: {item.lotNumber}</Text>
                </View>
              </View>
            </View>

            {/* Price Table */}
            <View style={styles.priceTable}>
              <Text style={styles.priceTableTitle}>{t('priceDetails')}</Text>

              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>{t('type')}</Text>
                <Text style={styles.tableHeaderText}>{t('price')}</Text>
                <Text style={styles.tableHeaderText}>{t('status')}</Text>
              </View>

              {/* Table Rows */}
              <View style={[styles.tableRow, styles.tableRowHighlight]}>
                <Text style={[styles.tableCellType, styles.tableCellHighlight]}>{t('maximum')}</Text>
                <Text style={[styles.tableCellPrice, styles.tableCellHighlight]}>₹{item.maxPrice}</Text>
                <View style={styles.tableStatusCell}>
                  <Ionicons name="trending-up" size={14} color="#10B981" />
                  <Text style={[styles.tableCellStatus, { color: '#10B981' }]}>{t('high')}</Text>
                </View>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableCellType}>{t('average')}</Text>
                <Text style={styles.tableCellPrice}>₹{item.avgPrice}</Text>
                <View style={styles.tableStatusCell}>
                  <Ionicons name="analytics" size={14} color="#6366F1" />
                  <Text style={[styles.tableCellStatus, { color: '#6366F1' }]}>{t('avg')}</Text>
                </View>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableCellType}>{t('minimum')}</Text>
                <Text style={styles.tableCellPrice}>₹{item.minPrice}</Text>
                <View style={styles.tableStatusCell}>
                  <Ionicons name="trending-down" size={14} color="#EF4444" />
                  <Text style={[styles.tableCellStatus, { color: '#EF4444' }]}>{t('low')}</Text>
                </View>
              </View>
            </View>

            {/* Footer with update time */}
            <View style={styles.ultraModernFooter}>
              <View style={styles.updateTimestamp}>
                <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                <Text style={styles.ultraModernUpdateText}>
                  {t('updated')}: {item.lastUpdated.toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.ultraModernContainer}>
        <View style={styles.ultraModernLoadingContainer}>
          <View style={styles.loadingContent}>
            <View style={styles.loadingSpinner}>
              <View style={styles.loadingSpinnerGradient}>
                <Image
                  source={require('../assets/reshme_logo.png')}
                  style={styles.loadingLogoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.ultraModernLoadingText}>{t('loading')}</Text>
            <Text style={styles.ultraModernLoadingSubtext}>{t('fetchingLatestMarketPrices')}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.ultraModernContainer}>
      <Header
        title={t('cocoonPrices')}
        rightComponent={<LanguageSwitcher />}
      />
      {/* Offline Mode Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <View style={styles.offlineBannerContent}>
            <Ionicons name="cloud-offline" size={18} color="#F59E0B" />
            <View style={styles.offlineBannerText}>
              <Text style={styles.offlineBannerTitle}>{t('offlineMode')}</Text>
              <Text style={styles.offlineBannerSubtitle}>
                {t('dataFromCache')} • {t('lastUpdated')}: {cacheTimestamp}
              </Text>
            </View>
          </View>
        </View>
      )}
      {/* Filter section */}
      <View style={styles.filterHeader}>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setIsFilterVisible(!isFilterVisible)}
        >
          <Ionicons
            name={isFilterVisible ? 'chevron-up-circle' : 'chevron-down-circle'}
            size={24}
            color="#3B82F6"
          />
          <Text style={styles.toggleButtonText}>
            {isFilterVisible ? t('hideFilters') : t('showFilters')}
          </Text>
        </TouchableOpacity>
      </View>
      {isFilterVisible && (
        <View style={styles.ultraModernFilterSection}>
          <View style={styles.ultraModernFilterCard}>
            <View style={styles.filterContent}>
              <View style={styles.filterCategory}>
              <View style={styles.filterCategoryHeader}>
                <View style={styles.filterCategoryIcon}>
                  <Ionicons name="options" size={14} color="#6B7280" />
                </View>
                <Text style={styles.ultraModernFilterTitle}>{t('filterByBreed')}</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.ultraModernFilterList}
              >
                {breeds.map((item) => (
                  <ModernFilterButton
                    key={item}
                    title={t(`breed_${item}`)}
                    isSelected={selectedBreed === item}
                    onPress={() => setSelectedBreed(item)}
                    icon={item === 'all' ? 'grid' : 'leaf'}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterCategory}>
              <View style={styles.filterCategoryHeader}>
                <View style={styles.filterCategoryIcon}>
                  <Ionicons name="location" size={14} color="#6B7280" />
                </View>
                <Text style={styles.ultraModernFilterTitle}>{t('filterByMarket')}</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.ultraModernFilterList}
              >
                {markets.map((item) => (
                  <ModernFilterButton
                    key={item}
                    title={t(`market_${item}`)}
                    isSelected={selectedMarket === item}
                    onPress={() => setSelectedMarket(item)}
                    icon={item === 'all' ? 'grid' : 'location'}
                  />
                ))}
              </ScrollView>
            </View>

              <View style={styles.filterCategory}>
                <View style={styles.filterCategoryHeader}>
                  <View style={styles.filterCategoryIcon}>
                    <Ionicons name="calendar" size={14} color="#6B7280" />
                  </View>
                  <Text style={styles.ultraModernFilterTitle}>{t('filterByDateTitle')}</Text>
                </View>
                <View style={styles.dateFilterContainer}>
                  <TouchableOpacity
                    style={styles.dateFilterButton}
                    onPress={showDatePickerModal}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dateFilterContent}>
                      <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
                      <Text style={styles.dateFilterText}>
                        {formatDateForDisplay(selectedDate)}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resetDateButton}
                    onPress={resetDateFilter}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh" size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Price list */}
      <FlatList
        data={filteredPrices}
        keyExtractor={(item) => item.id}
        renderItem={renderPriceCard}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
            progressBackgroundColor="#FFFFFF"
          />
        }
        contentContainerStyle={styles.ultraModernListContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)} // 7 days ago
        />
      )}

      {/* AdMob Banner Ad */}
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ultraModernContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Loading Screen
  ultraModernLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  loadingContent: {
    alignItems: 'center',
    marginTop: 40,
  },
  loadingSpinner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
  },
  loadingSpinnerGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  loadingLogoImage: {
    width: 50,
    height: 50,
  },
  ultraModernLoadingText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  ultraModernLoadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },


  // Filter Section
  filterHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 8,
  },
  ultraModernFilterSection: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
  },
  ultraModernFilterCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterContent: {
    gap: 16,
  },
  filterCategory: {
    gap: 12,
  },
  filterCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterCategoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  ultraModernFilterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  ultraModernFilterList: {
    paddingVertical: 8,
    gap: 12,
  },

  // Filter Buttons
  ultraModernFilter: {
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 8,
  },
  ultraModernFilterSelected: {
  },
  ultraModernFilterGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
  },
  ultraModernFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
  ultraModernFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  ultraModernFilterTextSelected: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },

  // Price Cards
  ultraModernCard: {
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ultraModernCardGradient: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  ultraModernCardContent: {
    padding: 20,
    gap: 16,
  },

  // Card Header
  ultraModernCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  breedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breedIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
  },
  breedInfo: {
    marginLeft: 16,
    flex: 1,
  },
  ultraModernBreedText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  qualityBadgeContainer: {
    alignSelf: 'flex-start',
  },
  ultraModernQualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    backgroundColor: '#FEF3C7',
  },
  ultraModernQualityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  marketBadgeContainer: {
    alignSelf: 'flex-start',
  },
  ultraModernMarketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    backgroundColor: '#EDE9FE',
  },
  ultraModernMarketText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B21B6',
  },
  lotNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    backgroundColor: '#FEF3C7',
    marginTop: 8,
  },
  lotNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },

  // Price Table
  priceTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  priceTableTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  tableRowHighlight: {
    backgroundColor: '#F0FDF4',
  },
  tableCellType: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'left',
  },
  tableCellPrice: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  tableStatusCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tableCellStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  tableCellHighlight: {
    color: '#166534',
    fontWeight: '800',
  },

  // Footer
  ultraModernFooter: {
    alignItems: 'flex-end',
  },
  updateTimestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ultraModernUpdateText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
  },

  // List Container
  ultraModernListContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },

  // Date Filter Styles
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  dateFilterButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dateFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  resetDateButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Offline Banner Styles
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  offlineBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offlineBannerText: {
    flex: 1,
  },
  offlineBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  offlineBannerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#B45309',
  },
});