# Simple 7-Day Auto-Delete Setup

## How It Works (Simple & Free!)

Your app now has **automatic data expiration** after 7 days with **manual cleanup**.

### What Happens:

1. **Admin Adds Price** → Saves with `expiresAt` = today + 7 days
2. **App Shows Data** → Filters out expired data automatically (users never see old data)
3. **Admin Clicks Cleanup** → Permanently deletes expired data from Firebase

---

## ✅ Implementation Complete

### 1. Admin Saves Price (AdminPriceFormScreen.tsx)
```javascript
expiresAt: sevenDaysFromNow  // 7 days from now
```

### 2. App Filters Expired Data (HomeScreen.tsx)
```javascript
// Only show non-expired data
if (!expiresAt || expiresAt > now) {
  pricesData.push(item);
}
```

### 3. Admin Cleanup Button (AdminDashboardScreen.tsx)
**Location:** Admin Panel → Quick Actions → "Clean Up Old Data"

**What it does:**
- Compares `expiresAt` with current date
- Deletes all expired entries from Firebase
- Shows count of deleted entries

---

## 🎯 How to Use

### For Admin:

1. **Add prices normally** → They automatically get 7-day expiration
2. **Check dashboard** → See all current prices
3. **Click "Clean Up Old Data"** when you want to delete expired entries
4. **Confirm deletion** → Permanently removes old data from Firebase

### For Users:

- **See only fresh data** (less than 7 days old)
- **Never see expired prices** (automatically filtered)
- **No action needed** (works automatically)

---

## 📅 Timeline Example

### Day 0 (Today)
- Admin adds: Ramanagara CB price
- Firebase saves: `expiresAt` = Day 7
- User sees: ✅ Price visible

### Day 1-6
- User sees: ✅ Price visible
- No action needed

### Day 7
- User sees: ❌ Price hidden (expired)
- Firebase still has data (not deleted yet)

### Day 7+ (Admin cleanup)
- Admin clicks "Clean Up Old Data"
- Firebase: ✅ Data permanently deleted
- Storage freed up

---

## 🧪 Testing

### Test 1: Add New Price
1. Open admin panel
2. Add new price (any market/breed)
3. Check Firebase → should have `expiresAt` field
4. Check app → price should appear

### Test 2: Check Expiration Filtering
1. Go to Firebase Console
2. Find any document in `cocoonPrices`
3. Change `expiresAt` to yesterday's date
4. Refresh app → that price should disappear ✅

### Test 3: Manual Cleanup
1. Make some test data expired (change dates in Firebase)
2. Go to Admin Dashboard
3. Click "Clean Up Old Data"
4. Should show: "Successfully deleted X expired entries"
5. Check Firebase → expired data should be gone ✅

---

## 🔥 Benefits

✅ **100% FREE** - No Cloud Functions, no paid Firebase plan
✅ **Automatic Filtering** - Users never see expired data
✅ **Manual Control** - Admin decides when to delete from Firebase
✅ **Simple** - No complex setup, no indexes needed
✅ **Safe** - Confirmation dialog before deletion

---

## 🆚 vs Cloud Functions Approach

| Feature | Manual Cleanup (Current) | Cloud Functions |
|---------|-------------------------|-----------------|
| **Cost** | FREE ✅ | Requires Blaze Plan ($) |
| **Setup** | Done ✅ | Requires deployment |
| **Control** | Admin decides when | Automatic |
| **Firebase Storage** | Data removed on cleanup | Auto-removed |
| **User Experience** | Same (filtering works) | Same |

---

## 💾 Storage Management

### Firebase Storage:

**Before Cleanup:**
- Expired data exists but hidden from users
- Takes up Firebase storage quota

**After Cleanup:**
- Expired data permanently deleted
- Storage quota freed up

**Recommendation:**
- Run cleanup **weekly** or **monthly**
- Or when you see "No Expired Data" message stops appearing

---

## 🐛 Troubleshooting

### Issue: Old data still showing in app

**Solution:**
1. Check if document has `expiresAt` field in Firebase
2. Old documents (before update) might not have this field
3. Admin can edit old prices to add expiration

### Issue: "No Expired Data" message

**Solution:**
- This is good! No expired data to clean up
- Try again after more time passes

### Issue: Cleanup button not working

**Solution:**
1. Check admin is logged in
2. Check Firebase permissions
3. Check console for errors

---

## 📱 Production Checklist

- [x] `expiresAt` field added when saving prices
- [x] HomeScreen filters expired data
- [x] Cleanup button added to admin dashboard
- [x] Cleanup function deletes expired data
- [ ] Test with real data
- [ ] Build production APK with `google-services.json`
- [ ] Distribute APK to users

---

## 🚀 Next Steps

### 1. Test Everything
```bash
npm start
```
- Add test prices
- Change dates in Firebase to test expiration
- Click cleanup button

### 2. Build Production APK
```bash
eas build --platform android --profile production
```

### 3. Distribute
- Download APK from Expo
- Share with users
- Enjoy automatic expiration + manual cleanup!

---

## ✨ Summary

**What You Have:**
- ✅ Data expires after 7 days (hidden from users)
- ✅ Admin cleanup button (permanent deletion)
- ✅ Completely FREE solution
- ✅ Simple and effective

**No Need For:**
- ❌ Cloud Functions
- ❌ Complex Firestore indexes
- ❌ Paid Firebase plan
- ❌ Scheduled jobs

**Perfect balance of automation and control!** 🎉
