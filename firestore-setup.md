# Firebase Firestore Setup Guide

## Collections Structure

### 1. `cocoonPrices` Collection
**Purpose**: Store current and historical cocoon prices per kg

```javascript
{
  id: "auto-generated-id",
  breed: "mulberry",           // string: 'mulberry', 'tasar', 'eri', 'muga'
  market: "Mumbai",            // string: Market name
  pricePerKg: 550,            // number: Current price per kg in INR
  minPrice: 520,              // number: Minimum price in the period
  maxPrice: 580,              // number: Maximum price in the period
  avgPrice: 555,              // number: Average price in the period
  quality: "A",               // string: 'A', 'B', 'C' (quality grade)
  lastUpdated: Timestamp,     // timestamp: When price was last updated
  source: "market_admin",     // string: Who/what updated the price
  verified: true,             // boolean: If price is verified
  location: {                 // object: Detailed location info
    state: "Maharashtra",
    district: "Mumbai",
    pincode: "400001"
  },
  priceHistory: [             // array: Recent price changes
    {
      price: 545,
      date: Timestamp,
      source: "daily_update"
    }
  ]
}
```

### 2. `markets` Collection
**Purpose**: Store market information and metadata

```javascript
{
  id: "mumbai_market_001",
  name: "Mumbai Central Market",    // string: Market display name
  location: {                      // object: Location details
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    latitude: 19.0760,
    longitude: 72.8777,
    address: "Mumbai Central Market, Mumbai"
  },
  isActive: true,                  // boolean: If market is currently active
  marketType: "wholesale",         // string: 'wholesale', 'retail', 'auction'
  operatingHours: {               // object: Market operating schedule
    openTime: "06:00",
    closeTime: "18:00",
    workingDays: ["mon", "tue", "wed", "thu", "fri", "sat"]
  },
  contactInfo: {                  // object: Contact details
    phone: "+91-9876543210",
    email: "mumbaimarket@email.com",
    website: "https://mumbaimarket.com"
  },
  supportedBreeds: [              // array: Breeds available in this market
    "mulberry", "tasar", "eri", "muga"
  ],
  lastUpdated: Timestamp,
  createdAt: Timestamp
}
```

### 3. `breeds` Collection
**Purpose**: Store cocoon breed information and characteristics

```javascript
{
  id: "mulberry_001",
  name: "Mulberry",               // string: Breed name
  scientificName: "Bombyx mori",  // string: Scientific name
  category: "mulberry",           // string: 'mulberry', 'tasar', 'eri', 'muga'
  description: "Most common silk producing silkworm", // string
  characteristics: {              // object: Breed characteristics
    color: "white",
    size: "medium",
    quality: "high",
    production: "year-round"
  },
  averagePrice: {                 // object: Historical average pricing
    min: 400,
    max: 600,
    avg: 500
  },
  productionAreas: [              // array: Where this breed is produced
    "Karnataka", "Tamil Nadu", "Andhra Pradesh"
  ],
  seasonality: {                  // object: Production seasons
    peak: ["March", "April", "October", "November"],
    low: ["June", "July", "August"]
  },
  isActive: true,
  lastUpdated: Timestamp,
  createdAt: Timestamp
}
```

### 4. `priceAlerts` Collection
**Purpose**: Store user price alert preferences

```javascript
{
  id: "user_alert_001",
  userId: "user_123",             // string: User identifier
  breed: "mulberry",              // string: Breed to monitor
  market: "Mumbai",               // string: Market to monitor
  alertType: "price_drop",        // string: 'price_drop', 'price_rise', 'threshold'
  threshold: 500,                 // number: Price threshold for alert
  isActive: true,                 // boolean: If alert is active
  notificationMethod: "email",    // string: 'email', 'sms', 'push'
  createdAt: Timestamp,
  lastTriggered: Timestamp
}
```

### 5. `dailySummaries` Collection
**Purpose**: Store daily price summaries for analytics

```javascript
{
  id: "2024-01-15_mulberry_mumbai",
  date: "2024-01-15",            // string: Date in YYYY-MM-DD format
  breed: "mulberry",             // string: Breed
  market: "Mumbai",              // string: Market
  summary: {                     // object: Daily statistics
    openingPrice: 540,
    closingPrice: 550,
    highPrice: 560,
    lowPrice: 535,
    avgPrice: 548,
    volume: 1000,               // kg traded
    transactions: 25
  },
  priceMovement: {               // object: Price change analysis
    change: 10,                 // difference from previous day
    changePercent: 1.85,        // percentage change
    trend: "upward"             // 'upward', 'downward', 'stable'
  },
  createdAt: Timestamp
}
```

## Firestore Security Rules

Create these rules in Firebase Console > Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Cocoon Prices - Read access for all, write for authenticated users only
    match /cocoonPrices/{priceId} {
      allow read: if true;  // Public read access for price information
      allow write: if request.auth != null  // Only authenticated users can write
        && request.auth.token.role in ['admin', 'market_manager', 'price_updater'];
    }

    // Markets - Read access for all, write for admins only
    match /markets/{marketId} {
      allow read: if true;  // Public read access
      allow write: if request.auth != null
        && request.auth.token.role in ['admin', 'market_manager'];
    }

    // Breeds - Read access for all, write for admins only
    match /breeds/{breedId} {
      allow read: if true;  // Public read access
      allow write: if request.auth != null
        && request.auth.token.role in ['admin'];
    }

    // Price Alerts - User can only access their own alerts
    match /priceAlerts/{alertId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.userId;
    }

    // Daily Summaries - Read access for all, write for system only
    match /dailySummaries/{summaryId} {
      allow read: if true;  // Public read access
      allow write: if request.auth != null
        && request.auth.token.role in ['admin', 'system'];
    }

    // Default rule - deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Firestore Indexes

Create these composite indexes in Firebase Console > Firestore Database > Indexes:

### Collection: `cocoonPrices`
1. **Index for breed and market filtering:**
   - breed (Ascending)
   - market (Ascending)
   - lastUpdated (Descending)

2. **Index for price queries:**
   - breed (Ascending)
   - pricePerKg (Ascending)
   - lastUpdated (Descending)

3. **Index for market-specific queries:**
   - market (Ascending)
   - lastUpdated (Descending)
   - verified (Ascending)

### Collection: `dailySummaries`
1. **Index for date-based queries:**
   - date (Descending)
   - breed (Ascending)
   - market (Ascending)

2. **Index for trend analysis:**
   - breed (Ascending)
   - date (Descending)
   - summary.avgPrice (Ascending)

## Database Setup Commands

### Using Firebase CLI:
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firestore in your project
firebase init firestore

# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

### Manual Setup in Console:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Firestore Database
4. Create the collections manually using the structure above
5. Set up security rules in the Rules tab
6. Create indexes in the Indexes tab

## Data Validation Rules

```javascript
// Validation functions to include in security rules
function isValidPrice(price) {
  return price is number && price > 0 && price < 10000;
}

function isValidBreed(breed) {
  return breed in ['mulberry', 'tasar', 'eri', 'muga'];
}

function isValidQuality(quality) {
  return quality in ['A', 'B', 'C'];
}

function isValidMarket(market) {
  return market is string && market.size() > 0 && market.size() < 100;
}
```