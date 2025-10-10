export interface CocoonPrice {
  id: string;
  breed: 'CB' | 'BV';
  market: string;
  pricePerKg: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  lastUpdated: Date;
  expiresAt: Date;
  quality: 'A' | 'B' | 'C';
  lotNumber: number;
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
export interface AdminUser {
  username: string;
  role: 'super_admin' | 'market_admin';
  market: string;
  isAuthenticated: boolean;
}

export interface AdminSession {
  user: AdminUser | null;
  loginTime: Date | null;
  expiresAt: Date | null;
}

export interface PriceFormData {
  breed: 'CB' | 'BV';
  market: string;
  pricePerKg: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  quality: 'A' | 'B' | 'C';
  lotNumber: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  targetAudience: 'all' | 'market_specific';
  targetMarket?: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
}

export interface NotificationFormData {
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  targetAudience: 'all' | 'market_specific';
  targetMarket?: string;
  expiryDays: number;
}
