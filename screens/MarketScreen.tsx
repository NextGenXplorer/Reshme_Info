import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import Header from '../components/Header';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { db, COLLECTIONS } from '../firebase.config';
import { CocoonPrice } from '../types';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

interface FilterOptions {
  breed: 'All' | 'CB' | 'BV';
  market: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  sortBy: 'market' | 'avgPrice' | 'maxPrice' | 'minPrice' | 'date';
  sortOrder: 'asc' | 'desc';
}

interface MarketSummary {
  market: string;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  lotNumbers: string[];
  breeds: string[];
  lastUpdated: Date;
  totalListings: number;
}

export default function MarketScreen() {
  const { t } = useTranslation();
  const [prices, setPrices] = useState<CocoonPrice[]>([]);
  const [marketSummaries, setMarketSummaries] = useState<MarketSummary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<MarketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'from' | 'to' | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    breed: 'All',
    market: 'All',
    dateFrom: null,
    dateTo: null,
    sortBy: 'market',
    sortOrder: 'asc',
  });

  const uniqueMarkets = ['All', ...Array.from(new Set(prices.map(p => p.market)))];

  useEffect(() => {
    fetchMarketData();
  }, []);

  useEffect(() => {
    generateMarketSummaries();
  }, [prices]);

  useEffect(() => {
    applyFilters();
  }, [filters, marketSummaries]);

  const fetchMarketData = async () => {
    try {
      const q = query(collection(db, COLLECTIONS.COCOON_PRICES), orderBy('lastUpdated', 'desc'));
      const querySnapshot = await getDocs(q);
      const pricesData: CocoonPrice[] = [];

      querySnapshot.forEach((doc) => {
        pricesData.push({
          id: doc.id,
          ...doc.data(),
          lastUpdated: doc.data().lastUpdated.toDate(),
        } as CocoonPrice);
      });

      setPrices(pricesData);
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMarketSummaries = () => {
    const marketGroups: { [key: string]: CocoonPrice[] } = {};
    
    prices.forEach(price => {
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
      
      return {
        market: marketName,
        avgPrice: avgPrices.length > 0 ? Math.round(avgPrices.reduce((sum, price) => sum + price, 0) / avgPrices.length) : 0,
        maxPrice: maxPrices.length > 0 ? Math.max(...maxPrices) : 0,
        minPrice: minPrices.length > 0 ? Math.min(...minPrices) : 0,
        lotNumbers: [...new Set(marketPrices.map(p => p.lotNumber))],
        breeds: [...new Set(marketPrices.map(p => p.breed))],
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

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(summary => summary.lastUpdated >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(summary => summary.lastUpdated <= endDate);
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
      dateFrom: null,
      dateTo: null,
      sortBy: 'market',
      sortOrder: 'asc',
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || (showDatePicker === 'from' ? filters.dateFrom : filters.dateTo);
    setShowDatePicker(null);

    if (currentDate) {
      let newDateFrom = filters.dateFrom;
      let newDateTo = filters.dateTo;

      if (showDatePicker === 'from') {
        newDateFrom = currentDate;
      } else {
        newDateTo = currentDate;
      }

      if (newDateFrom && newDateTo && newDateFrom > newDateTo) {
        // Swap dates if from is after to
        setFilters(prev => ({
          ...prev,
          dateFrom: newDateTo,
          dateTo: newDateFrom,
        }));
      } else {
        if (showDatePicker === 'from') {
          updateFilter('dateFrom', currentDate);
        } else {
          updateFilter('dateTo', currentDate);
        }
      }
    }
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

  const renderMarketCard = ({ item }: { item: MarketSummary }) => (
    <View style={styles.marketCard}>
      {/* Header */}
      <View style={styles.marketCardHeader}>
        <View style={styles.marketInfo}>
          <Text style={styles.marketNameText}>{item.market}</Text>
          <Text style={styles.listingsText}>{item.totalListings} {t('listings')}</Text>
        </View>
        <View style={styles.breedContainer}>
          {item.breeds.map(breed => (
            <View
              key={breed}
              style={[styles.breedBadge, { backgroundColor: breed === 'CB' ? '#3B82F615' : '#10B98115' }]}
            >
              <Text style={[styles.breedText, { color: breed === 'CB' ? '#3B82F6' : '#10B981' }]}>
                {breed}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Prices Row */}
      <View style={styles.pricesRow}>
        <View style={styles.priceItem}>
          <Text style={styles.maxPriceText}>₹{item.maxPrice}</Text>
          <Text style={styles.priceLabel}>{t('maxPriceLabel')}</Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.minPriceText}>₹{item.minPrice}</Text>
          <Text style={styles.priceLabel}>{t('minPriceLabel')}</Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.avgPriceText}>₹{item.avgPrice}</Text>
          <Text style={styles.priceLabel}>{t('avgPriceLabel')}</Text>
        </View>
      </View>

      {/* Lot Numbers */}
      <View style={styles.lotSection}>
        <Text style={styles.lotLabel}>{t('lotNumbersLabel')}</Text>
        <Text style={styles.lotText}>
          {item.lotNumbers.slice(0, 3).join(', ')}
          {item.lotNumbers.length > 3 && ` +${item.lotNumbers.length - 3} more`}
        </Text>
      </View>

      {/* Updated Time */}
      <View style={styles.updateSection}>
        <Ionicons name="time-outline" size={14} color="#6B7280" />
        <Text style={styles.updateText}>
          {t('updatedLabel')} {item.lastUpdated.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: '2-digit'
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
        <Text style={styles.overviewTitle}>{t('marketOverview') || 'Market Overview'}</Text>
        <View style={styles.overviewStats}>
          <View style={styles.overviewStat}>
            <Text style={styles.overviewNumber}>{totalMarkets}</Text>
            <Text style={styles.overviewLabel}>{t('activeMarkets') || 'Markets'}</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewStat}>
            <Text style={styles.overviewNumber}>{totalListings}</Text>
            <Text style={styles.overviewLabel}>{t('totalListings') || 'Listings'}</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewStat}>
            <Text style={styles.overviewNumber}>₹{overallAvgPrice}</Text>
            <Text style={styles.overviewLabel}>{t('avgPrice') || 'Avg Price'}</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewStat}>
            <Text style={styles.overviewNumber}>₹{highestPrice}</Text>
            <Text style={styles.overviewLabel}>{t('highestPrice') || 'Highest'}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title={t('marketCenters') || 'Market Centers'}
          subtitle={t('silkCocoonTradingHubs') || 'Silk cocoon trading hubs'}
          rightComponent={<LanguageSwitcher />}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('loadingMarketData') || 'Loading market data...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('marketCenters') || 'Market Centers'}
        subtitle={t('silkCocoonTradingHubs') || 'Silk cocoon trading hubs'}
        rightComponent={<LanguageSwitcher />}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <OverviewCard />

        {/* Filter Controls */}
        <View style={styles.filterContainer}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>{t('marketData')}</Text>
            <TouchableOpacity
              style={styles.filterToggle}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons name="options-outline" size={20} color="#3B82F6" />
              <Text style={styles.filterToggleText}>{t('filters')}</Text>
            </TouchableOpacity>
          </View>

          {showFilters && (
            <View style={styles.filterContent}>
              {/* Breed Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('breeds')}</Text>
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

              {/* Market Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('market')}</Text>
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

              {/* Date Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('dateRange')}</Text>
                <View style={styles.dateFilterContainer}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker('from')}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    <Text style={styles.dateButtonText}>
                      {filters.dateFrom ? filters.dateFrom.toLocaleDateString() : t('fromDate')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker('to')}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    <Text style={styles.dateButtonText}>
                      {filters.dateTo ? filters.dateTo.toLocaleDateString() : t('toDate')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sort Options */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('sortBy')}</Text>
                <View style={styles.sortContainer}>
                  <View style={styles.filterChipsContainer}>
                    {[
                      { key: 'market', label: t('sort_market') },
                      { key: 'avgPrice', label: t('sort_avgPrice') },
                      { key: 'maxPrice', label: t('sort_maxPrice') },
                      { key: 'minPrice', label: t('sort_minPrice') },
                      { key: 'date', label: t('sort_date') }
                    ].map(sort => (
                      <FilterChip
                        key={sort.key}
                        label={sort.label}
                        isActive={filters.sortBy === sort.key}
                        onPress={() => updateFilter('sortBy', sort.key)}
                      />
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.sortOrderButton}
                    onPress={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    <Ionicons
                      name={filters.sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                      size={16}
                      color="#3B82F6"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                <Text style={styles.clearFiltersText}>{t('clearAllFilters')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {t('marketsFound', { count: filteredSummaries.length })}
          </Text>
        </View>

        {/* Market Data Cards */}
        <View style={styles.marketCardsContainer}>
          <FlatList
            data={filteredSummaries}
            renderItem={renderMarketCard}
            keyExtractor={(item) => item.market}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
          />
        </View>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={showDatePicker === 'from' ? filters.dateFrom || new Date() : filters.dateTo || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Overview Card
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewStat: {
    flex: 1,
    alignItems: 'center',
  },
  overviewNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3B82F6',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  overviewDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },

  // Filter Styles
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  filterContent: {
    gap: 16,
  },
  filterSection: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  dateFilterContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortOrderButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  clearFiltersButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Results
  resultsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 16,
  },
  resultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Market Cards Container
  marketCardsContainer: {
    marginBottom: 40,
  },
  cardSeparator: {
    height: 12,
  },

  // Market Card Styles
  marketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  marketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  marketInfo: {
    flex: 1,
  },
  marketNameText: {
    fontSize: 20,
    color: '#111827',
    fontWeight: '700',
    marginBottom: 4,
  },
  listingsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  breedContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  breedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  breedText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Prices Row
  pricesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  priceItem: {
    alignItems: 'center',
    flex: 1,
  },
  maxPriceText: {
    fontSize: 20,
    color: '#10B981',
    fontWeight: '800',
    marginBottom: 4,
  },
  minPriceText: {
    fontSize: 20,
    color: '#EF4444',
    fontWeight: '800',
    marginBottom: 4,
  },
  avgPriceText: {
    fontSize: 20,
    color: '#3B82F6',
    fontWeight: '800',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Lot Section
  lotSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  lotLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginRight: 8,
  },
  lotText: {
    fontSize: 14,
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
});
