import AsyncStorage from '@react-native-async-storage/async-storage';
import { CocoonPrice } from '../types';

// Cache keys
const CACHE_KEYS = {
  HOME_PRICES: '@home_prices_cache',
  MARKET_PRICES: '@market_prices_cache',
  STATS_PRICES: '@stats_prices_cache',
  LAST_UPDATE: '@cache_last_update',
};

// Cache expiry time (24 hours in milliseconds)
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000;

export interface CachedData {
  data: CocoonPrice[];
  timestamp: number;
}

/**
 * Save data to cache with timestamp
 */
export const saveToCache = async (key: string, data: CocoonPrice[]): Promise<void> => {
  try {
    const cachedData: CachedData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(cachedData));
    await AsyncStorage.setItem(CACHE_KEYS.LAST_UPDATE, Date.now().toString());
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
};

/**
 * Load data from cache
 */
export const loadFromCache = async (key: string): Promise<CachedData | null> => {
  try {
    const cachedString = await AsyncStorage.getItem(key);
    if (!cachedString) {
      return null;
    }

    const cachedData: CachedData = JSON.parse(cachedString);

    // Convert timestamp strings back to Date objects
    cachedData.data = cachedData.data.map(price => ({
      ...price,
      lastUpdated: new Date(price.lastUpdated),
      expiresAt: price.expiresAt ? new Date(price.expiresAt) : null,
    }));

    return cachedData;
  } catch (error) {
    console.error('Error loading from cache:', error);
    return null;
  }
};

/**
 * Check if cache is still valid (not expired)
 */
export const isCacheValid = (cachedData: CachedData | null): boolean => {
  if (!cachedData) {
    return false;
  }

  const now = Date.now();
  const cacheAge = now - cachedData.timestamp;

  return cacheAge < CACHE_EXPIRY_TIME;
};

/**
 * Get cache age in human-readable format
 */
export const getCacheAge = (cachedData: CachedData | null): string => {
  if (!cachedData) {
    return 'Never';
  }

  const now = Date.now();
  const ageInMs = now - cachedData.timestamp;
  const ageInMinutes = Math.floor(ageInMs / (1000 * 60));
  const ageInHours = Math.floor(ageInMs / (1000 * 60 * 60));
  const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));

  if (ageInMinutes < 1) {
    return 'Just now';
  } else if (ageInMinutes < 60) {
    return `${ageInMinutes} minute${ageInMinutes > 1 ? 's' : ''} ago`;
  } else if (ageInHours < 24) {
    return `${ageInHours} hour${ageInHours > 1 ? 's' : ''} ago`;
  } else {
    return `${ageInDays} day${ageInDays > 1 ? 's' : ''} ago`;
  }
};

/**
 * Clear all cache
 */
export const clearAllCache = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      CACHE_KEYS.HOME_PRICES,
      CACHE_KEYS.MARKET_PRICES,
      CACHE_KEYS.STATS_PRICES,
      CACHE_KEYS.LAST_UPDATE,
    ]);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

/**
 * Clear specific cache
 */
export const clearCache = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

export { CACHE_KEYS };
