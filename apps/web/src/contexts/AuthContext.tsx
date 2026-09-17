import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import type { User } from '../types/crm';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password?: string, isGoogle?: boolean) => Promise<void>;
  logout: () => void;
  toggleRole: () => void; // Development only
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const fetchedUser = await authService.getMe();
          setUser(fetchedUser);
        } catch (error) {
          console.error('Failed to fetch user profile', error);
          localStorage.removeItem('token');
        }
      }
      setIsLoading(false);
      setIsInitialized(true);
    };
    initAuth();
  }, []);

  const login = async (identifier: string, password?: string, isGoogle?: boolean) => {
    try {
      setIsLoading(true);
      let authResponse;
      if (isGoogle) {
        authResponse = await authService.googleLogin(identifier);
      } else {
        authResponse = await authService.login(identifier, password);
      }
      
      const { token, user: loggedInUser } = authResponse;
      localStorage.setItem('token', token);
      setUser(loggedInUser);
    } catch (error: any) {
      console.error('Login failed', error);
      localStorage.removeItem('token');
      setUser(null);
      throw new Error(
        getErrorMessage(
          error,
          isGoogle ? 'Google login failed. Please try again.' : 'Invalid username/email or password.'
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  };

  const toggleRole = () => {
    setUser(prev => prev ? {
      ...prev,
      role: prev.role === 'ADMIN' ? 'CRE' : 'ADMIN'
    } : null);
  };

  // Expose helpers for development
  if (typeof window !== 'undefined') {
    (window as any).authHelpers = { toggleRole };
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, toggleRole }}>
      {isInitialized ? children : null}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
