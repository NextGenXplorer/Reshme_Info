import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import NetInfo from '@react-native-community/netinfo';
import { saveToCache, loadFromCache, getCacheAge, CACHE_KEYS } from '../utils/cacheUtils';
import Header from '../components/Header';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase.config';
import { CocoonPrice } from '../types';
import AdBanner from '../components/AdBanner';

export default function StatsScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [prices, setPrices] = useState<CocoonPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<string>('');

  // Responsive layout calculations
  const isSmallScreen = width < 380;
  const isMediumScreen = width >= 380 && width < 768;
  const isLargeScreen = width >= 768;
  const numColumns = isLargeScreen ? 3 : 2;
  const cardSpacing = isSmallScreen ? 8 : 16;
  const horizontalPadding = isSmallScreen ? 12 : 20;

  useEffect(() => {
    fetchStatsData();
  }, []);

  const fetchStatsData = async () => {
    try {
      // Check internet connectivity first
      const netState = await NetInfo.fetch();

      if (!netState.isConnected) {
        // Load from cache when offline
        const cachedData = await loadFromCache(CACHE_KEYS.STATS_PRICES);
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

      const q = query(collection(db, COLLECTIONS.COCOON_PRICES), orderBy('lastUpdated', 'desc'));
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
      await saveToCache(CACHE_KEYS.STATS_PRICES, pricesData);
      setCacheTimestamp('');
    } catch (error) {
      // Check if error is due to network issues
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        const cachedData = await loadFromCache(CACHE_KEYS.STATS_PRICES);
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
      console.error('Error fetching stats data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group prices by day
  const groupPricesByDay = () => {
    const grouped: { [key: string]: CocoonPrice[] } = {};

    prices.forEach(price => {
      const dateKey = price.lastUpdated.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(price);
    });

    return Object.entries(grouped)
      .map(([date, dayPrices]) => ({
        date: new Date(date),
        prices: dayPrices,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Most recent first
  };

  const calculateDayStats = (dayPrices: CocoonPrice[]) => {
    if (dayPrices.length === 0) {
      return {
        totalListings: 0,
        avgPrice: 0,
        highestPrice: 0,
        lowestPrice: 0,
        totalMarkets: 0,
        totalBreeds: 0,
        priceRange: 0,
        marketLeader: 'N/A',
      };
    }

    const avgPrice = Math.round(dayPrices.reduce((sum, price) => sum + price.avgPrice, 0) / dayPrices.length);
    const highestPrice = Math.max(...dayPrices.map(p => p.maxPrice));
    const lowestPrice = Math.min(...dayPrices.map(p => p.minPrice));
    const totalMarkets = new Set(dayPrices.map(p => p.market)).size;
    const totalBreeds = new Set(dayPrices.map(p => p.breed)).size;
    const priceRange = highestPrice - lowestPrice;

    // Find market with highest average price
    const marketPrices: { [key: string]: number[] } = {};
    dayPrices.forEach(price => {
      if (!marketPrices[price.market]) {
        marketPrices[price.market] = [];
      }
      marketPrices[price.market].push(price.avgPrice);
    });

    let marketLeader = 'N/A';
    let highestAvg = 0;
    Object.entries(marketPrices).forEach(([market, pricesList]) => {
      const avg = pricesList.reduce((sum, p) => sum + p, 0) / pricesList.length;
      if (avg > highestAvg) {
        highestAvg = avg;
        marketLeader = market;
      }
    });

    return {
      totalListings: dayPrices.length,
      avgPrice,
      highestPrice,
      lowestPrice,
      totalMarkets,
      totalBreeds,
      priceRange,
      marketLeader,
    };
  };

  const getMarketDistribution = (dayPrices: CocoonPrice[]) => {
    const distribution: { [key: string]: number } = {};
    dayPrices.forEach(price => {
      distribution[price.market] = (distribution[price.market] || 0) + 1;
    });
    return Object.entries(distribution)
      .map(([market, count]) => ({ market, count, percentage: (count / dayPrices.length) * 100 }))
      .sort((a, b) => b.count - a.count);
  };

  const getBreedDistribution = (dayPrices: CocoonPrice[]) => {
    const distribution: { [key: string]: number } = {};
    dayPrices.forEach(price => {
      distribution[price.breed] = (distribution[price.breed] || 0) + 1;
    });
    return Object.entries(distribution)
      .map(([breed, count]) => ({ breed, count, percentage: (count / dayPrices.length) * 100 }))
      .sort((a, b) => b.count - a.count);
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('yesterday');
    } else {
      return date.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const dailyData = groupPricesByDay();

  const StatCard = ({ title, value, subtitle, icon, color, trend }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: string;
    color: string;
    trend?: 'up' | 'down' | 'stable';
  }) => {
    const cardWidth = (width - (horizontalPadding * 2) - (cardSpacing * (numColumns - 1))) / numColumns;
    const iconSize = isSmallScreen ? 18 : 20;
    const trendIconSize = isSmallScreen ? 14 : 16;

    return (
      <View style={[styles.statCard, { width: cardWidth, marginBottom: cardSpacing }]}>
        <View style={styles.statHeader}>
          <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon as any} size={iconSize} color={color} />
          </View>
          {trend && (
            <View style={styles.trendContainer}>
              <Ionicons
                name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
                size={trendIconSize}
                color={trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#6B7280'}
              />
            </View>
          )}
        </View>
        <Text style={[styles.statValue, isSmallScreen && styles.statValueSmall]}>{value}</Text>
        <Text style={[styles.statTitle, isSmallScreen && styles.statTitleSmall]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.statSubtitle, isSmallScreen && styles.statSubtitleSmall]} numberOfLines={2}>{subtitle}</Text>
      </View>
    );
  };

  const DistributionBar = ({ label, percentage, color }: {
    label: string;
    percentage: number;
    color: string;
  }) => (
    <View style={styles.distributionItem}>
      <View style={styles.distributionLabel}>
        <Text style={styles.distributionLabelText}>{label}</Text>
        <Text style={styles.distributionPercentage}>{percentage.toFixed(1)}%</Text>
      </View>
      <View style={styles.distributionBarContainer}>
        <View
          style={[
            styles.distributionBar,
            { width: `${percentage}%`, backgroundColor: color }
          ]}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header rightComponent={<LanguageSwitcher />} />

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

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingTop: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {dailyData.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>{t('noDataAvailable')}</Text>
          </View>
        ) : (
          dailyData.map((dayData, dayIndex) => {
            const stats = calculateDayStats(dayData.prices);
            const marketDistribution = getMarketDistribution(dayData.prices);
            const breedDistribution = getBreedDistribution(dayData.prices);

            return (
              <View key={dayIndex} style={styles.daySection}>
                {/* Date Header */}
                <View style={styles.dateHeader}>
                  <Ionicons name="calendar" size={20} color="#3B82F6" />
                  <Text style={[styles.dateText, isSmallScreen && styles.dateTextSmall]}>
                    {formatDate(dayData.date)}
                  </Text>
                </View>

                {/* Key Stats Grid */}
                <View style={[styles.statsGrid, { gap: cardSpacing }]}>
                  <StatCard
                    title={t('totalListings')}
                    value={stats.totalListings}
                    subtitle={t('activePriceEntries')}
                    icon="list"
                    color="#3B82F6"
                    trend="up"
                  />
                  <StatCard
                    title={t('averagePrice')}
                    value={`₹${stats.avgPrice}`}
                    subtitle={t('perKilogram')}
                    icon="analytics"
                    color="#10B981"
                    trend="stable"
                  />
                  <StatCard
                    title={t('highestPrice')}
                    value={`₹${stats.highestPrice}`}
                    subtitle={t('peakMarketRate')}
                    icon="trending-up"
                    color="#F59E0B"
                    trend="up"
                  />
                  <StatCard
                    title={t('lowestPrice')}
                    value={`₹${stats.lowestPrice}`}
                    subtitle={t('minimumMarketRate')}
                    icon="trending-down"
                    color="#EF4444"
                    trend="down"
                  />
                </View>

                {/* Market Overview */}
                <View style={styles.overviewSection}>
                  <Text style={[styles.sectionTitle, isSmallScreen && styles.sectionTitleSmall]}>{t('marketOverview')}</Text>
                  <View style={[styles.overviewGrid, { gap: cardSpacing }]}>
                    <View style={[styles.overviewCard, { width: (width - (horizontalPadding * 2) - cardSpacing) / 2 }]}>
                      <Text style={[styles.overviewNumber, isSmallScreen && styles.overviewNumberSmall]}>{stats.totalMarkets}</Text>
                      <Text style={[styles.overviewLabel, isSmallScreen && styles.overviewLabelSmall]} numberOfLines={2}>{t('activeMarkets')}</Text>
                    </View>
                    <View style={[styles.overviewCard, { width: (width - (horizontalPadding * 2) - cardSpacing) / 2 }]}>
                      <Text style={[styles.overviewNumber, isSmallScreen && styles.overviewNumberSmall]}>{stats.totalBreeds}</Text>
                      <Text style={[styles.overviewLabel, isSmallScreen && styles.overviewLabelSmall]} numberOfLines={2}>{t('breedTypes')}</Text>
                    </View>
                    <View style={[styles.overviewCard, { width: (width - (horizontalPadding * 2) - cardSpacing) / 2 }]}>
                      <Text style={[styles.overviewNumber, isSmallScreen && styles.overviewNumberSmall]}>₹{stats.priceRange}</Text>
                      <Text style={[styles.overviewLabel, isSmallScreen && styles.overviewLabelSmall]} numberOfLines={2}>{t('priceRange')}</Text>
                    </View>
                    <View style={[styles.overviewCard, { width: (width - (horizontalPadding * 2) - cardSpacing) / 2 }]}>
                      <Text style={[styles.overviewNumber, isSmallScreen && styles.overviewNumberSmall]} numberOfLines={1} adjustsFontSizeToFit>{stats.marketLeader}</Text>
                      <Text style={[styles.overviewLabel, isSmallScreen && styles.overviewLabelSmall]} numberOfLines={2}>{t('topMarket')}</Text>
                    </View>
                  </View>
                </View>

                {/* Market Distribution */}
                {marketDistribution.length > 0 && (
                  <View style={styles.distributionSection}>
                    <Text style={[styles.sectionTitle, isSmallScreen && styles.sectionTitleSmall]}>{t('marketDistribution')}</Text>
                    <Text style={[styles.sectionSubtitle, isSmallScreen && styles.sectionSubtitleSmall]}>{t('listingDistribution')}</Text>
                    <View style={styles.distributionChart}>
                      {marketDistribution.map((item, index) => (
                        <DistributionBar
                          key={item.market}
                          label={item.market}
                          percentage={item.percentage}
                          color={['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'][index % 5]}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Breed Distribution */}
                {breedDistribution.length > 0 && (
                  <View style={styles.distributionSection}>
                    <Text style={[styles.sectionTitle, isSmallScreen && styles.sectionTitleSmall]}>{t('breedDistribution')}</Text>
                    <Text style={[styles.sectionSubtitle, isSmallScreen && styles.sectionSubtitleSmall]}>{t('cocoonBreedDistribution')}</Text>
                    <View style={styles.distributionChart}>
                      {breedDistribution.map((item, index) => (
                        <DistributionBar
                          key={item.breed}
                          label={item.breed}
                          percentage={item.percentage}
                          color={['#8B5CF6', '#06B6D4', '#84CC16'][index % 3]}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Day Divider */}
                {dayIndex < dailyData.length - 1 && <View style={styles.dayDivider} />}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* AdMob Banner Ad */}
      <AdBanner />
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
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
    fontWeight: '500',
  },

  // Day Section
  daySection: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  dateTextSmall: {
    fontSize: 16,
  },
  dayDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 24,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statValueSmall: {
    fontSize: 20,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  statTitleSmall: {
    fontSize: 12,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statSubtitleSmall: {
    fontSize: 10,
  },

  // Overview Section
  overviewSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionTitleSmall: {
    fontSize: 18,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  sectionSubtitleSmall: {
    fontSize: 12,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3B82F6',
    marginBottom: 4,
  },
  overviewNumberSmall: {
    fontSize: 18,
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  overviewLabelSmall: {
    fontSize: 10,
  },

  // Distribution Section
  distributionSection: {
    marginBottom: 24,
  },
  distributionChart: {
    gap: 12,
  },
  distributionItem: {
    gap: 8,
  },
  distributionLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distributionLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  distributionPercentage: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  distributionBarContainer: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    borderRadius: 4,
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
});