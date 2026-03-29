import React, { createContext, useState, useEffect, useCallback } from 'react';
import { User, LoginRequest, SignupRequest, AuthContextType } from '../types/auth';
import authService from '../services/authService';
import { getLocalStorage, setLocalStorage, removeLocalStorage } from '../utils/localStorage';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user and token from localStorage on mount
    const savedToken = getLocalStorage('auth_token');
    const savedUser = getLocalStorage('auth_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
    }

    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });
      setToken(response.access_token);
      setUser(response.user);
      setLocalStorage('auth_token', response.access_token);
      setLocalStorage('auth_user', response.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (data: SignupRequest) => {
    setIsLoading(true);
    try {
      await authService.signup(data);
      // Auto login after signup
      await login(data.email, data.password);
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    removeLocalStorage('auth_token');
    removeLocalStorage('auth_user');
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    signup,
    logout,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};