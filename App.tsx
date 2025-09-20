import React, { useState, useEffect } from 'react';
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

export default function App() {
  const [prices, setPrices] = useState<CocoonPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<CocoonPrice[]>([]);
  const [selectedBreed, setSelectedBreed] = useState<string>('all');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const animatedValue = new Animated.Value(0);

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
      setFilteredPrices(pricesData);
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
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    let filtered = prices;

    if (selectedBreed !== 'all') {
      filtered = filtered.filter((price) => price.breed === selectedBreed);
    }

    if (selectedMarket !== 'all') {
      filtered = filtered.filter((price) => price.market === selectedMarket);
    }

    setFilteredPrices(filtered);
  }, [selectedBreed, selectedMarket, prices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPrices();
  };

  const renderPriceCard = ({ item, index }: { item: CocoonPrice; index: number }) => {
    const cardStyle = {
      transform: [
        {
          translateY: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [100, 0],
          }),
        },
      ],
      opacity: animatedValue,
    };

    return (
      <Animated.View style={[styles.priceCard, cardStyle]}>
        <View style={styles.cardHeader}>
          <Text style={styles.breedText}>{item.breed}</Text>
          <Text style={styles.qualityBadge}>Grade {item.quality}</Text>
        </View>
        <Text style={styles.marketText}>{item.market}</Text>

        <View style={styles.priceRow}>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Current</Text>
            <Text style={styles.currentPrice}>₹{item.pricePerKg}/kg</Text>
          </View>
          <View style={styles.priceStats}>
            <Text style={styles.statText}>Min: ₹{item.minPrice}</Text>
            <Text style={styles.statText}>Max: ₹{item.maxPrice}</Text>
            <Text style={styles.statText}>Avg: ₹{item.avgPrice}</Text>
          </View>
        </View>

        <Text style={styles.updatedText}>
          Updated: {item.lastUpdated.toLocaleDateString()}
        </Text>
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
        <Text style={styles.loadingText}>Loading cocoon prices...</Text>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.header}>
        <Text style={styles.title}>Cocoon Prices</Text>
        <Text style={styles.subtitle}>Live market rates per kg</Text>
      </LinearGradient>

      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Filter by Breed:</Text>
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

        <Text style={styles.filterTitle}>Filter by Market:</Text>
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
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0F2F1',
  },
  filterSection: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  filterTitle: {
    fontSize: 16,
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breedText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    textTransform: 'capitalize',
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
  marketText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  priceStats: {
    alignItems: 'flex-end',
  },
  statText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  updatedText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
});
