import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, orderBy, query, where, deleteDoc, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase.config';
import { AdminUser, CocoonPrice } from '../types';
import { adminAuth } from '../utils/adminAuth';
import Header from '../components/Header';

const { width } = Dimensions.get('window');

interface AdminDashboardScreenProps {
  user: AdminUser;
  onLogout: () => void;
  onAddPrice: () => void;
  onEditPrice: (price: CocoonPrice) => void;
  onManageNotifications: () => void;
  onAIExtract: () => void;
  onManageContent?: () => void;
}

interface DashboardStats {
  totalPrices: number;
  todayUpdates: number;
  avgPrice: number;
  marketsCount: number;
}

export default function AdminDashboardScreen({
  user,
  onLogout,
  onAddPrice,
  onEditPrice,
  onManageNotifications,
  onAIExtract,
  onManageContent,
}: AdminDashboardScreenProps) {
  const { t } = useTranslation();
  const [prices, setPrices] = useState<CocoonPrice[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPrices: 0,
    todayUpdates: 0,
    avgPrice: 0,
    marketsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchPrices(), calculateStats()]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrices = async () => {
    try {
      let q;

      if (user.role === 'super_admin') {
        // Super admin sees all prices
        q = query(collection(db, COLLECTIONS.COCOON_PRICES), orderBy('lastUpdated', 'desc'));
      } else {
        // Market admin sees only their market prices
        const markets = adminAuth.getAvailableMarkets(user);
        q = query(
          collection(db, COLLECTIONS.COCOON_PRICES),
          where('market', 'in', markets),
          orderBy('lastUpdated', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const pricesData: CocoonPrice[] = [];
      const now = new Date();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const expiresAt = data.expiresAt ? data.expiresAt.toDate() : null;

        // Admin sees all data (including expired) to manage it
        // But we add expiresAt for display/cleanup purposes
        pricesData.push({
          id: doc.id,
          ...data,
          lastUpdated: data.lastUpdated.toDate(),
          expiresAt: expiresAt,
          isExpired: expiresAt ? expiresAt <= now : false,
        } as CocoonPrice & { isExpired?: boolean });
      });

      setPrices(pricesData);
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  const calculateStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayUpdates = prices.filter(price =>
        price.lastUpdated >= today
      ).length;

      const totalPrices = prices.length;
      const avgPrice = prices.length > 0
        ? Math.round(prices.reduce((sum, price) => sum + price.avgPrice, 0) / prices.length)
        : 0;

      const markets = new Set(prices.map(price => price.market));
      const marketsCount = markets.size;

      setStats({
        totalPrices,
        todayUpdates,
        avgPrice,
        marketsCount,
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleDeletePrice = async (priceId: string, market: string) => {
    if (!adminAuth.hasMarketPermission(user, market)) {
      Alert.alert('Permission Denied', 'You do not have permission to delete prices for this market');
      return;
    }

    Alert.alert(
      'Delete Price Entry',
      'Are you sure you want to delete this price entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, COLLECTIONS.COCOON_PRICES, priceId));
              await fetchDashboardData();
              Alert.alert('Success', 'Price entry deleted successfully');
            } catch (error) {
              console.error('Error deleting price:', error);
              Alert.alert('Error', 'Failed to delete price entry');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'default',
          onPress: async () => {
            await adminAuth.logout();
            onLogout();
          },
        },
      ]
    );
  };

  const cleanupExpiredData = async () => {
    Alert.alert(
      'Clean Up Expired Data',
      'This will permanently delete all price entries older than 7 days from Firebase. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Expired',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const now = new Date();

              // Get all prices
              const q = query(collection(db, COLLECTIONS.COCOON_PRICES));
              const querySnapshot = await getDocs(q);

              const batch = writeBatch(db);
              let deletedCount = 0;

              querySnapshot.forEach((document) => {
                const data = document.data();
                const expiresAt = data.expiresAt ? data.expiresAt.toDate() : null;

                // Delete if expired
                if (expiresAt && expiresAt <= now) {
                  batch.delete(document.ref);
                  deletedCount++;
                }
              });

              if (deletedCount === 0) {
                Alert.alert(
                  'No Expired Data',
                  'There are no expired price entries to clean up.'
                );
              } else {
                await batch.commit();
                await fetchDashboardData();
                Alert.alert(
                  'Cleanup Complete',
                  `Successfully deleted ${deletedCount} expired price ${deletedCount === 1 ? 'entry' : 'entries'}.`
                );
              }
            } catch (error) {
              console.error('Error cleaning up expired data:', error);
              Alert.alert('Error', 'Failed to clean up expired data. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderPriceItem = ({ item }: { item: CocoonPrice }) => {
    const canEdit = adminAuth.hasMarketPermission(user, item.market);

    return (
      <View style={styles.priceCard}>
        <View style={styles.priceHeader}>
          <View style={styles.priceInfo}>
            <Text style={styles.priceMarket}>{item.market}</Text>
            <View style={styles.priceDetails}>
              <View style={[styles.breedBadge, {
                backgroundColor: item.breed === 'CB' ? '#3B82F615' : '#10B98115'
              }]}>
                <Text style={[styles.breedText, {
                  color: item.breed === 'CB' ? '#3B82F6' : '#10B981'
                }]}>
                  {item.breed}
                </Text>
              </View>
              <View style={[styles.qualityBadge, {
                backgroundColor: item.quality === 'A' ? '#10B98115' :
                               item.quality === 'B' ? '#F59E0B15' : '#EF444415'
              }]}>
                <Text style={[styles.qualityText, {
                  color: item.quality === 'A' ? '#10B981' :
                         item.quality === 'B' ? '#F59E0B' : '#EF4444'
                }]}>
                  Grade {item.quality}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.priceActions}>
            {canEdit && (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onEditPrice(item)}
                >
                  <Ionicons name="create-outline" size={20} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeletePrice(item.id, item.market)}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.priceBody}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Maximum Price:</Text>
            <Text style={styles.priceValue}>₹{item.maxPrice}/kg</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Average Price:</Text>
            <Text style={[styles.priceValue, styles.priceHighlight]}>₹{item.avgPrice}/kg</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Minimum Price:</Text>
            <Text style={styles.priceValue}>₹{item.minPrice}/kg</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Last Updated:</Text>
            <Text style={styles.priceDate}>
              {item.lastUpdated.toLocaleDateString('en-IN')} at{' '}
              {item.lastUpdated.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const StatCard = ({ icon, title, value, color }: {
    icon: string;
    title: string;
    value: string | number;
    color: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Dashboard"
        subtitle={undefined}
        leftComponent={
          <View style={styles.userInfo}>
            <View style={styles.roleContainer}>
              <View style={[styles.roleBadge, {
                backgroundColor: user.role === 'super_admin' ? '#3B82F615' : '#10B98115'
              }]}>
                <Text style={[styles.roleText, {
                  color: user.role === 'super_admin' ? '#3B82F6' : '#10B981'
                }]}>
                  {user.role === 'super_admin' ? 'Super Admin' : 'Market Admin'}
                </Text>
              </View>
              {user.market !== 'all' && (
                <Text style={styles.marketText}>• {user.market}</Text>
              )}
            </View>
          </View>
        }
        rightComponent={
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Statistics */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Dashboard Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="receipt-outline"
              title="Total Entries"
              value={stats.totalPrices}
              color="#3B82F6"
            />
            <StatCard
              icon="today-outline"
              title="Today's Updates"
              value={stats.todayUpdates}
              color="#10B981"
            />
            <StatCard
              icon="cash-outline"
              title="Avg Price"
              value={`₹${stats.avgPrice}`}
              color="#F59E0B"
            />
            <StatCard
              icon="location-outline"
              title="Markets"
              value={stats.marketsCount}
              color="#8B5CF6"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={onAIExtract}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="sparkles" size={28} color="#F59E0B" />
              </View>
              <Text style={styles.actionCardTitle}>AI Data Extract</Text>
              <Text style={styles.actionCardSubtitle}>Extract from text</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={onAddPrice}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="add-circle" size={28} color="#3B82F6" />
              </View>
              <Text style={styles.actionCardTitle}>Add New Price</Text>
              <Text style={styles.actionCardSubtitle}>Manual entry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleRefresh()}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="refresh" size={28} color="#10B981" />
              </View>
              <Text style={styles.actionCardTitle}>Refresh Data</Text>
              <Text style={styles.actionCardSubtitle}>Sync latest prices</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={onManageNotifications}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="notifications" size={28} color="#8B5CF6" />
              </View>
              <Text style={styles.actionCardTitle}>{t('sendNotification')}</Text>
              <Text style={styles.actionCardSubtitle}>{t('sendCustomNotification')}</Text>
            </TouchableOpacity>
            {onManageContent && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={onManageContent}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="leaf" size={28} color="#F59E0B" />
                </View>
                <Text style={styles.actionCardTitle}>{t('manageContent')}</Text>
                <Text style={styles.actionCardSubtitle}>{t('manageInfoContent')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionCard}
              onPress={cleanupExpiredData}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="trash" size={28} color="#EF4444" />
              </View>
              <Text style={styles.actionCardTitle}>Clean Up Old Data</Text>
              <Text style={styles.actionCardSubtitle}>Delete expired entries</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Price Entries */}
        <View style={styles.recentContainer}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Recent Price Entries</Text>
            <Text style={styles.recentCount}>{prices.length} entries</Text>
          </View>

          {prices.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Price Entries</Text>
              <Text style={styles.emptySubtitle}>
                Start by adding your first price entry
              </Text>
            </View>
          ) : (
            <FlatList
              data={prices.slice(0, 10)} // Show only recent 10 entries
              renderItem={renderPriceItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  userInfo: {
    gap: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  marketText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  welcomeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Statistics
  statsContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },

  // Quick Actions
  actionsContainer: {
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  actionCard: {
    width: (width - 56) / 2, // 2 columns with proper spacing
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionCardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Recent Entries
  recentContainer: {
    marginBottom: 24,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Price Cards
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  priceInfo: {
    flex: 1,
  },
  priceMarket: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  priceDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  breedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  breedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  qualityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  priceBody: {
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  priceHighlight: {
    color: '#3B82F6',
  },
  priceRange: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  priceDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});
