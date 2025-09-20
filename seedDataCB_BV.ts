import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase.config';

// Sample Cocoon Prices Data - CB and BV breeds only
const sampleCocoonPrices = [
  {
    breed: 'CB',
    market: 'Mumbai',
    pricePerKg: 550,
    minPrice: 520,
    maxPrice: 580,
    avgPrice: 555,
    quality: 'A',
    source: 'market_admin',
    verified: true,
    location: {
      state: 'Maharashtra',
      district: 'Mumbai',
      pincode: '400001'
    },
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'CB',
    market: 'Bangalore',
    pricePerKg: 540,
    minPrice: 510,
    maxPrice: 570,
    avgPrice: 545,
    quality: 'A',
    source: 'daily_update',
    verified: true,
    location: {
      state: 'Karnataka',
      district: 'Bangalore',
      pincode: '560001'
    },
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'BV',
    market: 'Ramanagara',
    pricePerKg: 480,
    minPrice: 450,
    maxPrice: 510,
    avgPrice: 485,
    quality: 'B',
    source: 'market_admin',
    verified: true,
    location: {
      state: 'Karnataka',
      district: 'Ramanagara',
      pincode: '562159'
    },
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'BV',
    market: 'Mysore',
    pricePerKg: 420,
    minPrice: 400,
    maxPrice: 450,
    avgPrice: 425,
    quality: 'B',
    source: 'daily_update',
    verified: true,
    location: {
      state: 'Karnataka',
      district: 'Mysore',
      pincode: '570001'
    },
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'CB',
    market: 'Ramanagara',
    pricePerKg: 535,
    minPrice: 505,
    maxPrice: 565,
    avgPrice: 540,
    quality: 'A',
    source: 'market_admin',
    verified: true,
    location: {
      state: 'Karnataka',
      district: 'Ramanagara',
      pincode: '562159'
    },
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'BV',
    market: 'Bangalore',
    pricePerKg: 475,
    minPrice: 445,
    maxPrice: 505,
    avgPrice: 480,
    quality: 'B',
    source: 'daily_update',
    verified: true,
    location: {
      state: 'Karnataka',
      district: 'Bangalore',
      pincode: '560001'
    },
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'BV',
    market: 'Mumbai',
    pricePerKg: 415,
    minPrice: 395,
    maxPrice: 445,
    avgPrice: 420,
    quality: 'C',
    source: 'daily_update',
    verified: true,
    location: {
      state: 'Maharashtra',
      district: 'Mumbai',
      pincode: '400001'
    },
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'CB',
    market: 'Mysore',
    pricePerKg: 565,
    minPrice: 535,
    maxPrice: 595,
    avgPrice: 570,
    quality: 'A',
    source: 'market_admin',
    verified: true,
    location: {
      state: 'Karnataka',
      district: 'Mysore',
      pincode: '570001'
    },
    lastUpdated: Timestamp.now(),
  }
];

// Sample Markets Data
const sampleMarkets = [
  {
    name: 'Mumbai Central Market',
    location: {
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      latitude: 19.0760,
      longitude: 72.8777,
      address: 'Mumbai Central Market, Mumbai'
    },
    isActive: true,
    marketType: 'wholesale',
    operatingHours: {
      openTime: '06:00',
      closeTime: '18:00',
      workingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    },
    contactInfo: {
      phone: '+91-9876543210',
      email: 'mumbaimarket@email.com'
    },
    supportedBreeds: ['CB', 'BV'],
    lastUpdated: Timestamp.now(),
    createdAt: Timestamp.now()
  },
  {
    name: 'Bangalore Silk Market',
    location: {
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      latitude: 12.9716,
      longitude: 77.5946,
      address: 'Silk Market, Bangalore'
    },
    isActive: true,
    marketType: 'wholesale',
    operatingHours: {
      openTime: '07:00',
      closeTime: '19:00',
      workingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    },
    contactInfo: {
      phone: '+91-9876543211',
      email: 'bangaloremarket@email.com'
    },
    supportedBreeds: ['CB', 'BV'],
    lastUpdated: Timestamp.now(),
    createdAt: Timestamp.now()
  },
  {
    name: 'Ramanagara Cocoon Market',
    location: {
      city: 'Ramanagara',
      state: 'Karnataka',
      country: 'India',
      latitude: 12.7243,
      longitude: 77.2831,
      address: 'Cocoon Market, Ramanagara'
    },
    isActive: true,
    marketType: 'auction',
    operatingHours: {
      openTime: '08:00',
      closeTime: '16:00',
      workingDays: ['tue', 'thu', 'sat']
    },
    contactInfo: {
      phone: '+91-9876543212',
      email: 'ramanagaramarket@email.com'
    },
    supportedBreeds: ['CB', 'BV'],
    lastUpdated: Timestamp.now(),
    createdAt: Timestamp.now()
  },
  {
    name: 'Mysore Silk Exchange',
    location: {
      city: 'Mysore',
      state: 'Karnataka',
      country: 'India',
      latitude: 12.2958,
      longitude: 76.6394,
      address: 'Silk Exchange, Mysore'
    },
    isActive: true,
    marketType: 'retail',
    operatingHours: {
      openTime: '09:00',
      closeTime: '17:00',
      workingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    },
    contactInfo: {
      phone: '+91-9876543213',
      email: 'mysoremarket@email.com'
    },
    supportedBreeds: ['CB', 'BV'],
    lastUpdated: Timestamp.now(),
    createdAt: Timestamp.now()
  }
];

// Sample Breeds Data - CB and BV only
const sampleBreeds = [
  {
    name: 'Cross Breed (CB)',
    scientificName: 'Bombyx mori hybrid',
    category: 'CB',
    description: 'Cross breed variety with improved disease resistance and yield',
    characteristics: {
      color: 'white to cream',
      size: 'medium to large',
      quality: 'high',
      production: 'year-round'
    },
    averagePrice: {
      min: 500,
      max: 600,
      avg: 550
    },
    productionAreas: ['Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Maharashtra'],
    seasonality: {
      peak: ['March', 'April', 'October', 'November'],
      low: ['June', 'July', 'August']
    },
    isActive: true,
    lastUpdated: Timestamp.now(),
    createdAt: Timestamp.now()
  },
  {
    name: 'Bivoltine (BV)',
    scientificName: 'Bombyx mori bivoltine',
    category: 'BV',
    description: 'Pure bivoltine variety producing superior quality silk with finer denier',
    characteristics: {
      color: 'pure white',
      size: 'medium',
      quality: 'premium',
      production: 'seasonal'
    },
    averagePrice: {
      min: 400,
      max: 520,
      avg: 460
    },
    productionAreas: ['Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'West Bengal'],
    seasonality: {
      peak: ['February', 'March', 'September', 'October'],
      low: ['June', 'July', 'August', 'December']
    },
    isActive: true,
    lastUpdated: Timestamp.now(),
    createdAt: Timestamp.now()
  }
];

export const seedCocoonPrices = async () => {
  try {
    console.log('🌱 Seeding CB and BV cocoon prices...');

    for (const priceData of sampleCocoonPrices) {
      await addDoc(collection(db, COLLECTIONS.COCOON_PRICES), priceData);
      console.log(`📈 Added price for ${priceData.breed} in ${priceData.market}`);
    }

    console.log('✅ Successfully seeded all cocoon prices!');
  } catch (error) {
    console.error('❌ Error seeding cocoon prices:', error);
  }
};

export const seedMarkets = async () => {
  try {
    console.log('🌱 Seeding markets...');

    for (const marketData of sampleMarkets) {
      await addDoc(collection(db, COLLECTIONS.MARKETS), marketData);
      console.log(`🏪 Added market: ${marketData.name}`);
    }

    console.log('✅ Successfully seeded all markets!');
  } catch (error) {
    console.error('❌ Error seeding markets:', error);
  }
};

export const seedBreeds = async () => {
  try {
    console.log('🌱 Seeding CB and BV breeds...');

    for (const breedData of sampleBreeds) {
      await addDoc(collection(db, COLLECTIONS.BREEDS), breedData);
      console.log(`🐛 Added breed: ${breedData.name}`);
    }

    console.log('✅ Successfully seeded all breeds!');
  } catch (error) {
    console.error('❌ Error seeding breeds:', error);
  }
};

export const seedAllData = async () => {
  try {
    console.log('🚀 Starting CB and BV data seeding...');

    await seedBreeds();
    await seedMarkets();
    await seedCocoonPrices();

    console.log('🎉 All CB and BV data seeded successfully!');
    console.log('📱 Your cocoon price app is ready to use!');
  } catch (error) {
    console.error('💥 Error during data seeding:', error);
  }
};

// Uncomment the line below to run complete seeding when you import this file
// seedAllData();