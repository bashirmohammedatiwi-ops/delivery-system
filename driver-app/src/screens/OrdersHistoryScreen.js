import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../theme';
import { getDriverDeliveredOrders, getDriverReturnedOrders, getDriverStats, getDriverToday } from '../api';
import { formatIQD } from '../utils/format';
import { getLocalDateStr, addDays } from '../utils/dateUtils';
import DateNavigator from '../components/DateNavigator';
import SegmentControl from '../components/SegmentControl';
import EmptyState from '../components/EmptyState';
import LoadingView from '../components/LoadingView';

function formatDateShort(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' });
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function OrdersHistoryScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState('delivered');
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr());
  const [todayStr, setTodayStr] = useState(getLocalDateStr());

  React.useEffect(() => {
    if (token) getDriverToday(token).then((t) => setTodayStr(t || getLocalDateStr()));
  }, [token]);

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

  const canGoNext = selectedDate < todayStr;

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.shipmentPill}>
          <Ionicons name="cube-outline" size={14} color={tab === 'delivered' ? THEME.success : THEME.danger} />
          <Text style={styles.shipment}>#{item.ShipmentNumber}</Text>
        </View>
        {tab === 'delivered' ? <Text style={styles.amount}>{formatIQD(item.TotalIQD)}</Text> : null}
      </View>
      <Text style={styles.customer}>{item.CustomerName || '—'}</Text>
      <Text style={styles.address} numberOfLines={2}>{item.Address || '—'}</Text>
      {item.RegionName ? <Text style={styles.region}>{item.RegionName}</Text> : null}
      {tab === 'returned' && item.ReturnReason ? (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonText}>سبب الإرجاع: {item.ReturnReason}</Text>
        </View>
      ) : null}
      <View style={styles.footerRow}>
        <Ionicons name="time-outline" size={14} color={THEME.textLight} />
        <Text style={styles.dateText}>
          {tab === 'delivered'
            ? `التوصيل: ${formatDateTime(item.DeliveredDate)}`
            : `الإرجاع: ${formatDateTime(item.ReturnedDate)}`}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <DateNavigator
        label={formatDateShort(selectedDate)}
        onPrev={() => setSelectedDate(addDays(selectedDate, -1))}
        onNext={() => canGoNext && setSelectedDate(addDays(selectedDate, 1))}
        canGoNext={canGoNext}
      />

      <SegmentControl
        options={[
          { key: 'delivered', label: 'الموصّل' },
          { key: 'returned', label: 'المراجع' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {stats?.assigned != null ? (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={THEME.primary} />
          <Text style={styles.infoBannerText}>طلبات لم توصل (جميع الأيام): {stats.assigned}</Text>
        </View>
      ) : null}

      {loading && orders.length === 0 ? (
        <LoadingView message="جاري تحميل السجل..." />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={tab === 'delivered' ? 'checkmark-circle-outline' : 'return-down-back-outline'}
          title={tab === 'delivered' ? 'لا توجد طلبات موصّلة' : 'لا توجد طلبات مرتجعة'}
          subtitle="جرّب تاريخاً آخر"
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.OrderID)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} colors={[THEME.primary]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  list: { paddingHorizontal: THEME.spaceLg, paddingBottom: THEME.space3xl },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: THEME.spaceLg,
    marginBottom: THEME.spaceMd,
    backgroundColor: THEME.primarySoft,
    padding: THEME.spaceMd,
    borderRadius: THEME.radiusMd,
  },
  infoBannerText: { flex: 1, fontSize: THEME.fontSm, fontWeight: '700', color: THEME.primaryDark },
  card: {
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusLg,
    padding: THEME.spaceLg,
    marginBottom: THEME.spaceMd,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    ...THEME.shadowSm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: THEME.spaceSm },
  shipmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.bgMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radiusFull,
  },
  shipment: { fontSize: THEME.fontMd, fontWeight: '800', color: THEME.text },
  amount: { fontSize: THEME.fontSm, fontWeight: '800', color: THEME.success },
  customer: { fontSize: THEME.fontMd, fontWeight: '700', color: THEME.text, marginBottom: 4 },
  address: { fontSize: THEME.fontSm, color: THEME.textMuted, lineHeight: 20 },
  region: { fontSize: THEME.fontXs, color: THEME.textLight, marginTop: 4, fontWeight: '600' },
  reasonBox: {
    marginTop: THEME.spaceSm,
    backgroundColor: THEME.dangerSoft,
    borderRadius: THEME.radiusSm,
    padding: 10,
  },
  reasonText: { fontSize: THEME.fontSm, color: THEME.danger, fontWeight: '700' },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: THEME.spaceSm },
  dateText: { fontSize: THEME.fontXs, color: THEME.textLight, fontWeight: '600' },
});
