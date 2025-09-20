import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase.config';

/**
 * Adds a collection of documents to a specified collection in Firestore.
 * @param collectionName The name of the collection to add the documents to.
 * @param data An array of objects to be added as documents.
 */
export const addCollection = async (collectionName: string, data: any[]) => {
  try {
    console.log(`Adding data to ${collectionName} collection...`);

    for (const item of data) {
      await addDoc(collection(db, collectionName), item);
      console.log(`Added document to ${collectionName}`);
    }

    console.log(`Successfully added all data to ${collectionName}!`);
  } catch (error) {
    console.error('Error adding collection:', error);
  }
};

/*
// Example usage:
import { Timestamp } from 'firebase/firestore';

const sampleMarketData = [
  {
    name: 'Ramanagara',
    location: 'Karnataka',
    lastUpdated: Timestamp.now(),
  },
  {
    name: 'Kollegala',
    location: 'Karnataka',
    lastUpdated: Timestamp.now(),
  }
];

addCollection('markets', sampleMarketData);
*/
