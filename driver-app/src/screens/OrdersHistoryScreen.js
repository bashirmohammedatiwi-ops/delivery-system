import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../theme';
import { getDriverDeliveredOrders, getDriverReturnedOrders, getDriverStats } from '../api';
import { getLocalDateStr, addDays } from '../utils/dateUtils';

function formatIQD(n) {
  return new Intl.NumberFormat('ar-IQ').format(n || 0) + ' د.ع';
}

function formatDateShort(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' });
}

function formatDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function OrdersHistoryScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState('delivered');
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr());

  const goPrevDay = () => {
    setSelectedDate(addDays(selectedDate, -1));
  };

  const goNextDay = () => {
    const today = getLocalDateStr();
    if (addDays(selectedDate, 1) <= today) {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const [ordersData, statsData] = await Promise.all([
        tab === 'delivered'
          ? getDriverDeliveredOrders(token, selectedDate)
          : getDriverReturnedOrders(token, selectedDate),
        getDriverStats(token, selectedDate),
      ]);
      setOrders(ordersData || []);
      setStats(statsData || null);
    } catch (e) {
      Alert.alert('خطأ', e.message || 'فشل تحميل الطلبات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, tab, selectedDate]);

  React.useEffect(() => {
    setLoading(true);
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.shipment}>#{item.ShipmentNumber}</Text>
        {tab === 'delivered' ? <Text style={styles.amount}>{formatIQD(item.TotalIQD)}</Text> : null}
      </View>
      <Text style={styles.customer}>{item.CustomerName || '—'}</Text>
      <Text style={styles.address} numberOfLines={2}>
        {item.Address || '—'}
      </Text>
      {item.RegionName ? <Text style={styles.region}>{item.RegionName}</Text> : null}
      {tab === 'returned' && item.ReturnReason ? (
        <Text style={styles.reason}>سبب الإرجاع: {item.ReturnReason}</Text>
      ) : null}
      <Text style={styles.orderDateLabel}>تاريخ الطلب: {formatDateTime(item.CreatedDate)}</Text>
      <Text style={styles.date}>
        {tab === 'delivered' ? `تاريخ التوصيل: ${formatDateTime(item.DeliveredDate)}` : `تاريخ الإرجاع: ${formatDateTime(item.ReturnedDate)}`}
      </Text>
    </View>
  );

  if (loading && orders.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>جاري تحميل السجل...</Text>
      </View>
    );
  }

  const todayStr = getLocalDateStr();
  const canGoNext = selectedDate < todayStr;

  return (
    <View style={styles.container}>
      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.dateBtn} onPress={goPrevDay}>
          <Text style={styles.dateBtnText}>← السابق</Text>
        </TouchableOpacity>
        <Text style={styles.dateLabel}>{formatDateShort(selectedDate)}</Text>
        <TouchableOpacity
          style={[styles.dateBtn, !canGoNext && styles.dateBtnDisabled]}
          onPress={goNextDay}
          disabled={!canGoNext}
        >
          <Text style={[styles.dateBtnText, !canGoNext && styles.dateBtnTextDisabled]}>التالي →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'delivered' && styles.tabActive]}
          onPress={() => setTab('delivered')}
        >
          <Text style={[styles.tabText, tab === 'delivered' && styles.tabTextActive]}>الموصّل</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'returned' && styles.tabActive]}
          onPress={() => setTab('returned')}
        >
          <Text style={[styles.tabText, tab === 'returned' && styles.tabTextActive]}>المراجع</Text>
        </TouchableOpacity>
      </View>

      {stats?.assigned != null ? (
        <View style={styles.totalCountBadge}>
          <Text style={styles.totalCountText}>طلبات لم توصل (جميع الأيام): {stats.assigned}</Text>
        </View>
      ) : null}

      {orders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {tab === 'delivered' ? 'لا توجد طلبات موصّلة لهذا اليوم' : 'لا توجد طلبات مرتجعة لهذا اليوم'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.OrderID)}
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
  loadingText: { marginTop: 12, color: '#64748b' },
  dateNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: THEME.primary,
    borderRadius: 10,
  },
  dateBtnDisabled: { backgroundColor: '#cbd5e1' },
  dateBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  dateBtnTextDisabled: { color: '#64748b' },
  dateLabel: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: THEME.bgCard,
    padding: 4,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: { backgroundColor: THEME.primary },
  tabText: { fontSize: 15, color: '#64748b' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  totalCountBadge: {
    backgroundColor: THEME.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  totalCountText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: THEME.bgCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  shipment: { fontSize: 16, fontWeight: '700', color: THEME.primary },
  amount: { fontSize: 14, fontWeight: '600', color: THEME.success },
  customer: { fontSize: 15, color: '#1e293b', marginBottom: 4 },
  address: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  region: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  reason: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  orderDateLabel: { fontSize: 11, color: '#64748b', marginTop: 6 },
  date: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#94a3b8' },
});
