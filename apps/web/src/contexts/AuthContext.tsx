import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';
import type { User } from '../types/crm';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
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
  // Synchronously restore cached user profile from localStorage if available
  const [user, setUser] = useState<User | null>(() => {
    try {
      const token = localStorage.getItem('token');
      const cachedUser = localStorage.getItem('user');
      if (token && cachedUser) {
        return JSON.parse(cachedUser);
      }
    } catch (e) {
      console.error('Error reading cached user:', e);
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return !!localStorage.getItem('token');
  });
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const initAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      setIsInitialized(true);
      return;
    }

    try {
      const fetchedUser = await authService.getMe();
      setUser(fetchedUser);
      localStorage.setItem('user', JSON.stringify(fetchedUser));
    } catch (error: any) {
      console.error('Failed to verify user profile token:', error);
      // If 401 or token expired, clean up
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

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
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      setIsInitialized(true);
    } catch (error: any) {
      console.error('Login failed', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsLoading(false);
    window.location.href = '/login';
  };

  const toggleRole = () => {
    setUser(prev => {
      if (!prev) return null;
      const updated: User = {
        ...prev,
        role: (prev.role === 'ADMIN' ? 'CLIENT_FACILITATOR' : 'ADMIN') as User['role']
      };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  // Expose helpers for development
  if (typeof window !== 'undefined') {
    (window as any).authHelpers = { toggleRole };
  }

  // If initializing a session for the very first time without cached user
  if (!isInitialized && isLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FA] gap-3">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Loading Wall to Wall CRM...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isInitialized, login, logout, toggleRole }}>
      {children}
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
