import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AdminUser, AdminSession } from '../types';

// Admin credentials configuration
interface AdminCredentials {
  username: string;
  password: string;
  role: 'super_admin' | 'market_admin';
  market: string;
}

// Load admin credentials ONLY from environment variables
const getAdminCredentials = (): AdminCredentials[] => {
  const envCredentials: AdminCredentials[] = [];
  const expoExtra = Constants.expoConfig?.extra || {};

  // List of known insecure default passwords
  const insecurePasswords = [
    'ReshmeSuper@2025!',
    'Reshme@2025!Rama',
    'Reshme@2025!Koll',
    'Reshme@2025!Kana',
    'Reshme@2025!Sidd',
  ];

  // Load all admin credentials from environment variables
  for (let i = 1; i <= 10; i++) {
    const username = expoExtra[`ADMIN_USERNAME_${i}`];
    const password = expoExtra[`ADMIN_PASSWORD_${i}`];
    const role = expoExtra[`ADMIN_ROLE_${i}`] as 'super_admin' | 'market_admin';
    const market = expoExtra[`ADMIN_MARKET_${i}`];

    if (username && password && role && market) {
      envCredentials.push({ username, password, role, market });

      // Security Check: Warn if default password is being used in development
      if (__DEV__ && insecurePasswords.includes(password)) {
        console.warn(
          `\n\n🚨 SECURITY ALERT: Weak Password 🚨\n` +
          `---------------------------------------\n` +
          `Admin account "${username}" is using a known default password.\n` +
          `For security, please change this password in your .env file.\n` +
          `---------------------------------------\n\n`
        );
      }
    }
  }

  // Security check: Only allow credentials from environment variables
  if (envCredentials.length === 0) {
    console.error('❌ SECURITY WARNING: No admin credentials found in environment variables');
    console.error('📝 Please configure ADMIN_USERNAME_X, ADMIN_PASSWORD_X, ADMIN_ROLE_X, ADMIN_MARKET_X in .env file');
    console.error('📖 See ADMIN_PANEL_README.md for configuration details');

    // Return empty array to prevent unauthorized access
    return [];
  }

  console.log(`✅ Loaded ${envCredentials.length} admin accounts from environment variables`);
  return envCredentials;
};

// Session management
const ADMIN_SESSION_KEY = '@admin_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

export class AdminAuthService {
  private static instance: AdminAuthService;
  private currentSession: AdminSession | null = null;

  private constructor() {}

  static getInstance(): AdminAuthService {
    if (!AdminAuthService.instance) {
      AdminAuthService.instance = new AdminAuthService();
    }
    return AdminAuthService.instance;
  }

  // Authenticate admin user
  async authenticate(username: string, password: string): Promise<{ success: boolean; user?: AdminUser; message: string }> {
    try {
      // Input validation
      if (!username || !password) {
        return {
          success: false,
          message: 'Username and password are required'
        };
      }

      if (username.length < 3 || password.length < 6) {
        return {
          success: false,
          message: 'Invalid credentials format'
        };
      }

      const credentials = getAdminCredentials();

      // Security check: Ensure credentials are loaded from environment
      if (credentials.length === 0) {
        console.error('❌ SECURITY: Authentication blocked - no environment credentials configured');
        return {
          success: false,
          message: 'Admin panel is not properly configured. Contact system administrator.'
        };
      }

      const adminCred = credentials.find(cred =>
        cred.username.toLowerCase() === username.toLowerCase().trim() &&
        cred.password === password
      );

      if (!adminCred) {
        console.log(`❌ Authentication failed for username: ${username}`);
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      console.log(`✅ Authentication successful for user: ${adminCred.username} (${adminCred.role})`);

      const user: AdminUser = {
        username: adminCred.username,
        role: adminCred.role,
        market: adminCred.market,
        isAuthenticated: true
      };

      const loginTime = new Date();
      const expiresAt = new Date(loginTime.getTime() + SESSION_DURATION);

      const session: AdminSession = {
        user,
        loginTime,
        expiresAt
      };

      // Store session
      await AsyncStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
        user,
        loginTime: loginTime.toISOString(),
        expiresAt: expiresAt.toISOString()
      }));

      this.currentSession = session;

      return {
        success: true,
        user,
        message: 'Authentication successful'
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        message: 'Authentication failed due to system error'
      };
    }
  }

  // Check if current session is valid
  async isAuthenticated(): Promise<{ authenticated: boolean; user?: AdminUser }> {
    try {
      const sessionData = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
      if (!sessionData) {
        return { authenticated: false };
      }

      const session = JSON.parse(sessionData);

      // Validate session structure
      if (!session.user || !session.expiresAt) {
        console.warn('Invalid session structure, clearing session');
        await this.logout();
        return { authenticated: false };
      }

      const expiresAt = new Date(session.expiresAt);
      const now = new Date();

      // Check if session is expired
      if (isNaN(expiresAt.getTime()) || now > expiresAt) {
        console.log('Session expired, clearing session');
        await this.logout();
        return { authenticated: false };
      }

      // Validate user object structure
      const user = session.user;
      if (!user.username || !user.role || !user.market) {
        console.warn('Invalid user structure in session');
        await this.logout();
        return { authenticated: false };
      }

      // Update current session in memory
      this.currentSession = {
        user,
        loginTime: new Date(session.loginTime),
        expiresAt
      };

      return {
        authenticated: true,
        user: { ...user, isAuthenticated: true }
      };
    } catch (error) {
      console.error('Session check error:', error);
      // Clear potentially corrupted session
      await this.logout();
      return { authenticated: false };
    }
  }

  // Get current user
  async getCurrentUser(): Promise<AdminUser | null> {
    const { authenticated, user } = await this.isAuthenticated();
    return authenticated && user ? user : null;
  }

  // Logout admin user
  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
      this.currentSession = null;
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Check if user has permission for specific market
  hasMarketPermission(user: AdminUser, market: string): boolean {
    if (user.role === 'super_admin') {
      return true; // Super admin has access to all markets
    }

    if (user.role === 'market_admin') {
      return user.market === market || user.market === 'all';
    }

    return false;
  }

  // Refresh session (extend expiry)
  async refreshSession(): Promise<boolean> {
    try {
      const { authenticated, user } = await this.isAuthenticated();
      if (!authenticated || !user) {
        return false;
      }

      const loginTime = new Date();
      const expiresAt = new Date(loginTime.getTime() + SESSION_DURATION);

      await AsyncStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
        user,
        loginTime: loginTime.toISOString(),
        expiresAt: expiresAt.toISOString()
      }));

      return true;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  }

  // Get all available markets for user
  getAvailableMarkets(user: AdminUser): string[] {
    if (user.role === 'super_admin') {
      return ['Ramanagara', 'Kollegala', 'Kanakapura', 'Siddalagatta', 'Kolar'];
    }

    if (user.role === 'market_admin') {
      return user.market === 'all' ? ['Ramanagara', 'Kollegala', 'Kanakapura', 'Siddalagatta', 'Kolar'] : [user.market];
    }

    return [];
  }
}

// Export singleton instance
export const adminAuth = AdminAuthService.getInstance();
