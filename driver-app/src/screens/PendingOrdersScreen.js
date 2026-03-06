import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getPendingOrdersByArea } from '../api';
import { THEME } from '../theme';

function formatDateAr(d) {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateShort(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' });
}

export default function PendingOrdersScreen() {
  const { token } = useAuth();
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const dateFrom = weekAgo.toISOString().slice(0, 10);
      const data = await getPendingOrdersByArea(token, dateFrom, today);
      setDays(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('خطأ', e.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  React.useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderItem = ({ item }) => {
    const total = (item.countKarkh || 0) + (item.countRusafa || 0);
    if (total === 0) return null;
    return (
      <View style={styles.dayCard}>
        <Text style={styles.dayDate}>{formatDateAr(item.orderDate)}</Text>
        <View style={styles.areaRow}>
          <View style={[styles.areaBadge, styles.karkhBadge]}>
            <Text style={styles.areaValue}>{item.countKarkh || 0}</Text>
            <Text style={styles.areaLabel}>الكرخ</Text>
          </View>
          <View style={[styles.areaBadge, styles.rusafaBadge]}>
            <Text style={styles.areaValue}>{item.countRusafa || 0}</Text>
            <Text style={styles.areaLabel}>الرصافة</Text>
          </View>
        </View>
        <Text style={styles.totalText}>المجموع: {total} طلب</Text>
      </View>
    );
  };

  if (loading && days.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>جاري تحميل الطلبات المنتظرة...</Text>
      </View>
    );
  }

  const filteredDays = days.filter((d) => ((d.countKarkh || 0) + (d.countRusafa || 0)) > 0);

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>الطلبات المنتظرة للاستلام</Text>
      <Text style={styles.headerSubtitle}>طلبات لم يستلمها أي سائق بعد (حالة: جديد)</Text>
      {filteredDays.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>لا توجد طلبات منتظرة حالياً</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDays}
          keyExtractor={(item) => item.orderDate}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: THEME.textMuted, fontSize: 15 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  list: { padding: 16, paddingBottom: 32 },
  dayCard: {
    backgroundColor: THEME.bgCard,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderRightWidth: 4,
    borderRightColor: THEME.primary,
  },
  dayDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 14,
  },
  areaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  areaBadge: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  karkhBadge: { backgroundColor: 'rgba(13, 148, 136, 0.15)' },
  rusafaBadge: { backgroundColor: 'rgba(139, 92, 246, 0.15)' },
  areaValue: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  areaLabel: { fontSize: 14, color: '#64748b', marginTop: 4 },
  totalText: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { fontSize: 16, color: '#94a3b8' },
});
