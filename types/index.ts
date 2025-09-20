export interface CocoonPrice {
  id: string;
  breed: 'CB' | 'BV';
  market: string;
  pricePerKg: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  lastUpdated: Date;
  quality: 'A' | 'B' | 'C';
}

export interface Market {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
}

export interface Breed {
  id: string;
  name: string;
  description: string;
  category: 'CB' | 'BV';
}

export interface PriceStatistics {
  breed: 'CB' | 'BV';
  market: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  priceCount: number;
  lastUpdated: Date;
}