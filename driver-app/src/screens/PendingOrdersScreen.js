import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getPendingOrdersByArea, getPendingOrdersList } from '../api';
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

function formatIQD(n) {
  return new Intl.NumberFormat('ar-IQ').format(n || 0) + ' د.ع';
}

export default function PendingOrdersScreen() {
  const { token } = useAuth();
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [ordersList, setOrdersList] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const openAreaOrders = useCallback(
    async (date, area) => {
      if (!token) return;
      setSelectedDate(date);
      setSelectedArea(area);
      setShowOrdersModal(true);
      setOrdersLoading(true);
      setOrdersList([]);
      try {
        const list = await getPendingOrdersList(token, date, area);
        setOrdersList(Array.isArray(list) ? list : []);
      } catch (e) {
        Alert.alert('خطأ', e.message || 'فشل تحميل الطلبات');
      } finally {
        setOrdersLoading(false);
      }
    },
    [token]
  );

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
          <Pressable
            style={[styles.areaBadge, styles.karkhBadge]}
            onPress={() => openAreaOrders(item.orderDate, 'الكرخ')}
            android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          >
            <Text style={styles.areaValue}>{item.countKarkh || 0}</Text>
            <Text style={styles.areaLabel}>الكرخ</Text>
          </Pressable>
          <Pressable
            style={[styles.areaBadge, styles.rusafaBadge]}
            onPress={() => openAreaOrders(item.orderDate, 'الرصافة')}
            android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          >
            <Text style={styles.areaValue}>{item.countRusafa || 0}</Text>
            <Text style={styles.areaLabel}>الرصافة</Text>
          </Pressable>
        </View>
        <Text style={styles.totalText}>المجموع: {total} طلب - اضغط على المنطقة لرؤية الطلبات</Text>
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
      <Text style={styles.headerSubtitle}>طلبات لم يستلمها أي سائق بعد - اضغط على الكرخ أو الرصافة لرؤية الطلبات</Text>
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

      <Modal
        visible={showOrdersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOrdersModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowOrdersModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedArea} - {formatDateAr(selectedDate)}</Text>
              <Pressable onPress={() => setShowOrdersModal(false)}>
                <Text style={styles.modalClose}>✕ إغلاق</Text>
              </Pressable>
            </View>
            {ordersLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={THEME.primary} />
              </View>
            ) : ordersList.length === 0 ? (
              <Text style={styles.emptyText}>لا توجد طلبات</Text>
            ) : (
              <ScrollView style={styles.ordersScroll} contentContainerStyle={styles.ordersScrollContent}>
                {ordersList.map((o) => (
                  <View key={o.OrderID} style={styles.orderCard}>
                    <View style={styles.orderCardHeader}>
                      <Text style={styles.orderShipment}>#{o.ShipmentNumber}</Text>
                      <Text style={styles.orderAmount}>{formatIQD(o.TotalIQD)}</Text>
                    </View>
                    <Text style={styles.orderCustomer}>{o.CustomerName || '—'}</Text>
                    <Text style={styles.orderAddress}>{o.Address || '—'}</Text>
                    {o.RegionName ? <Text style={styles.orderRegion}>{o.RegionName}</Text> : null}
                    {o.StoreName ? <Text style={styles.orderStore}>{o.StoreName}</Text> : null}
                  </View>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalClose: { fontSize: 16, color: THEME.primary, fontWeight: '600' },
  modalLoading: { padding: 40, alignItems: 'center' },
  ordersScroll: { maxHeight: 400 },
  ordersScrollContent: { paddingBottom: 24 },
  orderCard: {
    backgroundColor: THEME.bg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderRightWidth: 4,
    borderRightColor: THEME.primary,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderShipment: { fontSize: 16, fontWeight: '700', color: THEME.primary },
  orderAmount: { fontSize: 16, fontWeight: '700', color: THEME.success },
  orderCustomer: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  orderAddress: { fontSize: 14, color: THEME.textMuted, marginBottom: 2 },
  orderRegion: { fontSize: 13, color: THEME.textMuted },
  orderStore: { fontSize: 13, color: THEME.textMuted, marginTop: 4 },
});
