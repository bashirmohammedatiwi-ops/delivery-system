import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverLogin as apiLogin, driverLogout as apiLogout } from '../api';

const AUTH_KEY = '@driver_token';
const DRIVER_KEY = '@driver_data';
const USERNAME_KEY = '@driver_username';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [driver, setDriver] = useState(null);
  const [savedUsername, setSavedUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const [storedToken, storedDriver, storedUsername] = await Promise.all([
        AsyncStorage.getItem(AUTH_KEY),
        AsyncStorage.getItem(DRIVER_KEY),
        AsyncStorage.getItem(USERNAME_KEY),
      ]);
      if (storedUsername) setSavedUsername(storedUsername);
      if (storedToken) {
        setToken(storedToken);
        if (storedDriver) {
          try {
            setDriver(JSON.parse(storedDriver));
          } catch (_) {}
        }
      }
    } catch (e) {
      console.warn('Failed to load auth', e);
    }
    setIsLoading(false);
  }

  async function login(username, password, rememberUsername = true) {
    const data = await apiLogin(username, password);
    const t = data.token;
    setToken(t);
    setDriver(data.driver);
    await AsyncStorage.setItem(AUTH_KEY, t);
    await AsyncStorage.setItem(DRIVER_KEY, JSON.stringify(data.driver || {}));
    if (rememberUsername) {
      await AsyncStorage.setItem(USERNAME_KEY, username.trim());
      setSavedUsername(username.trim());
    } else {
      await AsyncStorage.removeItem(USERNAME_KEY);
      setSavedUsername('');
    }
  }

  async function logout() {
    if (token) await apiLogout(token).catch(() => {});
    setToken(null);
    setDriver(null);
    await AsyncStorage.multiRemove([AUTH_KEY, DRIVER_KEY]);
  }

  return (
    <AuthContext.Provider value={{ token, driver, isLoading, savedUsername, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
