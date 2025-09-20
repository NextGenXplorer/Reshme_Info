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
  Alert
} from 'react-native';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase.config';
import { CocoonPrice } from './types';

export default function App() {
  const [prices, setPrices] = useState<CocoonPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<CocoonPrice[]>([]);
  const [selectedBreed, setSelectedBreed] = useState<string>('all');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const breeds = ['all', 'CB', 'BV'];
  const markets = ['all', 'Ramanagara', 'Kollegala', 'Kanakapura', 'Siddalagatta', 'Kollara'];

  const fetchPrices = async () => {
    try {
      const q = query(collection(db, COLLECTIONS.COCOON_PRICES), orderBy('lastUpdated', 'desc'));
      const querySnapshot = await getDocs(q);
      const pricesData: CocoonPrice[] = [];

      querySnapshot.forEach((doc) => {
        pricesData.push({
          id: doc.id,
          ...doc.data(),
          lastUpdated: doc.data().lastUpdated.toDate()
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
  }, []);

  useEffect(() => {
    let filtered = prices;

    if (selectedBreed !== 'all') {
      filtered = filtered.filter(price => price.breed === selectedBreed);
    }

    if (selectedMarket !== 'all') {
      filtered = filtered.filter(price => price.market === selectedMarket);
    }

    setFilteredPrices(filtered);
  }, [selectedBreed, selectedMarket, prices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPrices();
  };

  const renderPriceCard = ({ item }: { item: CocoonPrice }) => (
    <View style={styles.priceCard}>
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
    </View>
  );

  const FilterButton = ({ title, isSelected, onPress }: {
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
      <View style={styles.header}>
        <Text style={styles.title}>Cocoon Prices</Text>
        <Text style={styles.subtitle}>Live market rates per kg</Text>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Breed:</Text>
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

        <Text style={styles.filterTitle}>Market:</Text>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  },
  header: {
    backgroundColor: '#2e7d32',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#e8f5e8',
  },
  filterSection: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  filterList: {
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedFilter: {
    backgroundColor: '#2e7d32',
    borderColor: '#2e7d32',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
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
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    textTransform: 'capitalize',
  },
  qualityBadge: {
    backgroundColor: '#4caf50',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '500',
  },
  marketText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  priceStats: {
    alignItems: 'flex-end',
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  updatedText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
});
