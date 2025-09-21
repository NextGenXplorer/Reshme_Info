import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Alert,
  Animated,
  Easing,
  Dimensions,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { db, COLLECTIONS } from './firebase.config';
import { CocoonPrice } from './types';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import './i18n';

const { width, height } = Dimensions.get('window');

export default function App() {
  const { t, i18n } = useTranslation();
  const [prices, setPrices] = useState<CocoonPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<CocoonPrice[]>([]);
  const [selectedBreed, setSelectedBreed] = useState<string>('all');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const animatedValues = useRef<Animated.Value[]>([]).current;
  const headerAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const breeds = ['all', 'CB', 'BV'];
  const markets = ['all', 'Ramanagara', 'Kollegala', 'Kanakapura', 'Siddalagatta', 'Kolar'];

  const fetchPrices = async () => {
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
      Alert.alert('Error', 'Failed to fetch cocoon prices');
      console.error('Error fetching prices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    Animated.parallel([
      Animated.timing(headerAnimation, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 1000,
        delay: 400,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();

    // Sync with i18n language changes
    const handleLanguageChange = (lang: string) => {
      setCurrentLanguage(lang);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  const switchLanguage = (lang: string) => {
    if (lang !== currentLanguage) {
      setCurrentLanguage(lang);
      i18n.changeLanguage(lang);

      Animated.sequence([
        Animated.timing(slideAnimation, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnimation, {
          toValue: 1,
          tension: 200,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

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

    setFilteredPrices(filtered);
    animateCards(filtered);
  }, [selectedBreed, selectedMarket, prices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPrices();
  };

  const SkeletonLoader = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((item) => (
        <Animated.View key={item} style={styles.skeletonCard}>
          <LinearGradient
            colors={['#f0f0f0', '#e0e0e0', '#f0f0f0']}
            style={styles.skeletonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.skeletonContent}>
              <View style={styles.skeletonHeader}>
                <View style={styles.skeletonAvatar} />
                <View style={styles.skeletonTextLines}>
                  <View style={styles.skeletonLine} />
                  <View style={styles.skeletonLineSmall} />
                </View>
              </View>
              <View style={styles.skeletonPrice} />
              <View style={styles.skeletonStats}>
                <View style={styles.skeletonStat} />
                <View style={styles.skeletonStat} />
                <View style={styles.skeletonStat} />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      ))}
    </View>
  );

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
        <LinearGradient
          colors={['#667eea', '#764ba2', '#f093fb']}
          style={styles.ultraModernFilterGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {icon && <Ionicons name={icon as any} size={16} color="#FFFFFF" style={{ marginRight: 6 }} />}
          <Text style={styles.ultraModernFilterTextSelected}>{title}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.ultraModernFilterContent}>
          {icon && <Ionicons name={icon as any} size={16} color="#6B7280" style={{ marginRight: 6 }} />}
          <Text style={styles.ultraModernFilterText}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const LanguageSwitcher = () => (
    <View style={styles.ultraModernLanguageSwitcher}>
      <TouchableOpacity
        style={[
          styles.ultraModernLanguageButton,
          currentLanguage === 'en' && styles.ultraModernLanguageButtonActive,
        ]}
        onPress={() => {
          setCurrentLanguage('en');
          i18n.changeLanguage('en');
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.ultraModernLanguageText,
            currentLanguage === 'en' && styles.ultraModernLanguageTextActive,
          ]}
        >
          EN
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.ultraModernLanguageButton,
          currentLanguage === 'kn' && styles.ultraModernLanguageButtonActive,
        ]}
        onPress={() => {
          setCurrentLanguage('kn');
          i18n.changeLanguage('kn');
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.ultraModernLanguageText,
            currentLanguage === 'kn' && styles.ultraModernLanguageTextActive,
          ]}
        >
          KN
        </Text>
      </TouchableOpacity>
    </View>
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
                  <Text style={styles.ultraModernBreedText}>{item.breed}</Text>
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
                  <Text style={styles.ultraModernMarketText}>{item.market}</Text>
                </View>
              </View>
            </View>

            {/* Price showcase */}
            <View style={styles.priceShowcase}>
              <View style={styles.priceShowcaseGradient}>
                <Text style={styles.priceLabel}>{t('current')}</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <Text style={styles.ultraModernPrice}>{item.pricePerKg}</Text>
                  <Text style={styles.priceUnit}>/kg</Text>
                </View>
              </View>
            </View>

            {/* Stats section */}
            <View style={styles.statsSection}>
              <View style={styles.statCard}>
                <Ionicons name="trending-down" size={14} color="#EF4444" />
                <Text style={styles.statValue}>₹{item.minPrice}</Text>
                <Text style={styles.statLabel}>{t('min')}</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="analytics" size={14} color="#6366F1" />
                <Text style={styles.statValue}>₹{item.avgPrice}</Text>
                <Text style={styles.statLabel}>{t('avg')}</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="trending-up" size={14} color="#10B981" />
                <Text style={styles.statValue}>₹{item.maxPrice}</Text>
                <Text style={styles.statLabel}>{t('max')}</Text>
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
                  source={require('./assets/IMG-20250920-WA0022.jpg')}
                  style={styles.loadingLogoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.ultraModernLoadingText}>{t('loading')}</Text>
            <Text style={styles.ultraModernLoadingSubtext}>Fetching latest market prices...</Text>
          </View>
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.ultraModernContainer}>
      {/* Header */}
      <View style={styles.ultraModernHeader}>
        <View style={styles.ultraModernHeaderGradient}>
          <View style={styles.ultraModernHeaderContent}>
            <View style={styles.headerTop}>
              <View style={styles.titleContainer}>
                <View style={styles.titleIconContainer}>
                  <Image
                    source={require('./assets/IMG-20250920-WA0022.jpg')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.titleTextContainer}>
                  <Text style={styles.ultraModernTitle}>{t('cocoonPrices')}</Text>
                  <Text style={styles.ultraModernSubtitle}>{t('liveMarketRates')}</Text>
                </View>
              </View>
              <LanguageSwitcher />
            </View>
          </View>
        </View>
      </View>

      {/* Filter section */}
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
                    title={item}
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
                    title={item}
                    isSelected={selectedMarket === item}
                    onPress={() => setSelectedMarket(item)}
                    icon={item === 'all' ? 'grid' : 'location'}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </View>

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

      <StatusBar style="dark" />
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

  // Skeleton Loader
  skeletonContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
  },
  skeletonCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
  },
  skeletonGradient: {
    padding: 24,
  },
  skeletonContent: {
    gap: 16,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d1d5db',
  },
  skeletonTextLines: {
    marginLeft: 16,
    flex: 1,
  },
  skeletonLine: {
    height: 16,
    backgroundColor: '#d1d5db',
    borderRadius: 8,
    marginBottom: 8,
    width: '70%',
  },
  skeletonLineSmall: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    width: '40%',
  },
  skeletonPrice: {
    height: 40,
    backgroundColor: '#d1d5db',
    borderRadius: 20,
    width: '60%',
    alignSelf: 'center',
  },
  skeletonStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonStat: {
    height: 60,
    width: '30%',
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
  },

  // Header
  ultraModernHeader: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  ultraModernHeaderGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  ultraModernHeaderContent: {
    gap: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  ultraModernTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  ultraModernSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },

  // Language Switcher
  ultraModernLanguageSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 2,
  },
  ultraModernLanguageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ultraModernLanguageButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ultraModernLanguageText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  ultraModernLanguageTextActive: {
    color: '#111827',
    fontWeight: '700',
  },

  // Filter Section
  ultraModernFilterSection: {
    marginHorizontal: 20,
    marginTop: 0,
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

  // Price Showcase
  priceShowcase: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priceShowcaseGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginRight: 2,
  },
  ultraModernPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  priceUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
  },

  // Stats Section
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
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
});