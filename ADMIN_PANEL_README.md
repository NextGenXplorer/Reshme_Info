# Admin Panel Documentation

## Overview
The Reshme Info app includes a comprehensive admin panel for market price management with secure authentication and role-based access control.

## Features

### 🔐 **Secure Authentication**
- Username/password authentication
- 8-hour session management
- Multiple admin accounts with different roles
- Failed attempt tracking (3 attempts max)

### 👥 **Role-Based Access Control**
- **Super Admin**: Access to all markets and data
- **Market Admin**: Access to specific market data only

### 📊 **Dashboard Features**
- Real-time statistics overview
- Market price monitoring
- Recent activity tracking
- Quick action buttons

### 💰 **Price Management**
- Add new market prices
- Edit existing price entries
- Delete price entries (with confirmation)
- Auto-calculated average prices
- Quality grade management (A, B, C)

## Admin Accounts

### Super Admin
- **Username**: `super_admin`
- **Password**: `ReshmeSuper@2025!`
- **Access**: All markets

### Market Admins
- **Ramanagara Admin**
  - Username: `admin_ramanagara`
  - Password: `Reshme@2025!Rama`

- **Kollegala Admin**
  - Username: `admin_kollegala`
  - Password: `Reshme@2025!Koll`

- **Kanakapura Admin**
  - Username: `admin_kanakapura`
  - Password: `Reshme@2025!Kana`

- **Siddalagatta Admin**
  - Username: `admin_siddalagatta`
  - Password: `Reshme@2025!Sidd`

## How to Access

### Development Mode
1. Look for the shield icon (🛡️) in the top-right corner of the app
2. Tap the icon to open the admin login screen
3. Enter admin credentials
4. Navigate through the admin dashboard

### Production Mode
- The shield icon is automatically hidden in production builds
- Access can be enabled through app settings or deep links (if configured)

## Admin Panel Screens

### 1. Login Screen
- Secure credential validation
- Failed attempt tracking
- Password visibility toggle
- Session restoration for returning users

### 2. Dashboard Screen
- **Statistics Cards**: Total entries, today's updates, average price, market count
- **Quick Actions**: Add new price, refresh data
- **Recent Entries**: Latest 10 price entries with edit/delete options
- **User Info**: Current user role and market access

### 3. Price Form Screen
- **Market Selection**: Available markets based on user role
- **Breed Selection**: CB (Cross Breed) or BV (Bivoltine)
- **Quality Grades**: A, B, or C quality ratings
- **Price Input**: Current price, min/max range, auto-calculated average
- **Validation**: Real-time form validation with error messages
- **Summary Card**: Preview of entered data before saving

## Security Features

### Session Management
- 8-hour session duration
- Automatic session refresh
- Secure session storage using AsyncStorage
- Session expiry handling

### Data Protection
- Market-based access control
- Permission validation for all operations
- Secure credential storage
- Activity logging (console logs for debugging)

### User Experience
- Intuitive navigation with back button handling
- Confirmation dialogs for destructive actions
- Loading states and error handling
- Responsive design for all screen sizes

## Data Validation

### Price Entry Validation
- All numeric fields must be greater than 0
- Maximum price must be greater than minimum price
- Market permission validation
- Required field validation

### Form Features
- Auto-calculation of average price from min/max values
- Real-time error feedback
- Unsaved changes warning
- Professional summary card

## Technical Implementation

### Authentication Service
- Singleton pattern for auth management
- AsyncStorage for session persistence
- Role-based permission system
- Secure credential comparison

### Database Operations
- Firebase Firestore integration
- Real-time data synchronization
- CRUD operations with proper error handling
- Timestamp management for updates

### UI Components
- Reusable filter chips
- Professional form layouts
- Responsive table components
- Consistent design system

## Usage Workflow

### Adding New Price
1. Login to admin panel
2. Tap "Add New Price" from dashboard
3. Select market (based on permissions)
4. Choose breed (CB/BV) and quality (A/B/C)
5. Enter price information
6. Review summary and save

### Editing Existing Price
1. From dashboard, find price entry
2. Tap edit icon (pencil)
3. Modify price information
4. Save changes

### Deleting Price Entry
1. From dashboard, find price entry
2. Tap delete icon (trash)
3. Confirm deletion in dialog
4. Entry is permanently removed

## Best Practices

### For Admins
- Update prices regularly (daily recommended)
- Use accurate price ranges (min/max)
- Select appropriate quality grades
- Log out when finished

### For Developers
- Monitor session duration in production
- Regular backup of price data
- Review access logs periodically
- Keep credentials secure

## Troubleshooting

### Login Issues
- Check username/password spelling
- Ensure account has proper permissions
- Wait 5 minutes after 3 failed attempts
- Clear app data if session issues persist

### Data Issues
- Refresh dashboard if data seems outdated
- Check network connectivity
- Verify Firebase configuration
- Contact system administrator for support

## Support
For technical support or admin account issues:
- Email: admin@reshmeinfo.com
- Check console logs for error details
- Report issues with screenshots when possible

---
*Last Updated: September 21, 2025*