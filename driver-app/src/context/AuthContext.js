import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverLogin as apiLogin, driverLogout as apiLogout } from '../api';

const AUTH_KEY = '@driver_token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [driver, setDriver] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredToken();
  }, []);

  async function loadStoredToken() {
    try {
      const stored = await AsyncStorage.getItem(AUTH_KEY);
      if (stored) {
        setToken(stored);
        // تحقق من صلاحية التوكن لاحقاً
      }
    } catch (e) {
      console.warn('Failed to load token', e);
    }
    setIsLoading(false);
  }

  async function login(username, password) {
    const data = await apiLogin(username, password);
    const t = data.token;
    setToken(t);
    setDriver(data.driver);
    await AsyncStorage.setItem(AUTH_KEY, t);
  }

  async function logout() {
    if (token) await apiLogout(token).catch(() => {});
    setToken(null);
    setDriver(null);
    await AsyncStorage.removeItem(AUTH_KEY);
  }

  return (
    <AuthContext.Provider value={{ token, driver, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
