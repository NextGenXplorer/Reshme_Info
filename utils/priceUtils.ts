import { CocoonPrice, PriceStatistics } from '../types';

export const calculatePriceStatistics = (prices: CocoonPrice[]): PriceStatistics[] => {
  const stats: { [key: string]: PriceStatistics } = {};

  prices.forEach(price => {
    const key = `${price.breed}-${price.market}`;

    if (!stats[key]) {
      stats[key] = {
        breed: price.breed,
        market: price.market,
        minPrice: price.pricePerKg,
        maxPrice: price.pricePerKg,
        avgPrice: price.pricePerKg,
        priceCount: 1,
        lastUpdated: price.lastUpdated
      };
    } else {
      const stat = stats[key];
      stat.minPrice = Math.min(stat.minPrice, price.pricePerKg);
      stat.maxPrice = Math.max(stat.maxPrice, price.pricePerKg);
      stat.avgPrice = (stat.avgPrice * stat.priceCount + price.pricePerKg) / (stat.priceCount + 1);
      stat.priceCount += 1;
      stat.lastUpdated = price.lastUpdated > stat.lastUpdated ? price.lastUpdated : stat.lastUpdated;
    }
  });

  return Object.values(stats);
};

export const formatPrice = (price: number): string => {
  return `₹${price.toFixed(0)}`;
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const getPriceChange = (currentPrice: number, previousPrice: number): {
  change: number;
  percentage: number;
  isPositive: boolean;
} => {
  const change = currentPrice - previousPrice;
  const percentage = (change / previousPrice) * 100;

  return {
    change,
    percentage,
    isPositive: change >= 0
  };
};

export const filterPricesByBreed = (prices: CocoonPrice[], breed: string): CocoonPrice[] => {
  if (breed === 'all') return prices;
  return prices.filter(price => price.breed === breed);
};

export const filterPricesByMarket = (prices: CocoonPrice[], market: string): CocoonPrice[] => {
  if (market === 'all') return prices;
  return prices.filter(price => price.market === market);
};