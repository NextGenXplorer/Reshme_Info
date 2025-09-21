import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdminUser, AdminSession } from '../types';

// Admin credentials configuration
interface AdminCredentials {
  username: string;
  password: string;
  role: 'super_admin' | 'market_admin';
  market: string;
}

// Load admin credentials with fallback hardcoded credentials for development
const getAdminCredentials = (): AdminCredentials[] => {
  const credentials: AdminCredentials[] = [
    {
      username: 'super_admin',
      password: 'ReshmeSuper@2025!',
      role: 'super_admin',
      market: 'all'
    },
    {
      username: 'admin_ramanagara',
      password: 'Reshme@2025!Rama',
      role: 'market_admin',
      market: 'Ramanagara'
    },
    {
      username: 'admin_kollegala',
      password: 'Reshme@2025!Koll',
      role: 'market_admin',
      market: 'Kollegala'
    },
    {
      username: 'admin_kanakapura',
      password: 'Reshme@2025!Kana',
      role: 'market_admin',
      market: 'Kanakapura'
    },
    {
      username: 'admin_siddalagatta',
      password: 'Reshme@2025!Sidd',
      role: 'market_admin',
      market: 'Siddalagatta'
    }
  ];

  return credentials;
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
      const credentials = getAdminCredentials();
      const adminCred = credentials.find(cred => cred.username === username && cred.password === password);

      if (!adminCred) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

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
      const expiresAt = new Date(session.expiresAt);
      const now = new Date();

      if (now > expiresAt) {
        // Session expired
        await this.logout();
        return { authenticated: false };
      }

      return {
        authenticated: true,
        user: session.user
      };
    } catch (error) {
      console.error('Session check error:', error);
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
