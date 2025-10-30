import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Platform,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, orderBy, query, where, Timestamp } from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import Header from '../components/Header';
import { db, COLLECTIONS } from '../firebase.config';
import { CocoonPrice } from '../types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { saveToCache, loadFromCache, getCacheAge, CACHE_KEYS } from '../utils/cacheUtils';

const { width } = Dimensions.get('window');

interface FilterOptions {
  breed: 'All' | 'CB' | 'BV';
  market: string;
  dateRange: 'today' | 'yesterday' | 'week' | 'all';
  sortBy: 'market' | 'avgPrice' | 'maxPrice' | 'minPrice' | 'date';
  sortOrder: 'asc' | 'desc';
}

interface BreedPriceData {
  breed: string;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  count: number;
}

interface MarketSummary {
  market: string;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  lotNumbers: string[];
  breeds: string[];
  breedPrices: BreedPriceData[];
  lastUpdated: Date;
  totalListings: number;
  qualities: string[];
}

export default function MarketScreen() {
  const { t } = useTranslation();
  const [prices, setPrices] = useState<CocoonPrice[]>([]);
  const [marketSummaries, setMarketSummaries] = useState<MarketSummary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<MarketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'from' | 'to' | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<string>('');

  const [filters, setFilters] = useState<FilterOptions>({
    breed: 'All',
    market: 'All',
    dateRange: 'today',
    sortBy: 'market',
    sortOrder: 'asc',
  });

  const uniqueMarkets = ['All', ...Array.from(new Set(prices.map(p => p.market)))];

  useEffect(() => {
    fetchMarketData();
  }, []);

  useEffect(() => {
    generateMarketSummaries();
  }, [prices, filters.dateRange]);

  useEffect(() => {
    applyFilters();
  }, [filters, marketSummaries]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMarketData();
    setRefreshing(false);
  };

  const getDateRangeFilter = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filters.dateRange) {
      case 'today':
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        return { start: today, end: todayEnd };

      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return { start: yesterday, end: yesterdayEnd };

      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { start: weekAgo, end: now };

      case 'all':
      default:
        return null;
    }
  };

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      // Check internet connectivity first
      const netState = await NetInfo.fetch();

      if (!netState.isConnected) {
        // Load from cache when offline
        const cachedData = await loadFromCache(CACHE_KEYS.MARKET_PRICES);
        if (cachedData && cachedData.data.length > 0) {
          setPrices(cachedData.data);
          setIsOffline(true);
          setCacheTimestamp(getCacheAge(cachedData));
        } else {
          Alert.alert(t('noInternet'), t('noInternetMessage'));
        }
        setLoading(false);
        return;
      }

      setIsOffline(false);

      // Fetch all recent data (last 30 days for caching)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const q = query(
        collection(db, COLLECTIONS.COCOON_PRICES),
        where('lastUpdated', '>=', Timestamp.fromDate(thirtyDaysAgo)),
        orderBy('lastUpdated', 'desc')
      );

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
      await saveToCache(CACHE_KEYS.MARKET_PRICES, pricesData);
      setCacheTimestamp('');
    } catch (error) {
      // Check if error is due to network issues
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        const cachedData = await loadFromCache(CACHE_KEYS.MARKET_PRICES);
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
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMarketSummaries = () => {
    // Filter prices by date range first
    const dateFilter = getDateRangeFilter();
    let filteredPrices = prices;

    if (dateFilter) {
      filteredPrices = prices.filter(price => {
        const priceDate = price.lastUpdated;
        return priceDate >= dateFilter.start && priceDate <= dateFilter.end;
      });
    }

    const marketGroups: { [key: string]: CocoonPrice[] } = {};

    filteredPrices.forEach(price => {
      if (!marketGroups[price.market]) {
        marketGroups[price.market] = [];
      }
      marketGroups[price.market].push(price);
    });

    const summaries: MarketSummary[] = Object.keys(marketGroups).map(marketName => {
      const marketPrices = marketGroups[marketName];
      const avgPrices = marketPrices.map(p => p.avgPrice).filter(p => p != null);
      const maxPrices = marketPrices.map(p => p.maxPrice).filter(p => p != null);
      const minPrices = marketPrices.map(p => p.minPrice).filter(p => p != null);

      if (marketPrices.length === 0) {
        return null;
      }

      // Calculate breed-specific prices
      const breedGroups: { [key: string]: CocoonPrice[] } = {};
      marketPrices.forEach(price => {
        if (!breedGroups[price.breed]) {
          breedGroups[price.breed] = [];
        }
        breedGroups[price.breed].push(price);
      });

      const breedPrices: BreedPriceData[] = Object.keys(breedGroups).map(breed => {
        const breedPricesList = breedGroups[breed];
        const breedAvg = breedPricesList.map(p => p.avgPrice).filter(p => p != null);
        const breedMax = breedPricesList.map(p => p.maxPrice).filter(p => p != null);
        const breedMin = breedPricesList.map(p => p.minPrice).filter(p => p != null);

        return {
          breed,
          avgPrice: breedAvg.length > 0 ? Math.round(breedAvg.reduce((sum, p) => sum + p, 0) / breedAvg.length) : 0,
          maxPrice: breedMax.length > 0 ? Math.max(...breedMax) : 0,
          minPrice: breedMin.length > 0 ? Math.min(...breedMin) : 0,
          count: breedPricesList.length,
        };
      });

      return {
        market: marketName,
        avgPrice: avgPrices.length > 0 ? Math.round(avgPrices.reduce((sum, price) => sum + price, 0) / avgPrices.length) : 0,
        maxPrice: maxPrices.length > 0 ? Math.max(...maxPrices) : 0,
        minPrice: minPrices.length > 0 ? Math.min(...minPrices) : 0,
        lotNumbers: [...new Set(marketPrices.map(p => p.lotNumber?.toString() || ''))].filter(Boolean),
        breeds: [...new Set(marketPrices.map(p => p.breed))],
        breedPrices,
        qualities: [...new Set(marketPrices.map(p => p.quality))],
        lastUpdated: new Date(Math.max(...marketPrices.map(p => p.lastUpdated.getTime()))),
        totalListings: marketPrices.length,
      };
    });

    setMarketSummaries(summaries.filter(s => s !== null) as MarketSummary[]);
  };

  const applyFilters = () => {
    let filtered = [...marketSummaries];

    // Filter by breed
    if (filters.breed !== 'All') {
      filtered = filtered.filter(summary => summary.breeds.includes(filters.breed));
    }

    // Filter by market
    if (filters.market !== 'All') {
      filtered = filtered.filter(summary => summary.market === filters.market);
    }

    // Sort
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (filters.sortBy) {
        case 'market':
          compareValue = a.market.localeCompare(b.market);
          break;
        case 'avgPrice':
          compareValue = a.avgPrice - b.avgPrice;
          break;
        case 'maxPrice':
          compareValue = a.maxPrice - b.maxPrice;
          break;
        case 'minPrice':
          compareValue = a.minPrice - b.minPrice;
          break;
        case 'date':
          compareValue = a.lastUpdated.getTime() - b.lastUpdated.getTime();
          break;
      }

      return filters.sortOrder === 'asc' ? compareValue : -compareValue;
    });

    setFilteredSummaries(filtered);
  };

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      breed: 'All',
      market: 'All',
      dateRange: 'today',
      sortBy: 'market',
      sortOrder: 'asc',
    });
  };

  const getDateRangeLabel = () => {
    switch (filters.dateRange) {
      case 'today':
        return t('today');
      case 'yesterday':
        return t('yesterday');
      case 'week':
        return t('last7Days');
      case 'all':
        return t('allTime');
      default:
        return t('today');
    }
  };

  const FilterChip = ({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.filterChip, isActive && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderBreedPrice = (breedData: BreedPriceData) => (
    <View key={breedData.breed} style={styles.breedPriceRow}>
      <View style={[styles.breedPriceBadge, {
        backgroundColor: breedData.breed === 'CB' ? '#3B82F615' : '#10B98115'
      }]}>
        <Text style={[styles.breedPriceText, {
          color: breedData.breed === 'CB' ? '#3B82F6' : '#10B981'
        }]}>
          {t(`breed_${breedData.breed}` as any, breedData.breed)}
        </Text>
      </View>
      <View style={styles.breedPriceDetails}>
        <Text style={styles.breedPriceValue}>₹{breedData.avgPrice}</Text>
        <Text style={styles.breedPriceRange}>
          ₹{breedData.minPrice} - ₹{breedData.maxPrice}
        </Text>
      </View>
      <Text style={styles.breedCount}>{breedData.count} {t('listings')}</Text>
    </View>
  );

  const renderMarketCard = ({ item }: { item: MarketSummary }) => (
    <View style={styles.marketCard}>
      {/* Header */}
      <View style={styles.marketCardHeader}>
        <View style={styles.marketInfo}>
          <View style={styles.marketTitleRow}>
            <Ionicons name="location" size={20} color="#3B82F6" />
            <Text style={styles.marketNameText}>{t(`market_${item.market}` as any, item.market)}</Text>
          </View>
          <Text style={styles.listingsText}>
            {item.totalListings} {item.totalListings === 1 ? t('listing') : t('listings')} • {item.qualities.join(', ')}
          </Text>
        </View>
      </View>

      {/* Overall Prices */}
      <View style={styles.overallPricesCard}>
        <View style={styles.priceColumn}>
          <View style={styles.priceIconContainer}>
            <Ionicons name="trending-up" size={16} color="#10B981" />
          </View>
          <Text style={styles.priceCardLabel}>{t('maxPriceLabel')}</Text>
          <Text style={styles.maxPriceText}>₹{item.maxPrice}</Text>
        </View>
        <View style={styles.priceDivider} />
        <View style={styles.priceColumn}>
          <View style={[styles.priceIconContainer, { backgroundColor: '#3B82F615' }]}>
            <Ionicons name="analytics" size={16} color="#3B82F6" />
          </View>
          <Text style={styles.priceCardLabel}>{t('avgPriceLabel')}</Text>
          <Text style={styles.avgPriceText}>₹{item.avgPrice}</Text>
        </View>
        <View style={styles.priceDivider} />
        <View style={styles.priceColumn}>
          <View style={[styles.priceIconContainer, { backgroundColor: '#EF444415' }]}>
            <Ionicons name="trending-down" size={16} color="#EF4444" />
          </View>
          <Text style={styles.priceCardLabel}>{t('minPriceLabel')}</Text>
          <Text style={styles.minPriceText}>₹{item.minPrice}</Text>
        </View>
      </View>

      {/* Breed-Specific Prices */}
      {item.breedPrices.length > 0 && (
        <View style={styles.breedPricesSection}>
          <Text style={styles.breedPricesTitle}>{t('breedPrices') || 'Breed-wise Prices'}</Text>
          {item.breedPrices.map(renderBreedPrice)}
        </View>
      )}

      {/* Lot Numbers */}
      {item.lotNumbers.length > 0 && (
        <View style={styles.lotSection}>
          <Ionicons name="cube-outline" size={14} color="#6B7280" />
          <Text style={styles.lotLabel}>{t('lotNumbersLabel')}:</Text>
          <Text style={styles.lotText}>
            {item.lotNumbers.slice(0, 3).join(', ')}
            {item.lotNumbers.length > 3 && ` +${item.lotNumbers.length - 3}`}
          </Text>
        </View>
      )}

      {/* Updated Time */}
      <View style={styles.updateSection}>
        <Ionicons name="time-outline" size={14} color="#6B7280" />
        <Text style={styles.updateText}>
          {t('updatedLabel')} {item.lastUpdated.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
    </View>
  );

  const OverviewCard = () => {
    const totalMarkets = marketSummaries.length;
    const totalListings = prices.length;
    const overallAvgPrice = marketSummaries.length > 0
      ? Math.round(marketSummaries.reduce((sum, market) => sum + market.avgPrice, 0) / marketSummaries.length)
      : 0;
    const highestPrice = marketSummaries.length > 0
      ? Math.max(...marketSummaries.map(m => m.maxPrice))
      : 0;

    return (
      <View style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>{t('marketOverview')}</Text>
        <View style={styles.overviewStats}>
          <View style={styles.overviewStat}>
            <View style={[styles.overviewIcon, { backgroundColor: '#3B82F615' }]}>
              <Ionicons name="business" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.overviewNumber}>{totalMarkets}</Text>
            <Text style={styles.overviewLabel}>{t('activeMarkets')}</Text>
          </View>
          <View style={styles.overviewStat}>
            <View style={[styles.overviewIcon, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="receipt" size={20} color="#10B981" />
            </View>
            <Text style={styles.overviewNumber}>{totalListings}</Text>
            <Text style={styles.overviewLabel}>{t('totalListings')}</Text>
          </View>
          <View style={styles.overviewStat}>
            <View style={[styles.overviewIcon, { backgroundColor: '#F59E0B15' }]}>
              <Ionicons name="analytics" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.overviewNumber}>₹{overallAvgPrice}</Text>
            <Text style={styles.overviewLabel}>{t('avg')}</Text>
          </View>
          <View style={styles.overviewStat}>
            <View style={[styles.overviewIcon, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="trending-up" size={20} color="#10B981" />
            </View>
            <Text style={styles.overviewNumber}>₹{highestPrice}</Text>
            <Text style={styles.overviewLabel}>{t('highestPrice')}</Text>
          </View>
        </View>
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>{t('noMarketsFound')}</Text>
      <Text style={styles.emptySubtitle}>
        {t('noDataForDateRange', { dateRange: getDateRangeLabel().toLowerCase() })}
      </Text>
      <TouchableOpacity style={styles.clearFiltersButton} onPress={() => updateFilter('dateRange', 'all')}>
        <Text style={styles.clearFiltersButtonText}>{t('viewAllData')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title={t('marketCenters')}
          subtitle={t('silkCocoonTradingHubs')}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>{t('loadingMarketData')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('marketCenters')}
        subtitle={t('silkCocoonTradingHubs')}
      />

      {isOffline && (
        <View style={styles.offlineBanner}>
          <View style={styles.offlineBannerContent}>
            <Ionicons name="cloud-offline" size={18} color="#F59E0B" />
            <View style={styles.offlineBannerText}>
              <Text style={styles.offlineBannerTitle}>{t('offlineMode')}</Text>
              <Text style={styles.offlineBannerSubtitle}>
                {t('dataFromCache')} • {cacheTimestamp}
              </Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      >
        <OverviewCard />

        {/* Date Range Filter - Always Visible */}
        <View style={styles.dateRangeContainer}>
          <View style={styles.dateRangeHeader}>
            <Ionicons name="calendar" size={18} color="#3B82F6" />
            <Text style={styles.dateRangeTitle}>{t('showingDataFor')}:</Text>
          </View>
          <View style={styles.dateRangeChips}>
            {[
              { key: 'today', label: t('today'), icon: 'today' },
              { key: 'yesterday', label: t('yesterday'), icon: 'time' },
              { key: 'week', label: t('last7Days'), icon: 'calendar' },
              { key: 'all', label: t('allTime'), icon: 'infinite' }
            ].map(range => (
              <TouchableOpacity
                key={range.key}
                style={[
                  styles.dateRangeChip,
                  filters.dateRange === range.key && styles.dateRangeChipActive
                ]}
                onPress={() => updateFilter('dateRange', range.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={range.icon as any}
                  size={16}
                  color={filters.dateRange === range.key ? '#FFFFFF' : '#6B7280'}
                />
                <Text style={[
                  styles.dateRangeChipText,
                  filters.dateRange === range.key && styles.dateRangeChipTextActive
                ]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Compact Filter Section */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.filterToggleButton}
            onPress={() => setShowFilters(!showFilters)}
            activeOpacity={0.7}
          >
            <View style={styles.filterToggleLeft}>
              <Ionicons name="filter" size={20} color="#3B82F6" />
              <Text style={styles.filterToggleText}>
                {t('moreFilters')}
              </Text>
            </View>
            <Ionicons
              name={showFilters ? "chevron-up" : "chevron-down"}
              size={20}
              color="#3B82F6"
            />
          </TouchableOpacity>

          {showFilters && (
            <View style={styles.filterContent}>
              {/* Breed Filters */}
              <View style={styles.quickFilters}>
                <Text style={styles.filterSectionLabel}>{t('breeds')}:</Text>
                <View style={styles.filterChipsContainer}>
                  {['All', 'CB', 'BV'].map(breed => (
                    <FilterChip
                      key={breed}
                      label={t(`breed_${breed}` as any, breed)}
                      isActive={filters.breed === breed}
                      onPress={() => updateFilter('breed', breed)}
                    />
                  ))}
                </View>
              </View>

              {/* Market Filters */}
              {uniqueMarkets.length > 1 && (
                <View style={styles.quickFilters}>
                  <Text style={styles.filterSectionLabel}>{t('markets')}:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.filterChipsContainer}>
                      {uniqueMarkets.map(market => (
                        <FilterChip
                          key={market}
                          label={t(`market_${market}` as any, market)}
                          isActive={filters.market === market}
                          onPress={() => updateFilter('market', market)}
                        />
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {(filters.breed !== 'All' || filters.market !== 'All') && (
                <TouchableOpacity
                  style={styles.clearFiltersTextButton}
                  onPress={clearFilters}
                >
                  <Text style={styles.clearFiltersText}>{t('clearAllFilters')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Results Count */}
        {filteredSummaries.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsText}>
              {filteredSummaries.length} {filteredSummaries.length === 1 ? t('market') : t('markets')} {t('found')}
            </Text>
          </View>
        )}

        {/* Market Data Cards or Empty State */}
        {filteredSummaries.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.marketCardsContainer}>
            {filteredSummaries.map(item => (
              <View key={item.market}>
                {renderMarketCard({ item })}
              </View>
            ))}
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Content
  content: {
    flex: 1,
  },

  // Overview Card
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  overviewStat: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  overviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },

  // Date Range Filter
  dateRangeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateRangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateRangeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  dateRangeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateRangeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateRangeChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  dateRangeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  dateRangeChipTextActive: {
    color: '#FFFFFF',
  },

  // Compact Filter Section
  filterSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  filterToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  quickFilters: {
    gap: 12,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  clearFiltersTextButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Results
  resultsContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Market Cards
  marketCardsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  marketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    gap: 16,
  },
  marketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  marketInfo: {
    flex: 1,
    gap: 6,
  },
  marketTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  marketNameText: {
    fontSize: 20,
    color: '#111827',
    fontWeight: '700',
  },
  listingsText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Overall Prices Card
  overallPricesCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  priceColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  priceIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B98115',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  priceCardLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  maxPriceText: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: '800',
  },
  minPriceText: {
    fontSize: 18,
    color: '#EF4444',
    fontWeight: '800',
  },
  avgPriceText: {
    fontSize: 18,
    color: '#3B82F6',
    fontWeight: '800',
  },

  // Breed Prices Section
  breedPricesSection: {
    gap: 10,
  },
  breedPricesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  breedPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  breedPriceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  breedPriceText: {
    fontSize: 13,
    fontWeight: '700',
  },
  breedPriceDetails: {
    flex: 1,
  },
  breedPriceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  breedPriceRange: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  breedCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },

  // Lot Section
  lotSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  lotLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  lotText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },

  // Update Section
  updateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  updateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 48,
    marginHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  clearFiltersButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  clearFiltersButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Offline Banner
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
    color: '#B45309',
    fontWeight: '500',
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 40,
  },
});
