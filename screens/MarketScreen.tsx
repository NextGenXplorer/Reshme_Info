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

export default function MarketScreen() {
  const { t } = useTranslation();
  const [prices, setPrices] = useState<CocoonPrice[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchMarketData();
  }, []);

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
            <Text style={styles.marketPriceLabel}>Avg/kg</Text>
          </View>
        </View>

        <Text style={styles.marketDescription}>{market.description}</Text>

        <View style={styles.marketFooter}>
          <View style={styles.marketStat}>
            <Ionicons name="list" size={16} color="#6B7280" />
            <Text style={styles.marketStatText}>{stats.totalListings} listings</Text>
          </View>
          <View style={styles.marketStat}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.marketStatText}>
              {stats.lastUpdate ? stats.lastUpdate.toLocaleDateString() : 'No data'}
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
        <Text style={styles.overviewTitle}>Market Overview</Text>
        <View style={styles.overviewStats}>
          <View style={styles.overviewStat}>
            <Text style={styles.overviewNumber}>{totalMarkets}</Text>
            <Text style={styles.overviewLabel}>Active Markets</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewStat}>
            <Text style={styles.overviewNumber}>{totalListings}</Text>
            <Text style={styles.overviewLabel}>Total Listings</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewStat}>
            <Text style={styles.overviewNumber}>₹{avgPrice}</Text>
            <Text style={styles.overviewLabel}>Avg Price/kg</Text>
          </View>
        </View>
      </View>
    );
  };

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
              <Text style={styles.title}>Market Centers</Text>
              <Text style={styles.subtitle}>Silk cocoon trading hubs</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <OverviewCard />

        <View style={styles.marketsSection}>
          <Text style={styles.sectionTitle}>Trading Centers</Text>
          <Text style={styles.sectionSubtitle}>
            Explore major silk cocoon markets across Karnataka
          </Text>

          {markets.map((market, index) => (
            <MarketCard key={market.name} market={market} index={index} />
          ))}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Market Information</Text>
              <Text style={styles.infoText}>
                Prices are updated in real-time from verified market sources.
                All trading centers operate during standard business hours.
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
    fontSize: 18,
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