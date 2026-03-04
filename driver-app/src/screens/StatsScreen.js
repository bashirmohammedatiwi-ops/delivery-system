import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getDriverStats, getDriverDeliveredOrders } from '../api';
import { calcTotalAmountDue } from '../utils/amountUtils';

function formatIQD(n) {
  return new Intl.NumberFormat('ar-IQ').format(n || 0) + ' د.ع';
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateShort(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' });
}

export default function StatsScreen() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const [statsData, deliveredOrders] = await Promise.all([
        getDriverStats(token, selectedDate),
        getDriverDeliveredOrders(token, selectedDate),
      ]);
      const totalAmountDue = calcTotalAmountDue(deliveredOrders);
      setStats({ ...statsData, totalAmountDue });
    } catch (e) {
      Alert.alert('خطأ', e.message || 'فشل تحميل الإحصائيات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, selectedDate]);

  React.useEffect(() => {
    setLoading(true);
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const goPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const goNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const today = new Date().toISOString().slice(0, 10);
    if (d.toISOString().slice(0, 10) <= today) {
      setSelectedDate(d.toISOString().slice(0, 10));
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const canGoNext = selectedDate < todayStr;

  if (loading && !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>جاري تحميل الإحصائيات...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ea5e9']} />
      }
    >
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

      <Text style={styles.dateTitle}>تاريخ الطلب: {formatDate(selectedDate)}</Text>

      <View style={styles.cardsRow}>
        <View style={[styles.statCard, styles.cardGreen]}>
          <Text style={styles.statValue}>{stats?.delivered ?? 0}</Text>
          <Text style={styles.statLabel}>تم التوصيل</Text>
        </View>
        <View style={[styles.statCard, styles.cardRed]}>
          <Text style={styles.statValue}>{stats?.returned ?? 0}</Text>
          <Text style={styles.statLabel}>تم الإرجاع</Text>
        </View>
      </View>

      <View style={[styles.statCard, styles.cardGray, styles.orderCountCard]}>
        <Text style={styles.statValue}>{stats?.orderCount ?? 0}</Text>
        <Text style={styles.statLabel}>عدد الطلبات</Text>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownText}>تم التوصيل: {stats?.delivered ?? 0}</Text>
          <Text style={styles.breakdownText}>تم الإرجاع: {stats?.returned ?? 0}</Text>
          <Text style={styles.breakdownText}>لم يوصل: {stats?.notDelivered ?? 0}</Text>
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={[styles.statCard, styles.cardPurple]}>
          <Text style={[styles.statValue, styles.amountText]}>{formatIQD(stats?.totalDeliveredIQD)}</Text>
          <Text style={styles.statLabel}>المبلغ الكلي (الموصّل)</Text>
        </View>
        <View style={[styles.statCard, styles.cardTeal]}>
          <Text style={[styles.statValue, styles.amountText]}>{formatIQD(stats?.totalAmountDue)}</Text>
          <Text style={styles.statLabel}>المبلغ المستحق</Text>
        </View>
      </View>

      {stats?.feesCollected !== undefined && (
        <View style={[styles.feeBadge, stats.feesCollected ? styles.feePaid : styles.feeUnpaid]}>
          <Text style={[styles.feeBadgeText, stats.feesCollected ? styles.feeBadgeTextPaid : styles.feeBadgeTextUnpaid]}>
            {stats.feesCollected ? '✓ تم تسديد المستحقات الخاصة بذلك اليوم' : '○ لم يُسدّد المستحقات الخاصة بهذا اليوم بعد'}
          </Text>
        </View>
      )}

      <View style={styles.totalFooter}>
        <Text style={styles.totalFooterLabel}>العدد الكلي المعك حالياً</Text>
        <Text style={styles.totalFooterValue}>{stats?.assigned ?? 0}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 15 },
  dateNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  dateBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#0ea5e9',
    borderRadius: 10,
  },
  dateBtnDisabled: { backgroundColor: '#cbd5e1' },
  dateBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  dateBtnTextDisabled: { color: '#64748b' },
  dateLabel: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  dateTitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardGreen: { backgroundColor: '#10b981' },
  cardRed: { backgroundColor: '#ef4444' },
  cardBlue: { backgroundColor: '#0ea5e9' },
  cardPurple: { backgroundColor: '#8b5cf6' },
  cardTeal: { backgroundColor: '#0d9488' },
  cardGray: { backgroundColor: '#64748b' },
  cardOrange: { backgroundColor: '#f97316' },
  orderCountCard: { marginBottom: 12, alignSelf: 'stretch' },
  statValue: { fontSize: 28, fontWeight: '800', color: '#fff' },
  amountText: { fontSize: 16 },
  statLabel: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  breakdownRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 10 },
  breakdownText: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  feeBadge: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  feePaid: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#22c55e' },
  feeUnpaid: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#f59e0b' },
  feeBadgeText: { fontSize: 15, fontWeight: '600' },
  feeBadgeTextPaid: { color: '#166534' },
  feeBadgeTextUnpaid: { color: '#b45309' },
  totalFooter: {
    marginTop: 24,
    padding: 20,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    alignItems: 'center',
  },
  totalFooterLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  totalFooterValue: { fontSize: 32, fontWeight: '800', color: '#fff' },
});
