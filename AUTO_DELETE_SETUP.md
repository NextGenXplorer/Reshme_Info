# Automatic Data Deletion - 7 Days Setup (Free Solution)

## How It Works

Your app now automatically **hides expired data** after 7 days using client-side filtering. No Cloud Functions or paid Firebase plan required!

### Technical Implementation

1. **When Admin Saves Data** (AdminPriceFormScreen.tsx:126-136):
   ```javascript
   const now = Timestamp.now();
   const sevenDaysFromNow = Timestamp.fromDate(
     new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // 7 days
   );

   priceData = {
     ...formData,
     expiresAt: sevenDaysFromNow  // Expires after 7 days
   }
   ```

2. **When App Fetches Data** (HomeScreen.tsx:45-102):
   ```javascript
   const now = Timestamp.now();

   q = query(
     collection(db, COLLECTIONS.COCOON_PRICES),
     where('expiresAt', '>', now),  // Only get non-expired data
     orderBy('expiresAt', 'asc'),
     orderBy('lastUpdated', 'desc')
   );
   ```

3. **Result**:
   - Data older than 7 days is **never displayed** to users
   - Data technically stays in Firebase (you can manually delete if needed)
   - **Completely FREE** - no Cloud Functions, no paid plan

---

## What Happens to Old Data?

### Option 1: Automatic Hiding (Current Setup) ✅
- **What**: Expired data is filtered out in all app queries
- **User sees**: Only data less than 7 days old
- **Firebase storage**: Old data remains but is never fetched
- **Cost**: FREE

### Option 2: Manual Cleanup (Optional)
Add admin button to permanently delete expired data from Firebase.

---

## Firestore Index Setup (Required)

### Step 1: Deploy Indexes to Firebase

Your `firestore.indexes.json` file is already updated. Deploy it:

```bash
firebase deploy --only firestore:indexes
```

**Or manually in Firebase Console**:

1. Go to: https://console.firebase.google.com/
2. Select your project
3. Go to **Firestore Database** → **Indexes** tab
4. Click **Add Index**
5. Add these two indexes:

#### Index 1:
- Collection: `cocoonPrices`
- Fields:
  - `expiresAt` (Ascending)
  - `lastUpdated` (Descending)
- Query scope: Collection

#### Index 2:
- Collection: `cocoonPrices`
- Fields:
  - `expiresAt` (Ascending)
  - `lastUpdated` (Ascending)
- Query scope: Collection

### Step 2: Wait for Index Build

- Firebase will show "Building..." status
- Usually takes 5-10 minutes
- App will show errors until indexes are ready

---

## Testing the Auto-Delete

### 1. Test with Current Data

```javascript
// In Firebase Console → Firestore
// Find any document in cocoonPrices collection
// Manually change expiresAt to yesterday's date

expiresAt: Timestamp (yesterday's date)
```

**Expected**: That document won't appear in the app anymore

### 2. Test with New Data

1. Open admin panel
2. Add new price
3. Check Firebase → that document has `expiresAt` = 7 days from now
4. In app → data appears normally
5. After 7 days → data automatically disappears

---

## Timeline

### Day 0 (Today)
- Admin adds price: `₹450/kg`
- `expiresAt`: Day 7

### Day 1-6
- Price visible in app ✅
- Users can see all data

### Day 7+
- Price hidden in app ❌
- Data filtered out automatically
- Users only see fresh data

---

## Benefits of This Approach

✅ **Completely FREE** - No Cloud Functions needed
✅ **Automatic** - No manual intervention required
✅ **Instant** - Works immediately after index build
✅ **Reliable** - Client-side filtering always works
✅ **Transparent** - Users only see current prices

❌ **Old data remains in Firebase** (use manual cleanup if needed)

---

## Optional: Manual Cleanup Function

If you want to permanently delete expired data from Firebase:

### Add to AdminDashboardScreen.tsx:

```javascript
const cleanupExpiredData = async () => {
  try {
    const now = Timestamp.now();
    const q = query(
      collection(db, COLLECTIONS.COCOON_PRICES),
      where('expiresAt', '<=', now)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      Alert.alert('No Expired Data', 'There is no expired data to clean up.');
      return;
    }

    const batch = writeBatch(db);
    querySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    Alert.alert(
      'Cleanup Complete',
      `Deleted ${querySnapshot.size} expired records from Firebase.`
    );
  } catch (error) {
    console.error('Error cleaning up expired data:', error);
    Alert.alert('Error', 'Failed to clean up expired data.');
  }
};
```

### Add Button in Admin Panel:
```jsx
<TouchableOpacity
  style={styles.cleanupButton}
  onPress={cleanupExpiredData}
>
  <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
  <Text style={styles.cleanupButtonText}>
    Clean Up Expired Data
  </Text>
</TouchableOpacity>
```

---

## Troubleshooting

### Issue: "Index not found" errors

**Solution**:
1. Check if indexes are deployed: Firebase Console → Firestore → Indexes
2. Wait for "Building..." to finish (5-10 min)
3. Redeploy if needed: `firebase deploy --only firestore:indexes`

### Issue: Old data still showing

**Solution**:
1. Check `expiresAt` field exists on documents
2. Verify queries include `where('expiresAt', '>', now)`
3. Check timezone - Firebase uses UTC

### Issue: No data showing at all

**Solution**:
1. Check all documents have `expiresAt` field
2. Old documents might not have this field
3. Update old documents manually or wait for admin to re-save

---

## Migration for Existing Data

If you have old data without `expiresAt` field:

### Option 1: Automatic Migration on Update
- When admin edits old prices, `expiresAt` is added automatically
- Happens naturally over time

### Option 2: Manual Migration Script

Run this once in Firebase Console or Node.js:

```javascript
const migrateOldData = async () => {
  const q = query(collection(db, 'cocoonPrices'));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);

  snapshot.docs.forEach((doc) => {
    const data = doc.data();

    // Only update if expiresAt doesn't exist
    if (!data.expiresAt) {
      const lastUpdated = data.lastUpdated.toDate();
      const expiresAt = new Date(lastUpdated.getTime() + 7 * 24 * 60 * 60 * 1000);

      batch.update(doc.ref, {
        expiresAt: Timestamp.fromDate(expiresAt)
      });
    }
  });

  await batch.commit();
  console.log('Migration complete!');
};
```

---

## Summary

**What You Have Now:**
✅ Data automatically hidden after 7 days
✅ Completely free solution
✅ Works on all screens (Home, Market, Stats, Admin)
✅ Firestore indexes configured

**Next Steps:**
1. Deploy indexes: `firebase deploy --only firestore:indexes`
2. Wait 5-10 minutes for indexes to build
3. Test by adding new price in admin panel
4. Optional: Add manual cleanup button for permanent deletion

---

## Quick Checklist

- [x] `expiresAt` field added to price documents
- [x] HomeScreen queries updated to filter expired data
- [x] Firestore indexes configured
- [ ] Deploy indexes to Firebase
- [ ] Wait for index build to complete
- [ ] Test with new data
- [ ] (Optional) Add manual cleanup button

---

**Congratulations! Your data now automatically expires after 7 days. Completely free!** 🎉
