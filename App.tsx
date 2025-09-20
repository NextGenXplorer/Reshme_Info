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

  const renderPriceCard = ({ item, index }: { item: CocoonPrice; index: number }) => {
    const cardStyle = {
      transform: [
        {
          translateY: animatedValues[index] ? animatedValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [150, 0],
          }) : 0,
        },
        {
          scale: animatedValues[index] ? animatedValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1],
          }) : 1,
        },
      ],
      opacity: animatedValues[index] || 1,
    };

    return (
      <Animated.View style={[styles.ultraModernCard, cardStyle]}>
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC', '#FFFFFF']}
          style={styles.ultraModernCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.ultraModernCardContent}>
            {/* Header with breed and quality */}
            <View style={styles.ultraModernCardHeader}>
              <View style={styles.breedSection}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.breedIconContainer}
                >
                  <Ionicons name="leaf" size={24} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.breedInfo}>
                  <Text style={styles.ultraModernBreedText}>{item.breed}</Text>
                  <View style={styles.qualityBadgeContainer}>
                    <LinearGradient
                      colors={['#F59E0B', '#D97706']}
                      style={styles.ultraModernQualityBadge}
                    >
                      <Ionicons name="star" size={12} color="#FFFFFF" />
                      <Text style={styles.ultraModernQualityText}>
                        {t('grade')} {item.quality}
                      </Text>
                    </LinearGradient>
                  </View>
                </View>
              </View>

              <View style={styles.marketBadgeContainer}>
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  style={styles.ultraModernMarketBadge}
                >
                  <Ionicons name="location" size={14} color="#FFFFFF" />
                  <Text style={styles.ultraModernMarketText}>{item.market}</Text>
                </LinearGradient>
              </View>
            </View>

            {/* Price showcase */}
            <View style={styles.priceShowcase}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.priceShowcaseGradient}
              >
                <Text style={styles.priceLabel}>{t('current')}</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <Text style={styles.ultraModernPrice}>{item.pricePerKg}</Text>
                  <Text style={styles.priceUnit}>/kg</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Stats section */}
            <View style={styles.statsSection}>
              <View style={styles.statCard}>
                <Ionicons name="trending-down" size={16} color="#EF4444" />
                <Text style={styles.statValue}>₹{item.minPrice}</Text>
                <Text style={styles.statLabel}>{t('min')}</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="analytics" size={16} color="#6366F1" />
                <Text style={styles.statValue}>₹{item.avgPrice}</Text>
                <Text style={styles.statLabel}>{t('avg')}</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="trending-up" size={16} color="#10B981" />
                <Text style={styles.statValue}>₹{item.maxPrice}</Text>
                <Text style={styles.statLabel}>{t('max')}</Text>
              </View>
            </View>

            {/* Footer with update time */}
            <View style={styles.ultraModernFooter}>
              <View style={styles.updateTimestamp}>
                <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                <Text style={styles.ultraModernUpdateText}>
                  {t('updated')}: {item.lastUpdated.toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.ultraModernContainer}>
        <LinearGradient
          colors={['#667eea', '#764ba2', '#f093fb']}
          style={styles.ultraModernLoadingContainer}
        >
          <SkeletonLoader />
          <View style={styles.loadingContent}>
            <Animated.View
              style={[
                styles.loadingSpinner,
                {
                  transform: [
                    {
                      rotate: headerAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F0F9FF']}
                style={styles.loadingSpinnerGradient}
              >
                <Ionicons name="trending-up" size={32} color="#667eea" />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.ultraModernLoadingText}>{t('loading')}</Text>
            <Text style={styles.ultraModernLoadingSubtext}>Fetching latest market prices...</Text>
          </View>
        </LinearGradient>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.ultraModernContainer}>
      {/* Header with parallax effect */}
      <Animated.View
        style={[
          styles.ultraModernHeader,
          {
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, -20],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2', '#f093fb']}
          style={styles.ultraModernHeaderGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.ultraModernHeaderContent}>
            <View style={styles.headerTop}>
              <View style={styles.titleContainer}>
                <LinearGradient
                  colors={['#FFFFFF', '#F0F9FF']}
                  style={styles.titleIconContainer}
                >
                  <Ionicons name="trending-up" size={32} color="#667eea" />
                </LinearGradient>
                <View style={styles.titleTextContainer}>
                  <Text style={styles.ultraModernTitle}>{t('cocoonPrices')}</Text>
                  <Text style={styles.ultraModernSubtitle}>{t('liveMarketRates')}</Text>
                </View>
              </View>
              <LanguageSwitcher />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Modern filter section */}
      <Animated.View
        style={[
          styles.ultraModernFilterSection,
          {
            transform: [
              {
                translateY: slideAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
            opacity: slideAnimation,
          },
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.ultraModernFilterCard}
        >
          <View style={styles.filterContent}>
            <View style={styles.filterCategory}>
              <View style={styles.filterCategoryHeader}>
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  style={styles.filterCategoryIcon}
                >
                  <Ionicons name="options" size={16} color="#FFFFFF" />
                </LinearGradient>
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
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.filterCategoryIcon}
                >
                  <Ionicons name="location" size={16} color="#FFFFFF" />
                </LinearGradient>
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
        </LinearGradient>
      </Animated.View>

      {/* Enhanced list with parallax */}
      <Animated.FlatList
        data={filteredPrices}
        keyExtractor={(item) => item.id}
        renderItem={renderPriceCard}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea', '#764ba2', '#f093fb']}
            tintColor="#667eea"
            progressBackgroundColor="#FFFFFF"
          />
        }
        contentContainerStyle={styles.ultraModernListContainer}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      />

      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ultraModernContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },

  // Loading Screen
  ultraModernLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingContent: {
    alignItems: 'center',
    marginTop: 40,
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingSpinnerGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ultraModernLoadingText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  ultraModernLoadingSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
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
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  ultraModernHeaderGradient: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingVertical: 20,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  titleTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  ultraModernTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  ultraModernSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // Language Switcher
  ultraModernLanguageSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 28,
    padding: 4,
    backdropFilter: 'blur(20px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ultraModernLanguageButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  ultraModernLanguageButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1.05 }],
  },
  ultraModernLanguageText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ultraModernLanguageTextActive: {
    color: '#667eea',
    textShadowColor: 'transparent',
    fontWeight: '800',
  },

  // Filter Section
  ultraModernFilterSection: {
    marginHorizontal: 24,
    marginTop: -20,
    marginBottom: 24,
  },
  ultraModernFilterCard: {
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  filterContent: {
    gap: 24,
  },
  filterCategory: {
    gap: 16,
  },
  filterCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterCategoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ultraModernFilterTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  ultraModernFilterList: {
    paddingVertical: 8,
    gap: 12,
  },

  // Filter Buttons
  ultraModernFilter: {
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  ultraModernFilterSelected: {
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  ultraModernFilterGradient: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ultraModernFilterContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ultraModernFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  ultraModernFilterTextSelected: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },

  // Price Cards
  ultraModernCard: {
    borderRadius: 28,
    marginBottom: 24,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
  },
  ultraModernCardGradient: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  ultraModernCardContent: {
    padding: 28,
    gap: 20,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  breedInfo: {
    marginLeft: 16,
    flex: 1,
  },
  ultraModernBreedText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1F2937',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  qualityBadgeContainer: {
    alignSelf: 'flex-start',
  },
  ultraModernQualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ultraModernQualityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  marketBadgeContainer: {
    alignSelf: 'flex-start',
  },
  ultraModernMarketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ultraModernMarketText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Price Showcase
  priceShowcase: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  priceShowcaseGradient: {
    paddingVertical: 24,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginRight: 4,
  },
  ultraModernPrice: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  priceUnit: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
  },

  // Stats Section
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Footer
  ultraModernFooter: {
    alignItems: 'flex-end',
  },
  updateTimestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  ultraModernUpdateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.3,
  },

  // List Container
  ultraModernListContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
});