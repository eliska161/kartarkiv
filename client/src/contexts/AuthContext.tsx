import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
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
  const { getToken } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Configure axios defaults with Clerk token
  useEffect(() => {
    const setupAuth = async () => {
      if (isLoaded && clerkUser) {
        try {
          const token = await getToken();
          if (token) {
            setToken(token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            // Set user data from Clerk
            setUser({
              id: clerkUser.id,
              username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress || '',
              email: clerkUser.emailAddresses[0]?.emailAddress || '',
              firstName: clerkUser.firstName || '',
              lastName: clerkUser.lastName || '',
              isAdmin: clerkUser.publicMetadata?.isAdmin || false
            });
          }
        } catch (error) {
          console.error('Failed to get Clerk token:', error);
        }
      } else if (isLoaded && !clerkUser) {
        // User is not signed in
        setUser(null);
        setToken(null);
        delete axios.defaults.headers.common['Authorization'];
      }
      setLoading(!isLoaded);
    };

    setupAuth();
  }, [clerkUser, isLoaded, getToken]);

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
    delete axios.defaults.headers.common['Authorization'];
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
