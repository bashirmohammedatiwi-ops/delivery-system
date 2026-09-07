import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getPendingOrdersByArea, getPendingOrdersList, getDriverToday } from '../api';
import AppHeader from '../components/AppHeader';
import OrderCard from '../components/OrderCard';
import EmptyState from '../components/EmptyState';
import LoadingView from '../components/LoadingView';
import SearchBar from '../components/SearchBar';
import { searchOrders } from '../utils/orderUtils';
import { THEME } from '../theme';
import { getLocalDateStr } from '../utils/dateUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = Math.floor(SCREEN_HEIGHT * 0.82);

function formatDateAr(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('ar-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function PendingOrdersScreen({ navigation }) {
  const { token } = useAuth();
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [ordersList, setOrdersList] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [modalSearch, setModalSearch] = useState('');
  const [todayStr, setTodayStr] = useState(getLocalDateStr());

  React.useEffect(() => {
    if (token) getDriverToday(token).then((t) => setTodayStr(t || getLocalDateStr()));
  }, [token]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const today = todayStr || getLocalDateStr();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const data = await getPendingOrdersByArea(token, getLocalDateStr(weekAgo), today);
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

  const openAreaOrders = async (date, area) => {
    if (!token) return;
    setSelectedDate(date);
    setSelectedArea(area);
    setShowModal(true);
    setOrdersLoading(true);
    setOrdersList([]);
    setModalSearch('');
    try {
      const list = await getPendingOrdersList(token, date, area);
      setOrdersList(Array.isArray(list) ? list : []);
    } catch (e) {
      Alert.alert('خطأ', e.message || 'فشل تحميل الطلبات');
    } finally {
      setOrdersLoading(false);
    }
  };

  const filteredDays = days.filter((d) => ((d.countKarkh || 0) + (d.countRusafa || 0)) > 0);
  const totalPending = filteredDays.reduce(
    (sum, d) => sum + (d.countKarkh || 0) + (d.countRusafa || 0),
    0
  );

  const filteredModalOrders = useMemo(
    () => searchOrders(ordersList, modalSearch),
    [ordersList, modalSearch]
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="الطلبات المنتظرة"
        subtitle={`${totalPending} طلب بانتظار الاستلام — اضغط المنطقة لعرض التفاصيل`}
        compact
      />

      {loading && filteredDays.length === 0 ? (
        <LoadingView message="جاري تحميل الطلبات المنتظرة..." />
      ) : filteredDays.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="لا توجد طلبات منتظرة"
          subtitle="ستظهر هنا الطلبات الجاهزة للاستلام حسب التاريخ والمنطقة"
        />
      ) : (
        <FlatList
          data={filteredDays}
          keyExtractor={(item) => item.orderDate}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[THEME.primary]} />
          }
          renderItem={({ item }) => {
            const total = (item.countKarkh || 0) + (item.countRusafa || 0);
            return (
              <View style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <Ionicons name="calendar-outline" size={18} color={THEME.primary} />
                  <Text style={styles.dayDate}>{formatDateAr(item.orderDate)}</Text>
                  <View style={styles.totalPill}>
                    <Text style={styles.totalPillText}>{total}</Text>
                  </View>
                </View>
                <View style={styles.areaRow}>
                  <PressableArea
                    label="الكرخ"
                    count={item.countKarkh || 0}
                    style={styles.karkh}
                    onPress={() => openAreaOrders(item.orderDate, 'الكرخ')}
                  />
                  <PressableArea
                    label="الرصافة"
                    count={item.countRusafa || 0}
                    style={styles.rusafa}
                    onPress={() => openAreaOrders(item.orderDate, 'الرصافة')}
                  />
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalRoot}>
          <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View style={[styles.modalSheet, { height: MODAL_HEIGHT }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedArea}</Text>
                <Text style={styles.modalSubtitle}>{formatDateAr(selectedDate)}</Text>
              </View>
              <Pressable onPress={() => setShowModal(false)} hitSlop={12}>
                <Ionicons name="close-circle" size={28} color={THEME.textLight} />
              </Pressable>
            </View>

            {ordersLoading ? (
              <LoadingView message="جاري تحميل الطلبات..." />
            ) : ordersList.length === 0 ? (
              <EmptyState icon="cube-outline" title="لا توجد طلبات" />
            ) : (
              <>
                <SearchBar
                  value={modalSearch}
                  onChangeText={setModalSearch}
                  placeholder="بحث في الطلبات..."
                  onClear={() => setModalSearch('')}
                />
                <FlatList
                  data={filteredModalOrders}
                  keyExtractor={(o) => String(o.OrderID)}
                  contentContainerStyle={styles.modalList}
                  ListEmptyComponent={
                    <EmptyState icon="search-outline" title="لا توجد نتائج" subtitle="جرّب كلمة بحث أخرى" />
                  }
                  renderItem={({ item: o }) => (
                    <OrderCard
                      order={o}
                      compact
                      showQuickActions={false}
                      onPress={() => {
                        setShowModal(false);
                        navigation?.navigate('OrderDetail', { order: o, readOnly: true });
                      }}
                    />
                  )}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PressableArea({ label, count, style, onPress }) {
  return (
    <Pressable style={[styles.areaBadge, style]} onPress={onPress} android_ripple={{ color: 'rgba(0,0,0,0.08)' }}>
      <Text style={styles.areaCount}>{count}</Text>
      <Text style={styles.areaLabel}>{label}</Text>
      <Text style={styles.areaHint}>اضغط للعرض</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  list: { padding: THEME.spaceLg, paddingBottom: THEME.space3xl },
  dayCard: {
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusXl,
    padding: THEME.spaceLg,
    marginBottom: THEME.spaceMd,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    ...THEME.shadowMd,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spaceSm,
    marginBottom: THEME.spaceMd,
  },
  dayDate: { flex: 1, fontSize: THEME.fontMd, fontWeight: '800', color: THEME.text },
  totalPill: {
    backgroundColor: THEME.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: THEME.radiusFull,
  },
  totalPillText: { fontSize: THEME.fontSm, fontWeight: '900', color: THEME.primaryDark },
  areaRow: { flexDirection: 'row', gap: THEME.spaceSm },
  areaBadge: {
    flex: 1,
    borderRadius: THEME.radiusLg,
    padding: THEME.spaceLg,
    alignItems: 'center',
  },
  karkh: { backgroundColor: THEME.primarySoft },
  rusafa: { backgroundColor: THEME.accentPurpleSoft },
  areaCount: { fontSize: 32, fontWeight: '900', color: THEME.text },
  areaLabel: { fontSize: THEME.fontMd, fontWeight: '700', color: THEME.textSecondary, marginTop: 4 },
  areaHint: { fontSize: THEME.fontXs, color: THEME.textMuted, marginTop: 6, fontWeight: '600' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  modalSheet: {
    backgroundColor: THEME.bgCard,
    borderTopLeftRadius: THEME.radiusXl,
    borderTopRightRadius: THEME.radiusXl,
    paddingHorizontal: THEME.spaceLg,
    paddingBottom: THEME.space2xl,
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: THEME.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: THEME.spaceMd,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spaceMd,
  },
  modalTitle: { fontSize: THEME.fontXl, fontWeight: '900', color: THEME.text },
  modalSubtitle: { fontSize: THEME.fontSm, color: THEME.textMuted, marginTop: 2 },
  modalList: { paddingBottom: THEME.space2xl, paddingHorizontal: 0 },
});
