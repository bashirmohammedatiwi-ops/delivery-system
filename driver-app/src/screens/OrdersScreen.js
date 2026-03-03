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
import { useAuth } from '../context/AuthContext';
import { getDriverOrders } from '../api';
import { useFocusEffect } from '@react-navigation/native';

function formatIQD(n) {
  return new Intl.NumberFormat('ar-IQ').format(n || 0) + ' د.ع';
}

export default function OrdersScreen({ navigation }) {
  const { token, driver, logout } = useAuth();
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
        <Text style={styles.shipment}>#{item.ShipmentNumber}</Text>
        <Text style={styles.amount}>{formatIQD(item.TotalIQD)}</Text>
      </View>
      <Text style={styles.customer}>{item.CustomerName || '—'}</Text>
      <Text style={styles.address} numberOfLines={2}>
        {item.Address || '—'}
      </Text>
      {item.RegionName ? (
        <Text style={styles.region}>{item.RegionName}</Text>
      ) : null}
    </TouchableOpacity>
  );

  if (loading && orders.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {driver ? (
        <View style={styles.headerBar}>
          <Text style={styles.welcome}>مرحباً، {driver.DriverName}</Text>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>خروج</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {orders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>لا توجد طلبات معك حالياً</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.OrderID)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1e40af']} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b' },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  welcome: { fontSize: 14, color: '#64748b' },
  logoutBtn: { padding: 8 },
  logoutText: { color: '#dc2626', fontWeight: '600' },
  list: { padding: 12, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  shipment: { fontSize: 16, fontWeight: '700', color: '#1e40af' },
  amount: { fontSize: 14, fontWeight: '600', color: '#16a34a' },
  customer: { fontSize: 15, color: '#1e293b', marginBottom: 4 },
  address: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  region: { fontSize: 12, color: '#94a3b8' },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { fontSize: 16, color: '#94a3b8' },
});
