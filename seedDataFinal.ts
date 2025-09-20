import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase.config';

// Sample Cocoon Prices Data - CB and BV breeds with Karnataka markets
const sampleCocoonPrices = [
  {
    breed: 'CB',
    market: 'Ramanagara',
    pricePerKg: 550,
    minPrice: 520,
    maxPrice: 580,
    avgPrice: 555,
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
    breed: 'CB',
    market: 'Kollegala',
    pricePerKg: 540,
    minPrice: 510,
    maxPrice: 570,
    avgPrice: 545,
    quality: 'A',
    source: 'daily_update',
    verified: true,
    location: {
      state: 'Karnataka',
      district: 'Chamarajanagar',
      pincode: '571440'
    },
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'BV',
    market: 'Kanakapura',
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
      pincode: '562117'
    },
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'BV',
    market: 'Siddalagatta',
    pricePerKg: 420,
    minPrice: 400,
    maxPrice: 450,
    avgPrice: 425,
    quality: 'B',
    source: 'daily_update',
    verified: true,
    location: {
      state: 'Karnataka',
      district: 'Chikkaballapur',
      pincode: '562105'
    },
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'CB',
    market: 'Kollara',
    pricePerKg: 535,
    minPrice: 505,
    maxPrice: 565,
    avgPrice: 540,
    quality: 'A',
    source: 'market_admin',
    verified: true,
    location: {
      state: 'Karnataka',
      district: 'Tumkur',
      pincode: '572138'
    },
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'BV',
    market: 'Ramanagara',
    pricePerKg: 475,
    minPrice: 445,
    maxPrice: 505,
    avgPrice: 480,
    quality: 'B',
    source: 'daily_update',
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
    market: 'Kollegala',
    pricePerKg: 415,
    minPrice: 395,
    maxPrice: 445,
    avgPrice: 420,
    quality: 'C',
    source: 'daily_update',
    verified: true,
    location: {
      state: 'Karnataka',
      district: 'Chamarajanagar',
      pincode: '571440'
    },
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'CB',
    market: 'Kanakapura',
    pricePerKg: 565,
    minPrice: 535,
    maxPrice: 595,
    avgPrice: 570,
    quality: 'A',
    source: 'market_admin',
    verified: true,
    location: {
      state: 'Karnataka',
      district: 'Ramanagara',
      pincode: '562117'
    },
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'CB',
    market: 'Siddalagatta',
    pricePerKg: 525,
    minPrice: 495,
    maxPrice: 555,
    avgPrice: 530,
    quality: 'A',
    source: 'market_admin',
    verified: true,
    location: {
      state: 'Karnataka',
      district: 'Chikkaballapur',
      pincode: '562105'
    },
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'BV',
    market: 'Kollara',
    pricePerKg: 445,
    minPrice: 415,
    maxPrice: 475,
    avgPrice: 450,
    quality: 'B',
    source: 'daily_update',
    verified: true,
    location: {
      state: 'Karnataka',
      district: 'Tumkur',
      pincode: '572138'
    },
    lastUpdated: Timestamp.now(),
  }
];

// Sample Markets Data - Karnataka Cocoon Markets
const sampleMarkets = [
  {
    name: 'Ramanagara Cocoon Market',
    location: {
      city: 'Ramanagara',
      state: 'Karnataka',
      country: 'India',
      latitude: 12.7243,
      longitude: 77.2831,
      address: 'Cocoon Market, Ramanagara, Karnataka'
    },
    isActive: true,
    marketType: 'auction',
    operatingHours: {
      openTime: '08:00',
      closeTime: '16:00',
      workingDays: ['tue', 'thu', 'sat']
    },
    contactInfo: {
      phone: '+91-9876543210',
      email: 'ramanagaramarket@email.com'
    },
    supportedBreeds: ['CB', 'BV'],
    lastUpdated: Timestamp.now(),
    createdAt: Timestamp.now()
  },
  {
    name: 'Kollegala Silk Market',
    location: {
      city: 'Kollegala',
      state: 'Karnataka',
      country: 'India',
      latitude: 12.1519,
      longitude: 77.1055,
      address: 'Silk Market, Kollegala, Chamarajanagar District, Karnataka'
    },
    isActive: true,
    marketType: 'wholesale',
    operatingHours: {
      openTime: '07:00',
      closeTime: '18:00',
      workingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    },
    contactInfo: {
      phone: '+91-9876543211',
      email: 'kollegalamarket@email.com'
    },
    supportedBreeds: ['CB', 'BV'],
    lastUpdated: Timestamp.now(),
    createdAt: Timestamp.now()
  },
  {
    name: 'Kanakapura Cocoon Exchange',
    location: {
      city: 'Kanakapura',
      state: 'Karnataka',
      country: 'India',
      latitude: 12.5490,
      longitude: 77.4180,
      address: 'Cocoon Exchange, Kanakapura, Ramanagara District, Karnataka'
    },
    isActive: true,
    marketType: 'auction',
    operatingHours: {
      openTime: '08:30',
      closeTime: '15:30',
      workingDays: ['mon', 'wed', 'fri']
    },
    contactInfo: {
      phone: '+91-9876543212',
      email: 'kanakapuramarket@email.com'
    },
    supportedBreeds: ['CB', 'BV'],
    lastUpdated: Timestamp.now(),
    createdAt: Timestamp.now()
  },
  {
    name: 'Siddalagatta Silk Center',
    location: {
      city: 'Siddalagatta',
      state: 'Karnataka',
      country: 'India',
      latitude: 13.3947,
      longitude: 77.8677,
      address: 'Silk Center, Siddalagatta, Chikkaballapur District, Karnataka'
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
      email: 'siddalagattamarket@email.com'
    },
    supportedBreeds: ['CB', 'BV'],
    lastUpdated: Timestamp.now(),
    createdAt: Timestamp.now()
  },
  {
    name: 'Kollara Cocoon Mart',
    location: {
      city: 'Kollara',
      state: 'Karnataka',
      country: 'India',
      latitude: 13.2846,
      longitude: 77.0420,
      address: 'Cocoon Mart, Kollara, Tumkur District, Karnataka'
    },
    isActive: true,
    marketType: 'wholesale',
    operatingHours: {
      openTime: '08:00',
      closeTime: '17:00',
      workingDays: ['tue', 'thu', 'sat']
    },
    contactInfo: {
      phone: '+91-9876543214',
      email: 'kollaramarket@email.com'
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
    description: 'Cross breed variety with improved disease resistance and higher yield, commonly used in Karnataka silk production',
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
    productionAreas: ['Ramanagara', 'Kanakapura', 'Kollegala', 'Siddalagatta', 'Kollara'],
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
    description: 'Pure bivoltine variety producing superior quality silk with finer denier, preferred for high-grade silk production',
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
    productionAreas: ['Ramanagara', 'Kanakapura', 'Kollegala', 'Siddalagatta', 'Kollara'],
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
    console.log('🌱 Seeding CB and BV cocoon prices for Karnataka markets...');

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
    console.log('🌱 Seeding Karnataka markets...');

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
    console.log('🚀 Starting Karnataka cocoon market data seeding...');

    await seedBreeds();
    await seedMarkets();
    await seedCocoonPrices();

    console.log('🎉 All Karnataka market data seeded successfully!');
    console.log('📱 Your Karnataka cocoon price app is ready to use!');
    console.log('🏪 Markets: Ramanagara, Kollegala, Kanakapura, Siddalagatta, Kollara');
    console.log('🐛 Breeds: CB (Cross Breed), BV (Bivoltine)');
  } catch (error) {
    console.error('💥 Error during data seeding:', error);
  }
};

// Uncomment the line below to run complete seeding when you import this file
// seedAllData();