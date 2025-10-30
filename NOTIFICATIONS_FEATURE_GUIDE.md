# Notifications Feature Guide

## Overview
The Notifications feature in ReshmeInfo allows users to stay informed about important updates, announcements, and market information directly within the app. Admins can create and manage notifications to communicate with all users or specific market audiences.

---

## 🎯 Features

### For Users

#### 📱 **Notification Center**
- Dedicated tab in bottom navigation with bell icon
- Clean, organized view of all active notifications
- Real-time updates with pull-to-refresh
- Multi-language support (English & Kannada)

#### 🔍 **Smart Filtering**
- Filter by priority: All, High, Medium, Low
- Color-coded priority indicators:
  - 🔴 **High**: Red (Urgent alerts)
  - 🟠 **Medium**: Orange (Important updates)
  - 🟢 **Low**: Green (General information)

#### 📊 **Statistics Overview**
- Total notification count
- High-priority notifications count
- Medium-priority notifications count
- Quick insights at a glance

#### 📍 **Market-Specific Notifications**
- See notifications relevant to specific markets
- Blue location tag for market-specific announcements
- General notifications for all users

#### ⏰ **Smart Timestamps**
- Relative time display: "Just now", "5 minutes ago", "2 hours ago"
- Automatic date formatting for older notifications
- Last update time clearly visible

---

### For Admins

#### ✍️ **Create Notifications**
Admins can create custom notifications through the Admin Panel with:
- **Title & Message**: Clear, concise communication
- **Priority Levels**: Low, Medium, High
- **Target Audience**: All users or specific market
- **Expiry Settings**: Auto-deletion after specified days
- **Rich Text Support**: Detailed information formatting

#### 📢 **Notification Management**
- View all active and expired notifications
- Delete old or irrelevant notifications
- Track who created each notification
- Monitor notification expiry dates

---

## 📸 User Interface

### Notification Card Layout
```
┌─────────────────────────────────────────┐
│ 🔴 HIGH              2 hours ago        │
│─────────────────────────────────────────│
│ Important Market Update                 │
│                                         │
│ Ramanagara market prices updated for    │
│ CB and BV grades. Check latest rates.  │
│                                         │
│ 📍 Ramanagara                           │
│                                         │
│ Expires on: Nov 15, 2025               │
└─────────────────────────────────────────┘
```

### Priority Indicators
- **Icon + Color Badge**: Visual priority identification
- **Border Accent**: Left border matches priority color
- **Filtered View**: Easy sorting by priority level

---

## 🚀 How to Use

### For Users

#### Accessing Notifications
1. Open ReshmeInfo app
2. Tap the **Notifications** tab (bell icon) in bottom navigation
3. View all active notifications

#### Filtering Notifications
1. Tap priority filter chips at the top: **All**, **High**, **Medium**, **Low**
2. View filtered results instantly
3. Tap **All** to reset filter

#### Refreshing Notifications
1. Pull down on the notifications list
2. Release to refresh
3. New notifications will appear automatically

#### Reading Notification Details
- **Title**: Bold, prominent heading
- **Message**: Full notification content
- **Priority Badge**: Top-left corner
- **Timestamp**: Top-right corner
- **Market Tag**: (If applicable) Shows target market
- **Expiry Date**: (If set) Shows when notification expires

---

### For Admins

#### Creating a Notification

1. **Login to Admin Panel**
   - Tap shield icon (🛡️) in About screen (development)
   - Enter admin credentials

2. **Navigate to Notifications**
   - From Admin Dashboard, tap "Manage Notifications"

3. **Fill Notification Form**
   ```
   Title: [Enter notification title]
   Message: [Enter detailed message]

   Priority: ○ Low  ○ Medium  ● High

   Target Audience:
   ○ All Users
   ● Specific Market → [Select Market ▾]

   Expiry: [7] days (0 for never)
   ```

4. **Send Notification**
   - Review notification preview
   - Tap "Send Notification"
   - Confirmation message appears
   - Notification instantly available to users

#### Managing Notifications

**View Active Notifications**
- See all currently active notifications
- Sorted by creation date (newest first)
- Check expiry dates and target audience

**Delete Notifications**
- Tap delete icon on any notification
- Confirm deletion in dialog
- Notification removed from all users

**Check Notification Details**
- View who created the notification
- See creation and expiry dates
- Identify target audience (All or Market-specific)

---

## 📋 Notification Types & Use Cases

### Priority Levels

#### 🔴 High Priority
**Use for:**
- Urgent market closures
- Emergency announcements
- Critical price changes
- Important regulatory updates
- Time-sensitive alerts

**Example:**
```
Title: Urgent: Market Closure
Message: Ramanagara market will be closed tomorrow
(Nov 10) due to state holiday. Normal operations
resume Nov 11.
Priority: High
Audience: Market-specific (Ramanagara)
```

#### 🟠 Medium Priority
**Use for:**
- Regular market updates
- New feature announcements
- Price trend alerts
- Scheduled maintenance notices
- Moderate importance updates

**Example:**
```
Title: Weekly Price Update
Message: CB grade cocoon prices increased by 5%
across all markets this week. BV prices remain
stable.
Priority: Medium
Audience: All Users
```

#### 🟢 Low Priority
**Use for:**
- General information
- Tips and guidelines
- Feature tutorials
- Seasonal greetings
- Non-urgent updates

**Example:**
```
Title: New App Feature
Message: You can now view historical price trends
in the Stats tab. Tap the chart icon to explore!
Priority: Low
Audience: All Users
```

---

## 🔔 Notification Best Practices

### For Admins

#### Writing Effective Notifications

**✅ DO:**
- Keep titles short (5-10 words)
- Write clear, actionable messages
- Include specific dates/times when relevant
- Use appropriate priority levels
- Set reasonable expiry dates
- Target specific markets when applicable

**❌ DON'T:**
- Send duplicate notifications
- Use ALL CAPS excessively
- Overuse high-priority alerts
- Include sensitive information
- Leave notifications expired indefinitely

#### Notification Frequency

**Recommended:**
- High Priority: Only when truly urgent (max 1-2 per week)
- Medium Priority: Regular updates (2-3 per week)
- Low Priority: Informational content (as needed)

**Avoid:**
- Notification spam (multiple per day)
- Irrelevant information
- Repetitive messages

---

## 🔒 Security & Privacy

### Data Protection
- ✅ Public read access (no authentication required)
- ✅ Admin-only write access (secured)
- ✅ Role-based permissions enforced
- ✅ Firestore security rules applied

### Notification Data Stored
```javascript
{
  id: "auto-generated",
  title: "Notification title",
  message: "Full message content",
  priority: "low|medium|high",
  targetAudience: "all|market_specific",
  targetMarket: "Market name (if specific)",
  createdBy: "admin_username",
  createdAt: "Timestamp",
  expiresAt: "Expiry timestamp or null",
  isActive: true
}
```

### Security Rules
```javascript
// Users can read all active notifications
allow read: if true;

// Only admins can create notifications
allow create: if isAdmin();

// Only super admins can update/delete
allow update, delete: if isSuperAdmin();
```

---

## 🌐 Multi-Language Support

### Supported Languages
- **English**: Default language
- **Kannada (ಕನ್ನಡ)**: Full localization

### Translated Elements
- Navigation labels
- Priority levels
- Filter chips
- Empty states
- Error messages
- Time stamps
- Button labels

### Language-Specific Content
Notification titles and messages are entered by admins and can be in either language based on target audience preferences.

---

## 🛠️ Technical Implementation

### Architecture
```
NotificationsScreen.tsx
├── Header Component
├── Filter Section (Horizontal scroll)
│   ├── All
│   ├── High
│   ├── Medium
│   └── Low
├── Statistics Card
│   ├── Total Count
│   ├── High Priority Count
│   └── Medium Priority Count
└── Notifications List (ScrollView)
    ├── Notification Cards
    │   ├── Priority Badge
    │   ├── Timestamp
    │   ├── Title
    │   ├── Message
    │   ├── Market Tag (optional)
    │   └── Expiry Date (optional)
    └── Ad Banner
```

### Data Flow
```
Firestore Database
       ↓
   (Query active notifications)
       ↓
NotificationsScreen
       ↓
   (Filter by priority)
       ↓
   Render Cards
       ↓
   User View
```

### Real-Time Updates
- **Pull-to-refresh**: Manual refresh trigger
- **Auto-sync**: Queries active notifications on mount
- **Expiry filtering**: Client-side filtering of expired items
- **Sorting**: Newest notifications first

---

## 🔧 Configuration

### Firebase Collections
**Collection Name**: `notifications`
**Document Structure**:
```typescript
interface Notification {
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
```

### App Configuration
**Navigation Tab Added**:
```typescript
<Tab.Screen
  name="Notifications"
  component={NotificationsScreen}
  options={{
    tabBarLabel: t('notifications'),
    tabBarIcon: 'notifications' | 'notifications-outline'
  }}
/>
```

---

## 📱 Screenshots & Examples

### Empty State
When no notifications are available:
```
        🔔
   (Bell Icon)

No Notifications
You're all caught up! Check back
later for updates and announcements.
```

### Active Notifications View
```
┌─ Statistics ─────────────────────┐
│  Total: 5  │  High: 2  │  Med: 3 │
└──────────────────────────────────┘

🔴 HIGH - 1 hour ago
Important Market Update
...

🟠 MEDIUM - 3 hours ago
Weekly Price Summary
...

🟢 LOW - Yesterday
New Feature Available
...
```

---

## 🐛 Troubleshooting

### Common Issues

#### Notifications Not Loading
**Problem**: Empty screen or loading indefinitely
**Solutions**:
1. Check internet connection
2. Pull down to refresh
3. Verify Firestore rules are deployed
4. Check Firebase Console for data

#### Outdated Notifications Showing
**Problem**: Expired notifications still visible
**Solutions**:
1. Pull to refresh
2. Check expiry date calculation
3. Verify admin set correct expiry
4. Clear app cache and restart

#### Can't See Market-Specific Notifications
**Problem**: Missing notifications for specific market
**Solutions**:
1. Check targetAudience is set correctly
2. Verify targetMarket matches exactly
3. Confirm notification is active
4. Check expiry date hasn't passed

---

## 📊 Analytics & Monitoring

### Metrics to Track
- Total notification views
- Priority distribution
- Average notification lifespan
- User engagement rates
- Most viewed notifications
- Notification expiry patterns

### Performance Monitoring
- Query response time
- Rendering performance
- Network request efficiency
- Cache hit rates

---

## 🚀 Future Enhancements

### Planned Features
- [ ] Push notification integration (FCM)
- [ ] Notification read/unread status
- [ ] Notification categories/tags
- [ ] Rich media support (images, links)
- [ ] Notification search functionality
- [ ] Notification bookmarking
- [ ] User notification preferences
- [ ] Notification archive view
- [ ] Admin notification analytics
- [ ] Scheduled notification sending

---

## 📞 Support

### For Users
- Check FAQ section in About tab
- Contact support: support@reshmeinfo.com
- Report issues on GitHub

### For Admins
- Review Admin Panel documentation
- Check Firestore rules configuration
- Test notifications in development mode
- Contact technical support for issues

---

## 📝 Summary

The Notifications feature provides a robust communication channel between administrators and users of the ReshmeInfo app. With priority-based filtering, market-specific targeting, and multi-language support, it ensures users stay informed about critical market updates while maintaining a clean and intuitive user experience.

**Key Benefits:**
- ✅ Real-time communication
- ✅ Priority-based organization
- ✅ Market-specific targeting
- ✅ Multi-language support
- ✅ Automatic expiry management
- ✅ Clean, modern UI
- ✅ Secure admin controls

---

*Last Updated: October 30, 2025*
*Feature Version: 1.0.0*
