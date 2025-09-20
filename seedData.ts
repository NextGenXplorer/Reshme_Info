import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase.config';

const sampleCocoonPrices = [
  {
    breed: 'mulberry',
    market: 'Mumbai',
    pricePerKg: 550,
    minPrice: 520,
    maxPrice: 580,
    avgPrice: 555,
    quality: 'A',
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'mulberry',
    market: 'Bangalore',
    pricePerKg: 540,
    minPrice: 510,
    maxPrice: 570,
    avgPrice: 545,
    quality: 'A',
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'tasar',
    market: 'Ramanagara',
    pricePerKg: 480,
    minPrice: 450,
    maxPrice: 510,
    avgPrice: 485,
    quality: 'B',
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'eri',
    market: 'Mysore',
    pricePerKg: 420,
    minPrice: 400,
    maxPrice: 450,
    avgPrice: 425,
    quality: 'B',
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'muga',
    market: 'Mumbai',
    pricePerKg: 650,
    minPrice: 620,
    maxPrice: 680,
    avgPrice: 655,
    quality: 'A',
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'mulberry',
    market: 'Ramanagara',
    pricePerKg: 535,
    minPrice: 505,
    maxPrice: 565,
    avgPrice: 540,
    quality: 'A',
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'tasar',
    market: 'Bangalore',
    pricePerKg: 475,
    minPrice: 445,
    maxPrice: 505,
    avgPrice: 480,
    quality: 'B',
    lastUpdated: Timestamp.now(),
  },
  {
    breed: 'eri',
    market: 'Mumbai',
    pricePerKg: 415,
    minPrice: 395,
    maxPrice: 445,
    avgPrice: 420,
    quality: 'C',
    lastUpdated: Timestamp.now(),
  }
];

export const seedCocoonPrices = async () => {
  try {
    console.log('Seeding cocoon prices...');

    for (const priceData of sampleCocoonPrices) {
      await addDoc(collection(db, 'cocoonPrices'), priceData);
      console.log(`Added price for ${priceData.breed} in ${priceData.market}`);
    }

    console.log('Successfully seeded all cocoon prices!');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

// Uncomment the line below to run the seeding when you import this file
// seedCocoonPrices();