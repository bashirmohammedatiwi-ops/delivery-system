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
import { getDriverDeferredOrders } from '../api';
import { useFocusEffect } from '@react-navigation/native';
import { THEME } from '../theme';

function formatIQD(n) {
  return new Intl.NumberFormat('ar-IQ').format(n || 0) + ' د.ع';
}

export default function DeferredOrdersScreen({ navigation }) {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getDriverDeferredOrders(token);
      setOrders(data || []);
    } catch (e) {
      Alert.alert('خطأ', e.message || 'فشل تحميل الطلبات المؤجلة');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrders();
    }, [fetchOrders])
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('OrderDetail', { order: item })}
      activeOpacity={0.7}
    >
      <View style={styles.deferredBadge}>
        <Ionicons name="pause-circle" size={14} color={THEME.warning} />
        <Text style={styles.deferredBadgeText}>مؤجل</Text>
      </View>
      <View style={styles.cardHeader}>
        <View style={styles.shipmentBadge}>
          <Ionicons name="cube" size={16} color={THEME.warning} />
          <Text style={styles.shipment}>#{item.ShipmentNumber}</Text>
        </View>
        <View style={styles.amountBadge}>
          <Text style={styles.amount}>{formatIQD(item.TotalIQD)}</Text>
        </View>
      </View>
      <Text style={styles.customer}>{item.CustomerName || '—'}</Text>
      <Text style={styles.address} numberOfLines={2}>{item.Address || '—'}</Text>
      {item.DeferredReason ? (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonLabel}>سبب التأجيل:</Text>
          <Text style={styles.reasonText}>{item.DeferredReason}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  if (loading && orders.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.warning} />
        <Text style={styles.loadingText}>جاري تحميل الطلبات المؤجلة...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>الطلبات المؤجلة</Text>
      <Text style={styles.headerSubtitle}>طلباتك المؤجلة مع سبب التأجيل — اضغط لعرض التفاصيل</Text>
      {orders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="pause-circle-outline" size={48} color={THEME.textLight} />
          <Text style={styles.emptyText}>لا توجد طلبات مؤجلة</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.OrderID)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} colors={[THEME.warning]} />
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
    color: THEME.text,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: THEME.textMuted,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#fffbeb',
    borderRadius: THEME.radiusXl,
    padding: 20,
    marginBottom: 14,
    ...THEME.shadowMd,
    borderRightWidth: 5,
    borderRightColor: THEME.warning,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.25)',
  },
  deferredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: THEME.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radiusSm,
    marginBottom: 10,
  },
  deferredBadgeText: { fontSize: 12, fontWeight: '700', color: THEME.warning },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  shipmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.warningSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radiusSm,
  },
  shipment: { fontSize: 17, fontWeight: '700', color: THEME.warning },
  amountBadge: {
    backgroundColor: THEME.successSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radiusSm,
  },
  amount: { fontSize: 15, fontWeight: '700', color: THEME.success },
  customer: { fontSize: 16, fontWeight: '600', color: THEME.text, marginBottom: 6 },
  address: { fontSize: 14, color: THEME.textMuted, marginBottom: 8 },
  reasonBox: {
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    borderRadius: THEME.radiusMd,
    padding: 10,
    marginTop: 4,
  },
  reasonLabel: { fontSize: 12, color: THEME.warning, fontWeight: '700', marginBottom: 4 },
  reasonText: { fontSize: 14, color: THEME.text, lineHeight: 20 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: THEME.textMuted },
});
