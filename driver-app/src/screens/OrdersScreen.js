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
import { getDriverOrders } from '../api';
import { useFocusEffect } from '@react-navigation/native';
import { THEME } from '../theme';

function formatIQD(n) {
  return new Intl.NumberFormat('ar-IQ').format(n || 0) + ' د.ع';
}

export default function OrdersScreen({ navigation }) {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getDriverOrders(token);
      setOrders(data || []);
    } catch (e) {
      Alert.alert('خطأ', e.message || 'فشل تحميل الطلبات');
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('OrderDetail', { order: item })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.shipmentBadge}>
          <Ionicons name="cube" size={16} color={THEME.primary} />
          <Text style={styles.shipment}>#{item.ShipmentNumber}</Text>
        </View>
        <View style={styles.amountBadge}>
          <Text style={styles.amount}>{formatIQD(item.TotalIQD)}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.customer}>{item.CustomerName || '—'}</Text>
        <Text style={styles.address} numberOfLines={2}>
          {item.Address || '—'}
        </Text>
        {item.RegionName ? (
          <View style={styles.regionRow}>
            <Ionicons name="location" size={12} color={THEME.textLight} />
            <Text style={styles.region}>{item.RegionName}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  if (loading && orders.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {orders.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cube-outline" size={48} color={THEME.textLight} />
          </View>
          <Text style={styles.emptyText}>لا توجد طلبات معك حالياً</Text>
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
  loadingText: { marginTop: 12, color: THEME.textMuted },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: THEME.bgCard,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderRightWidth: 4,
    borderRightColor: THEME.primary,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  shipmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  shipment: { fontSize: 17, fontWeight: '700', color: THEME.primary },
  amountBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  amount: { fontSize: 15, fontWeight: '700', color: THEME.success },
  cardBody: {},
  customer: { fontSize: 16, fontWeight: '600', color: THEME.text, marginBottom: 6 },
  address: { fontSize: 14, color: THEME.textMuted, marginBottom: 4 },
  regionRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  region: { fontSize: 12, color: THEME.textLight },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: { fontSize: 16, color: THEME.textMuted },
});
