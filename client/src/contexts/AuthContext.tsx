import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isWebmaster: boolean;
  roles: string[];
  activeRole: 'member' | 'club-admin' | 'webmaster';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  sessionExpired: boolean;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { getToken } = useClerkAuth();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const broadcastSessionExpired = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleSessionExpired = () => {
      setSessionExpired(true);
      setUser(null);
      setToken(null);
      delete axios.defaults.headers.common['Authorization'];
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, []);

  // Configure axios defaults with Clerk token
  useEffect(() => {
    const setupAuth = async () => {
      if (isLoaded && clerkUser) {
        try {
          const token = await getToken();
          if (token) {
            setToken(token);
            setSessionExpired(false);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Set user data from Clerk
            const roles = Array.isArray(clerkUser.publicMetadata?.roles)
              ? clerkUser.publicMetadata.roles.map(role => String(role).toLowerCase())
              : [];
            const isSuperAdmin = roles.includes('superadmin') || Boolean(clerkUser.publicMetadata?.isSuperAdmin);
            const isWebmaster = roles.includes('webmaster') || isSuperAdmin;
            const isAdmin = Boolean(clerkUser.publicMetadata?.isAdmin) || roles.includes('clubadmin') || roles.includes('admin') || isWebmaster;
            const activeRole: User['activeRole'] = isWebmaster ? 'webmaster' : isAdmin ? 'club-admin' : 'member';

            setUser({
              id: clerkUser.id,
              username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress || '',
              email: clerkUser.emailAddresses[0]?.emailAddress || '',
              firstName: clerkUser.firstName || '',
              lastName: clerkUser.lastName || '',
              isAdmin,
              isSuperAdmin,
              isWebmaster,
              roles,
              activeRole,
            });
          }
        } catch (error) {
          console.error('Failed to get Clerk token:', error);
        }
      } else if (isLoaded && !clerkUser) {
        // User is not signed in
        setUser(null);
        setToken(null);
        setSessionExpired(false);
        delete axios.defaults.headers.common['Authorization'];
      }
      setLoading(!isLoaded);
    };

    setupAuth();
  }, [clerkUser, isLoaded, getToken]);

  // Add axios interceptor to handle token expired errors
  useEffect(() => {
    let isRefreshing = false;
    let failedQueue: any[] = [];

    const processQueue = (error: any, token: string | null = null) => {
      failedQueue.forEach(prom => {
        if (error) {
          prom.reject(error);
        } else {
          prom.resolve(token);
        }
      });
      
      failedQueue = [];
    };

    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            }).then(token => {
              originalRequest.headers['Authorization'] = 'Bearer ' + token;
              return axios(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            console.log('🔄 Token expired, refreshing...');
            const newToken = await getToken();
            if (newToken) {
              setToken(newToken);
              axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
              originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
              processQueue(null, newToken);
              return axios(originalRequest);
            } else {
              throw new Error('No token received');
            }
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
            processQueue(refreshError, null);
            setSessionExpired(true);
            setUser(null);
            setToken(null);
            delete axios.defaults.headers.common['Authorization'];
            broadcastSessionExpired();
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [getToken]);

  const login = async (username: string, password: string) => {
    // Clerk handles login, this is just for compatibility
    throw new Error('Use Clerk SignIn component instead');
  };

  const register = async (userData: RegisterData) => {
    // Clerk handles registration, this is just for compatibility
    throw new Error('Use Clerk SignUp component instead');
  };

  const logout = () => {
    // Clerk handles logout
    setUser(null);
    setToken(null);
    setSessionExpired(false);
    delete axios.defaults.headers.common['Authorization'];
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    sessionExpired
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
