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
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getPendingOrdersByArea, getPendingOrdersList, getDriverToday } from '../api';
import { THEME } from '../theme';
import { getLocalDateStr } from '../utils/dateUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_CONTENT_HEIGHT = Math.floor(SCREEN_HEIGHT * 0.82);

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
  const [todayStr, setTodayStr] = useState(getLocalDateStr());

  React.useEffect(() => {
    if (token) getDriverToday(token).then(t => setTodayStr(t || getLocalDateStr()));
  }, [token]);

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
      const today = todayStr || getLocalDateStr();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const dateFrom = getLocalDateStr(weekAgo);
      const data = await getPendingOrdersByArea(token, dateFrom, today);
      setDays(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('خطأ', e.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, todayStr]);

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

  const renderOrderItem = ({ item: o }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderCardHeader}>
        <Text style={styles.orderShipment}>#{o.ShipmentNumber}</Text>
        <Text style={styles.orderAmount}>{formatIQD(o.TotalIQD)}</Text>
      </View>
      <Text style={styles.orderCustomer}>{o.CustomerName || '—'}</Text>
      <Text style={styles.orderAddress}>{o.Address || '—'}</Text>
      {o.RegionName ? <Text style={styles.orderRegion}>{o.RegionName}</Text> : null}
      {o.StoreName ? <Text style={styles.orderStore}>{o.StoreName}</Text> : null}
    </View>
  );

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
        <View style={styles.modalRoot}>
          <TouchableWithoutFeedback onPress={() => setShowOrdersModal(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View style={[styles.modalContent, { height: MODAL_CONTENT_HEIGHT }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedArea} - {formatDateAr(selectedDate)}</Text>
              <Pressable onPress={() => setShowOrdersModal(false)} hitSlop={12}>
                <Text style={styles.modalClose}>✕ إغلاق</Text>
              </Pressable>
            </View>
            {ordersLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={THEME.primary} />
              </View>
            ) : ordersList.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.emptyText}>لا توجد طلبات</Text>
              </View>
            ) : (
              <FlatList
                data={ordersList}
                keyExtractor={(o) => String(o.OrderID)}
                renderItem={renderOrderItem}
                style={styles.ordersFlatList}
                contentContainerStyle={styles.ordersListContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
              />
            )}
          </View>
        </View>
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
    borderRadius: THEME.radiusXl,
    padding: 20,
    marginBottom: 14,
    ...THEME.shadowMd,
    borderRightWidth: 5,
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
    borderRadius: THEME.radiusMd,
    padding: 16,
    alignItems: 'center',
  },
  karkhBadge: { backgroundColor: THEME.primarySoft },
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
  modalRoot: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: THEME.bgCard,
    borderTopLeftRadius: THEME.radiusXl,
    borderTopRightRadius: THEME.radiusXl,
    padding: 20,
    paddingBottom: 24,
    overflow: 'hidden',
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
  modalEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  ordersFlatList: {
    flex: 1,
  },
  ordersListContent: {
    paddingBottom: 24,
  },
  orderCard: {
    backgroundColor: THEME.bgMuted,
    borderRadius: THEME.radiusMd,
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
