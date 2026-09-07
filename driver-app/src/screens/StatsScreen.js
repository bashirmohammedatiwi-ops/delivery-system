import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../theme';
import { getDriverStats, getDriverDeliveredOrders, getDriverToday } from '../api';
import { calcTotalAmountDue } from '../utils/amountUtils';
import { formatIQD } from '../utils/format';
import { getLocalDateStr, addDays } from '../utils/dateUtils';
import DateNavigator from '../components/DateNavigator';
import LoadingView from '../components/LoadingView';
import { Ionicons } from '@expo/vector-icons';

function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('ar-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateShort(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' });
}

function MetricCard({ icon, iconColor, iconBg, label, value, wide }) {
  return (
    <View style={[styles.metricCard, wide && styles.metricCardWide]}>
      <View style={[styles.metricIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function StatsScreen({ embedded = false }) {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr());
  const [todayStr, setTodayStr] = useState(getLocalDateStr());

  React.useEffect(() => {
    if (token) getDriverToday(token).then((t) => setTodayStr(t || getLocalDateStr()));
  }, [token]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const [statsData, deliveredOrders] = await Promise.all([
        getDriverStats(token, selectedDate),
        getDriverDeliveredOrders(token, selectedDate),
      ]);
      setStats({ ...statsData, totalAmountDue: calcTotalAmountDue(deliveredOrders) });
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

  if (loading && !stats) {
    return <LoadingView message="جاري تحميل الإحصائيات..." />;
  }

  const canGoNext = selectedDate < todayStr;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} colors={[THEME.primary]} />
      }
      showsVerticalScrollIndicator={false}
    >
      <DateNavigator
        label={formatDateShort(selectedDate)}
        onPrev={() => setSelectedDate(addDays(selectedDate, -1))}
        onNext={() => canGoNext && setSelectedDate(addDays(selectedDate, 1))}
        canGoNext={canGoNext}
      />
      <Text style={styles.dateTitle}>{formatDate(selectedDate)}</Text>

      <View style={styles.grid}>
        <MetricCard icon="checkmark-circle" iconColor={THEME.success} iconBg={THEME.successSoft} label="تم التوصيل" value={stats?.delivered ?? 0} />
        <MetricCard icon="close-circle" iconColor={THEME.danger} iconBg={THEME.dangerSoft} label="تم الإرجاع" value={stats?.returned ?? 0} />
        <MetricCard icon="layers" iconColor={THEME.accentBlue} iconBg={THEME.accentBlueSoft} label="عدد الطلبات" value={stats?.orderCount ?? 0} />
        <MetricCard icon="cube" iconColor={THEME.primary} iconBg={THEME.primarySoft} label="لم يوصل" value={stats?.notDelivered ?? 0} />
      </View>

      <View style={styles.amountCard}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>المبلغ الكلي (الموصّل)</Text>
          <Text style={styles.amountValue}>{formatIQD(stats?.totalDeliveredIQD)}</Text>
        </View>
        <View style={styles.amountDivider} />
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>المبلغ المستحق</Text>
          <Text style={[styles.amountValue, { color: THEME.primary }]}>{formatIQD(stats?.totalAmountDue)}</Text>
        </View>
      </View>

      {stats?.feesCollected !== undefined ? (
        <View style={[styles.feeBadge, stats.feesCollected ? styles.feePaid : styles.feeUnpaid]}>
          <Ionicons
            name={stats.feesCollected ? 'checkmark-circle' : 'alert-circle'}
            size={20}
            color={stats.feesCollected ? THEME.success : THEME.warning}
          />
          <Text style={[styles.feeText, stats.feesCollected ? styles.feeTextPaid : styles.feeTextUnpaid]}>
            {stats.feesCollected ? 'تم تسديد المستحقات لهذا اليوم' : 'لم يُسدّد المستحقات بعد'}
          </Text>
        </View>
      ) : null}

      <View style={styles.assignedCard}>
        <Text style={styles.assignedLabel}>الطلبات المعك حالياً</Text>
        <Text style={styles.assignedValue}>{stats?.assigned ?? 0}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  content: { paddingBottom: THEME.space3xl },
  dateTitle: {
    fontSize: THEME.fontSm,
    color: THEME.textMuted,
    textAlign: 'center',
    marginBottom: THEME.spaceLg,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spaceSm,
    paddingHorizontal: THEME.spaceLg,
    marginBottom: THEME.spaceMd,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusLg,
    padding: THEME.spaceLg,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    ...THEME.shadowSm,
  },
  metricCardWide: { width: '100%' },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spaceSm,
  },
  metricValue: { fontSize: THEME.font2xl, fontWeight: '900', color: THEME.text },
  metricLabel: { fontSize: THEME.fontSm, color: THEME.textMuted, fontWeight: '700', marginTop: 4 },
  amountCard: {
    marginHorizontal: THEME.spaceLg,
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusXl,
    padding: THEME.spaceLg,
    marginBottom: THEME.spaceMd,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    ...THEME.shadowMd,
  },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  amountLabel: { fontSize: THEME.fontMd, color: THEME.textSecondary, fontWeight: '700' },
  amountValue: { fontSize: THEME.fontLg, fontWeight: '900', color: THEME.success },
  amountDivider: { height: 1, backgroundColor: THEME.divider, marginVertical: THEME.spaceSm },
  feeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: THEME.spaceLg,
    padding: THEME.spaceLg,
    borderRadius: THEME.radiusLg,
    marginBottom: THEME.spaceMd,
  },
  feePaid: { backgroundColor: THEME.successSoft, borderWidth: 1, borderColor: 'rgba(5,150,105,0.2)' },
  feeUnpaid: { backgroundColor: THEME.warningSoft, borderWidth: 1, borderColor: 'rgba(217,119,6,0.2)' },
  feeText: { flex: 1, fontSize: THEME.fontSm, fontWeight: '800' },
  feeTextPaid: { color: THEME.success },
  feeTextUnpaid: { color: THEME.warning },
  assignedCard: {
    marginHorizontal: THEME.spaceLg,
    backgroundColor: THEME.primaryDark,
    borderRadius: THEME.radiusXl,
    padding: THEME.space2xl,
    alignItems: 'center',
    ...THEME.shadowMd,
  },
  assignedLabel: { fontSize: THEME.fontSm, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  assignedValue: { fontSize: 42, fontWeight: '900', color: '#fff', marginTop: 6 },
});
