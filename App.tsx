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
} from 'react-native';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { db, COLLECTIONS } from './firebase.config';
import { CocoonPrice } from './types';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import './i18n';

export default function App() {
  const { t, i18n } = useTranslation();
  const [prices, setPrices] = useState<CocoonPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<CocoonPrice[]>([]);
  const [selectedBreed, setSelectedBreed] = useState<string>('all');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const animatedValues = useRef<Animated.Value[]>([]).current;

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
  }, []);

  const animateCards = (itemsToAnimate: CocoonPrice[]) => {
    // Robust fix: Re-create the animated values array every time.
    // This is less performant but guarantees synchronization and prevents crashes.
    animatedValues.length = 0;
    itemsToAnimate.forEach(() => {
      animatedValues.push(new Animated.Value(0));
    });

    const animations = itemsToAnimate.map((_, i) => {
      return Animated.timing(animatedValues[i], {
        toValue: 1,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
        delay: i * 100,
      });
    });
    Animated.stagger(100, animations).start();
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

  const renderPriceCard = ({ item, index }: { item: CocoonPrice; index: number }) => {
    const cardStyle = {
      transform: [
        {
          translateY: animatedValues[index] ? animatedValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [100, 0],
          }) : 0,
        },
      ],
      opacity: animatedValues[index] ? animatedValues[index] : 1,
    };

    return (
      <Animated.View style={[styles.priceCard, cardStyle]}>
        <LinearGradient colors={['#FFFFFF', '#F0F4F8']} style={styles.cardGradient}>
          <View style={styles.cardHeader}>
            <Ionicons name="leaf-outline" size={24} color="#2E7D32" />
            <Text style={styles.breedText}>{item.breed}</Text>
            <Text style={styles.qualityBadge}>{t('grade')} {item.quality}</Text>
          </View>
          <View style={styles.marketContainer}>
            <Ionicons name="location-outline" size={20} color="#555" />
            <Text style={styles.marketText}>{item.market}</Text>
          </View>

          <View style={styles.priceRow}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>{t('current')}</Text>
              <Text style={styles.currentPrice}>₹{item.pricePerKg}/kg</Text>
            </View>
            <View style={styles.priceStats}>
              <Text style={styles.statText}>{t('min')}: ₹{item.minPrice}</Text>
              <Text style={styles.statText}>{t('max')}: ₹{item.maxPrice}</Text>
              <Text style={styles.statText}>{t('avg')}: ₹{item.avgPrice}</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Ionicons name="time-outline" size={14} color="#999" />
            <Text style={styles.updatedText}>
              {t('updated')}: {item.lastUpdated.toLocaleDateString()}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const FilterButton = ({
    title,
    isSelected,
    onPress,
  }: {
    title: string;
    isSelected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.filterButton, isSelected && styles.selectedFilter]}
      onPress={onPress}
    >
      <Text style={[styles.filterText, isSelected && styles.selectedFilterText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>{t('loading')}</Text>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.header}>
        <View style={styles.languageSwitcher}>
          <TouchableOpacity onPress={() => i18n.changeLanguage('en')}>
            <Text style={styles.languageText}>EN</Text>
          </TouchableOpacity>
          <Text style={styles.languageSeparator}>|</Text>
          <TouchableOpacity onPress={() => i18n.changeLanguage('kn')}>
            <Text style={styles.languageText}>KN</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{t('cocoonPrices')}</Text>
        <Text style={styles.subtitle}>{t('liveMarketRates')}</Text>
      </LinearGradient>

      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>{t('filterByBreed')}</Text>
        <FlatList
          horizontal
          data={breeds}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <FilterButton
              title={item}
              isSelected={selectedBreed === item}
              onPress={() => setSelectedBreed(item)}
            />
          )}
          showsHorizontalScrollIndicator={false}
          style={styles.filterList}
        />

        <Text style={styles.filterTitle}>{t('filterByMarket')}</Text>
        <FlatList
          horizontal
          data={markets}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <FilterButton
              title={item}
              isSelected={selectedMarket === item}
              onPress={() => setSelectedMarket(item)}
            />
          )}
          showsHorizontalScrollIndicator={false}
          style={styles.filterList}
        />
      </View>

      <FlatList
        data={filteredPrices}
        keyExtractor={(item) => item.id}
        renderItem={renderPriceCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 60,
    color: '#555',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 10,
  },
  languageSwitcher: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  languageText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  languageSeparator: {
    color: '#fff',
    marginHorizontal: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#E0F2F1',
  },
  filterSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 20,
    elevation: 5,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterList: {
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
  },
  selectedFilter: {
    backgroundColor: '#4CAF50',
    elevation: 2,
  },
  filterText: {
    fontSize: 14,
    color: '#333',
    textTransform: 'capitalize',
  },
  selectedFilterText: {
    color: '#fff',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  priceCard: {
    borderRadius: 20,
    marginBottom: 20,
    elevation: 5,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardGradient: {
    borderRadius: 20,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  breedText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 10,
    flex: 1,
  },
  qualityBadge: {
    backgroundColor: '#FFC107',
    color: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    fontSize: 12,
    fontWeight: '600',
  },
  marketContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  marketText: {
    fontSize: 18,
    color: '#555',
    marginLeft: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#777',
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  priceStats: {
    alignItems: 'flex-end',
  },
  statText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  updatedText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 5,
  },
});
