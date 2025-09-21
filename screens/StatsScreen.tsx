import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase.config';
import { CocoonPrice } from '../types';

const { width } = Dimensions.get('window');

export default function StatsScreen() {
  const { t } = useTranslation();
  const [prices, setPrices] = useState<CocoonPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  useEffect(() => {
    fetchStatsData();
  }, []);

  const fetchStatsData = async () => {
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
      console.error('Error fetching stats data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (prices.length === 0) {
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

    const avgPrice = Math.round(prices.reduce((sum, price) => sum + price.avgPrice, 0) / prices.length);
    const highestPrice = Math.max(...prices.map(p => p.maxPrice));
    const lowestPrice = Math.min(...prices.map(p => p.minPrice));
    const totalMarkets = new Set(prices.map(p => p.market)).size;
    const totalBreeds = new Set(prices.map(p => p.breed)).size;
    const priceRange = highestPrice - lowestPrice;

    // Find market with highest average price
    const marketPrices: { [key: string]: number[] } = {};
    prices.forEach(price => {
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
      totalListings: prices.length,
      avgPrice,
      highestPrice,
      lowestPrice,
      totalMarkets,
      totalBreeds,
      priceRange,
      marketLeader,
    };
  };

  const getMarketDistribution = () => {
    const distribution: { [key: string]: number } = {};
    prices.forEach(price => {
      distribution[price.market] = (distribution[price.market] || 0) + 1;
    });
    return Object.entries(distribution)
      .map(([market, count]) => ({ market, count, percentage: (count / prices.length) * 100 }))
      .sort((a, b) => b.count - a.count);
  };

  const getBreedDistribution = () => {
    const distribution: { [key: string]: number } = {};
    prices.forEach(price => {
      distribution[price.breed] = (distribution[price.breed] || 0) + 1;
    });
    return Object.entries(distribution)
      .map(([breed, count]) => ({ breed, count, percentage: (count / prices.length) * 100 }))
      .sort((a, b) => b.count - a.count);
  };

  const stats = calculateStats();
  const marketDistribution = getMarketDistribution();
  const breedDistribution = getBreedDistribution();

  const StatCard = ({ title, value, subtitle, icon, color, trend }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: string;
    color: string;
    trend?: 'up' | 'down' | 'stable';
  }) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        {trend && (
          <View style={styles.trendContainer}>
            <Ionicons
              name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
              size={16}
              color={trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#6B7280'}
            />
          </View>
        )}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );

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

  const PeriodSelector = () => (
    <View style={styles.periodSelector}>
      {['today', 'week', 'month'].map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.periodButtonTextActive
          ]}>
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
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
              <Text style={styles.title}>Market Statistics</Text>
              <Text style={styles.subtitle}>Real-time market analytics</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <PeriodSelector />

        {/* Key Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Listings"
            value={stats.totalListings}
            subtitle="Active price entries"
            icon="list"
            color="#3B82F6"
            trend="up"
          />
          <StatCard
            title="Average Price"
            value={`₹${stats.avgPrice}`}
            subtitle="Per kilogram"
            icon="analytics"
            color="#10B981"
            trend="stable"
          />
          <StatCard
            title="Highest Price"
            value={`₹${stats.highestPrice}`}
            subtitle="Peak market rate"
            icon="trending-up"
            color="#F59E0B"
            trend="up"
          />
          <StatCard
            title="Lowest Price"
            value={`₹${stats.lowestPrice}`}
            subtitle="Minimum market rate"
            icon="trending-down"
            color="#EF4444"
            trend="down"
          />
        </View>

        {/* Market Overview */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Market Overview</Text>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewNumber}>{stats.totalMarkets}</Text>
              <Text style={styles.overviewLabel}>Active Markets</Text>
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewNumber}>{stats.totalBreeds}</Text>
              <Text style={styles.overviewLabel}>Breed Types</Text>
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewNumber}>₹{stats.priceRange}</Text>
              <Text style={styles.overviewLabel}>Price Range</Text>
            </View>
            <View style={styles.overviewCard}>
              <Text style={styles.overviewNumber}>{stats.marketLeader}</Text>
              <Text style={styles.overviewLabel}>Top Market</Text>
            </View>
          </View>
        </View>

        {/* Market Distribution */}
        <View style={styles.distributionSection}>
          <Text style={styles.sectionTitle}>Market Distribution</Text>
          <Text style={styles.sectionSubtitle}>Listing distribution across markets</Text>
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

        {/* Breed Distribution */}
        <View style={styles.distributionSection}>
          <Text style={styles.sectionTitle}>Breed Distribution</Text>
          <Text style={styles.sectionSubtitle}>Cocoon breed type distribution</Text>
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

        {/* Insights */}
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>Market Insights</Text>
          <View style={styles.insightCard}>
            <Ionicons name="bulb" size={24} color="#F59E0B" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Price Stability</Text>
              <Text style={styles.insightText}>
                Market shows stable pricing with ₹{stats.priceRange} range between highest and lowest prices.
              </Text>
            </View>
          </View>
          <View style={styles.insightCard}>
            <Ionicons name="trending-up" size={24} color="#10B981" />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Market Leader</Text>
              <Text style={styles.insightText}>
                {stats.marketLeader} leads with the highest average pricing in the region.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Period Selector
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginTop: 20,
    marginBottom: 24,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#111827',
    fontWeight: '700',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
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
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overviewCard: {
    width: (width - 60) / 2,
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
  overviewLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },

  // Distribution Section
  distributionSection: {
    marginBottom: 32,
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

  // Insights Section
  insightsSection: {
    marginBottom: 40,
  },
  insightCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});