import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import {
  getDriverOrders,
  getDriverStats,
  getDriverToday,
  getPendingOrdersByArea,
} from '../api';
import { getLocalDateStr } from '../utils/dateUtils';
import { isDeferredOrder } from '../utils/format';

const AppDataContext = createContext(null);

export function AppDataProvider({ token, children }) {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const today = await getDriverToday(token).catch(() => getLocalDateStr());
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const [ordersData, statsData, pendingData] = await Promise.all([
        getDriverOrders(token),
        getDriverStats(token, today),
        getPendingOrdersByArea(token, getLocalDateStr(weekAgo), today),
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setStats(statsData || null);
      const total = (Array.isArray(pendingData) ? pendingData : []).reduce(
        (sum, d) => sum + (d.countKarkh || 0) + (d.countRusafa || 0),
        0
      );
      setPendingCount(total);
      setLastUpdated(new Date());
    } catch (_) {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deferredCount = useMemo(() => orders.filter(isDeferredOrder).length, [orders]);
  const activeCount = orders.length - deferredCount;

  const value = useMemo(
    () => ({
      orders,
      stats,
      pendingCount,
      deferredCount,
      activeCount,
      loading,
      lastUpdated,
      refresh,
      setOrders,
    }),
    [orders, stats, pendingCount, deferredCount, activeCount, loading, lastUpdated, refresh]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
