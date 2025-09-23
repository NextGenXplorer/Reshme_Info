import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, orderBy, query, where, Timestamp } from 'firebase/firestore';
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
  sortBy: 'price' | 'date' | 'market';
  sortOrder: 'asc' | 'desc';
}

export default function MarketScreen() {
  const { t } = useTranslation();
  const [prices, setPrices] = useState<CocoonPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<CocoonPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showPriceComparison, setShowPriceComparison] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'from' | 'to' | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    breed: 'All',
    market: 'All',
    dateFrom: null,
    dateTo: null,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const markets = [
    {
      name: 'Ramanagara',
      location: 'Karnataka, India',
      description: 'Major silk trading hub with traditional cocoon markets',
      icon: 'location',
      color: '#3B82F6',
    },
    {
      name: 'Kollegala',
      location: 'Karnataka, India',
      description: 'Historic silk center known for quality cocoon production',
      icon: 'business',
      color: '#10B981',
    },
    {
      name: 'Kanakapura',
      location: 'Karnataka, India',
      description: 'Regional market center for silk cocoon trading',
      icon: 'storefront',
      color: '#F59E0B',
    },
    {
      name: 'Siddalagatta',
      location: 'Karnataka, India',
      description: 'Growing market with modern trading facilities',
      icon: 'trending-up',
      color: '#8B5CF6',
    },
    {
      name: 'Kolar',
      location: 'Karnataka, India',
      description: 'Established silk market with diverse trading options',
      icon: 'globe',
      color: '#EF4444',
    },
  ];

  const uniqueMarkets = ['All', ...Array.from(new Set(prices.map(p => p.market)))];

  useEffect(() => {
    fetchMarketData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, prices]);

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

  const applyFilters = () => {
    let filtered = [...prices];

    // Filter by breed
    if (filters.breed !== 'All') {
      filtered = filtered.filter(price => price.breed === filters.breed);
    }

    // Filter by market
    if (filters.market !== 'All') {
      filtered = filtered.filter(price => price.market === filters.market);
    }

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(price => price.lastUpdated >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(price => price.lastUpdated <= endDate);
    }

    // Sort
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (filters.sortBy) {
        case 'price':
          compareValue = a.avgPrice - b.avgPrice;
          break;
        case 'date':
          compareValue = a.lastUpdated.getTime() - b.lastUpdated.getTime();
          break;
        case 'market':
          compareValue = a.market.localeCompare(b.market);
          break;
      }

      return filters.sortOrder === 'asc' ? compareValue : -compareValue;
    });

    setFilteredPrices(filtered);
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
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || (showDatePicker === 'from' ? filters.dateFrom : filters.dateTo);
    setShowDatePicker(null);

    if (currentDate) {
      if (showDatePicker === 'from') {
        updateFilter('dateFrom', currentDate);
      } else {
        updateFilter('dateTo', currentDate);
      }
    }
  };

  const getMarketStats = (marketName: string) => {
    const marketPrices = prices.filter(price => price.market === marketName);
    if (marketPrices.length === 0) {
      return { avgPrice: 0, totalListings: 0, lastUpdate: null };
    }

    const avgPrice = marketPrices.reduce((sum, price) => sum + price.avgPrice, 0) / marketPrices.length;
    const totalListings = marketPrices.length;
    const lastUpdate = marketPrices[0]?.lastUpdated;

    return { avgPrice: Math.round(avgPrice), totalListings, lastUpdate };
  };

  const getPriceChangeColor = (price: number, avgPrice: number) => {
    if (price > avgPrice * 1.05) return '#10B981'; // Green for above average
    if (price < avgPrice * 0.95) return '#EF4444'; // Red for below average
    return '#6B7280'; // Gray for neutral
  };

  const renderPriceComparisonRow = ({ item }: { item: CocoonPrice }) => {
    const marketAvg = prices
      .filter(p => p.market === item.market)
      .reduce((sum, p) => sum + p.avgPrice, 0) / prices.filter(p => p.market === item.market).length;

    return (
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, styles.marketCell]}>
          <Text style={styles.tableCellText}>{item.market}</Text>
        </View>
        <View style={[styles.tableCell, styles.breedCell]}>
          <View style={[styles.breedBadge, { backgroundColor: item.breed === 'CB' ? '#3B82F615' : '#10B98115' }]}>
            <Text style={[styles.breedText, { color: item.breed === 'CB' ? '#3B82F6' : '#10B981' }]}>
              {item.breed}
            </Text>
          </View>
        </View>
        <View style={[styles.tableCell, styles.priceCell]}>
          <Text style={[styles.priceCellText, { color: getPriceChangeColor(item.avgPrice, marketAvg) }]}>
            ₹{item.avgPrice}
          </Text>
          <Text style={styles.priceRangeText}>
            {item.minPrice}-{item.maxPrice}
          </Text>
        </View>
        <View style={[styles.tableCell, styles.qualityCell]}>
          <View style={[styles.qualityBadge, {
            backgroundColor: item.quality === 'A' ? '#10B98115' :
                           item.quality === 'B' ? '#F59E0B15' : '#EF444415'
          }]}>
            <Text style={[styles.qualityText, {
              color: item.quality === 'A' ? '#10B981' :
                     item.quality === 'B' ? '#F59E0B' : '#EF4444'
            }]}>
              {item.quality}
            </Text>
          </View>
        </View>
        <View style={[styles.tableCell, styles.lotCell]}>
          <Text style={styles.tableCellText}>{item.lotNumber}</Text>
        </View>
        <View style={[styles.tableCell, styles.dateCell]}>
          <Text style={styles.tableCellText}>
            {item.lastUpdated.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit'
            })}
          </Text>
          <Text style={styles.timeText}>
            {item.lastUpdated.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
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

  const MarketCard = ({ market, index }: { market: any; index: number }) => {
    const stats = getMarketStats(market.name);

    return (
      <TouchableOpacity style={styles.marketCard} activeOpacity={0.8}>
        <View style={styles.marketHeader}>
          <View style={[styles.marketIconContainer, { backgroundColor: `${market.color}15` }]}>
            <Ionicons name={market.icon as any} size={24} color={market.color} />
          </View>
          <View style={styles.marketInfo}>
            <Text style={styles.marketName}>{market.name}</Text>
            <Text style={styles.marketLocation}>{market.location}</Text>
          </View>
          <View style={styles.marketStatsContainer}>
            <Text style={styles.marketPrice}>₹{stats.avgPrice}</Text>
            <Text style={styles.marketPriceLabel}>{t('avgPriceKg') || 'Avg/kg'}</Text>
          </View>
        </View>

        <Text style={styles.marketDescription}>{market.description}</Text>

        <View style={styles.marketFooter}>
          <View style={styles.marketStat}>
            <Ionicons name="list" size={16} color="#6B7280" />
            <Text style={styles.marketStatText}>{stats.totalListings} {t('listings') || 'listings'}</Text>
          </View>
          <View style={styles.marketStat}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.marketStatText}>
              {stats.lastUpdate ? stats.lastUpdate.toLocaleDateString() : (t('noData') || 'No data')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const OverviewCard = () => {
    const totalMarkets = markets.length;
    const totalListings = prices.length;
    const avgPrice = prices.length > 0
      ? Math.round(prices.reduce((sum, price) => sum + price.avgPrice, 0) / prices.length)
      : 0;

    return (
      <View style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>{t('marketOverview') || 'Market Overview'}</Text>
        <View style={styles.overviewStats}>
          <View style={styles.overviewStat}>
            <Text style={styles.overviewNumber}>{totalMarkets}</Text>
            <Text style={styles.overviewLabel}>{t('activeMarkets') || 'Active Markets'}</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewStat}>
            <Text style={styles.overviewNumber}>{totalListings}</Text>
            <Text style={styles.overviewLabel}>{t('totalListings') || 'Total Listings'}</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewStat}>
            <Text style={styles.overviewNumber}>₹{avgPrice}</Text>
            <Text style={styles.overviewLabel}>{t('avgPriceKg') || 'Avg Price/kg'}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (!showPriceComparison) {
    return (
      <SafeAreaView style={styles.container}>
        <Header rightComponent={<LanguageSwitcher />} />
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <OverviewCard />

          <View style={styles.marketsSection}>
            <Text style={styles.sectionTitle}>{t('tradingCenters') || 'Trading Centers'}</Text>
            <Text style={styles.sectionSubtitle}>
              {t('marketInfoDetail') || 'Explore major silk cocoon markets across Karnataka'}
            </Text>

            {markets.map((market, index) => (
              <MarketCard key={market.name} market={market} index={index} />
            ))}
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>{t('marketInformation') || 'Market Information'}</Text>
                <Text style={styles.infoText}>
                  {t('marketInfoDetail') || 'Prices are updated in real-time from verified market sources. All trading centers operate during standard business hours.'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Toggle */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <View style={styles.titleIconContainer}>
              <Image
                source={require('../assets/IMG-20250920-WA0022.jpg')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.titleTextContainer}>
              <Text style={styles.title}>{t('marketCenters')}</Text>
              <Text style={styles.subtitle}>{t('silkCocoonTradingHubs')}</Text>
            </View>
          </View>

          {/* Toggle buttons */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, !showPriceComparison && styles.toggleButtonActive]}
              onPress={() => setShowPriceComparison(false)}
            >
              <Ionicons name="grid-outline" size={16} color={!showPriceComparison ? '#FFFFFF' : '#6B7280'} />
              <Text style={[styles.toggleButtonText, !showPriceComparison && styles.toggleButtonTextActive]}>
                {t('markets')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, showPriceComparison && styles.toggleButtonActive]}
              onPress={() => setShowPriceComparison(true)}
            >
              <Ionicons name="analytics-outline" size={16} color={showPriceComparison ? '#FFFFFF' : '#6B7280'} />
              <Text style={[styles.toggleButtonText, showPriceComparison && styles.toggleButtonTextActive]}>
                {t('prices')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Price Comparison View */}
      <View style={styles.container}>
        {/* Filter Controls */}
        <View style={styles.filterContainer}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>{t('priceComparison')}</Text>
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
                <Text style={styles.filterLabel}>{t('breed')}</Text>
                <View style={styles.filterChipsContainer}>
                  {['All', 'CB', 'BV'].map(breed => (
                    <FilterChip
                      key={breed}
                      label={t(`breed_${breed.toLowerCase()}`)}
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
                        label={t(`market_${market.toLowerCase()}`)}
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
                      { key: 'date', label: t('date') },
                      { key: 'price', label: t('price') },
                      { key: 'market', label: t('market') }
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
            {t('pricesFound', { count: filteredPrices.length })}
          </Text>
        </View>

        {/* Price Comparison Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <View style={[styles.tableHeaderCell, styles.marketCell]}>
              <Text style={styles.tableHeaderText}>{t('market')}</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.breedCell]}>
              <Text style={styles.tableHeaderText}>{t('breed')}</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.priceCell]}>
              <Text style={styles.tableHeaderText}>{t('price_kg')}</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.qualityCell]}>
              <Text style={styles.tableHeaderText}>{t('quality')}</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.lotCell]}>
              <Text style={styles.tableHeaderText}>{t('lot')}</Text>
            </View>
            <View style={[styles.tableHeaderCell, styles.dateCell]}>
              <Text style={styles.tableHeaderText}>{t('updated_trans')}</Text>
            </View>
          </View>

          <FlatList
            data={filteredPrices}
            renderItem={renderPriceComparisonRow}
            keyExtractor={(item) => item.id}
            style={styles.tableContent}
            showsVerticalScrollIndicator={false}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  logoImage: {
    width: 40,
    height: 40,
  },
  titleTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },

  // Toggle Buttons
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#3B82F6',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },

  // Filter Styles
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  },
  resultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Table Styles
  tableContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  tableHeaderCell: {
    justifyContent: 'center',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
  },
  tableContent: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  tableCell: {
    justifyContent: 'center',
  },
  marketCell: {
    flex: 1.5,
  },
  breedCell: {
    flex: 0.8,
    alignItems: 'center',
  },
  priceCell: {
    flex: 1.2,
    alignItems: 'center',
  },
  qualityCell: {
    flex: 0.8,
    alignItems: 'center',
  },
  lotCell: {
    flex: 0.8,
    alignItems: 'center',
  },
  dateCell: {
    flex: 1.5,
    alignItems: 'flex-end',
  },
  tableCellText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  breedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  breedText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priceCellText: {
    fontSize: 16,
    fontWeight: '700',
  },
  priceRangeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  qualityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
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
    fontSize: 24,
    fontWeight: '800',
    color: '#3B82F6',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  overviewDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },

  // Markets Section
  marketsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },

  // Market Cards
  marketCard: {
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
  marketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  marketIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  marketInfo: {
    flex: 1,
    marginLeft: 12,
  },
  marketName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  marketLocation: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  marketStatsContainer: {
    alignItems: 'flex-end',
  },
  marketPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  marketPriceLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  marketDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  marketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  marketStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  marketStatText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Info Section
  infoSection: {
    marginBottom: 40,
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});