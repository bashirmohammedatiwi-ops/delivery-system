import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { useTabNav } from '../context/TabNavContext';
import { getGreeting, isDeferredOrder } from '../utils/format';
import { calcTotalAmountDue } from '../utils/amountUtils';
import { getDriverDeliveredOrders, getDriverReturnedOrders, getDriverToday } from '../api';
import { getLocalDateStr } from '../utils/dateUtils';
import AppHeader from '../components/AppHeader';
import OrderCard from '../components/OrderCard';
import ProgressCard from '../components/ProgressCard';
import EarningsHero from '../components/EarningsHero';
import ActivityFeed from '../components/ActivityFeed';
import SyncBadge from '../components/SyncBadge';
import { SkeletonHome } from '../components/SkeletonLoader';
import { THEME } from '../theme';

function QuickAction({ icon, label, color, bg, badge, onPress }) {
  return (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.85}>
      {badge > 0 ? (
        <View style={styles.quickBadge}>
          <Text style={styles.quickBadgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      <View style={[styles.quickIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={22} color="#fff" />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function TipCard({ icon, title, text }) {
  return (
    <View style={styles.tipCard}>
      <View style={styles.tipIcon}>
        <Ionicons name={icon} size={20} color={THEME.primary} />
      </View>
      <View style={styles.tipBody}>
        <Text style={styles.tipTitle}>{title}</Text>
        <Text style={styles.tipText}>{text}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { driver, token } = useAuth();
  const { setTab, setOrdersFilter, openMenuView } = useTabNav();
  const { orders, stats, pendingCount, deferredCount, activeCount, loading, refresh, lastUpdated } = useAppData();
  const [refreshing, setRefreshing] = useState(false);
  const [totalDue, setTotalDue] = useState(0);
  const [activity, setActivity] = useState([]);

  React.useEffect(() => {
    if (!token) return;
    getDriverToday(token)
      .then(async (today) => {
        const d = today || getLocalDateStr();
        const [delivered, returned] = await Promise.all([
          getDriverDeliveredOrders(token, d),
          getDriverReturnedOrders(token, d),
        ]);
        setTotalDue(calcTotalAmountDue(delivered));
        const feed = [
          ...(delivered || []).map((o) => ({ ...o, type: 'delivered' })),
          ...(returned || []).map((o) => ({ ...o, type: 'returned' })),
        ].sort((a, b) => {
          const ta = new Date(a.DeliveredDate || a.ReturnedDate || 0).getTime();
          const tb = new Date(b.DeliveredDate || b.ReturnedDate || 0).getTime();
          return tb - ta;
        });
        setActivity(feed);
      })
      .catch(() => {});
  }, [token, stats?.delivered, stats?.returned]);

  const recentOrders = orders.slice(0, 4);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (loading && !stats) {
    return (
      <View style={styles.container}>
        <AppHeader title={`${getGreeting()} 👋`} subtitle={driver?.DriverName || 'السائق'} compact />
        <SkeletonHome />
      </View>
    );
  }

  const tip =
    deferredCount > 0
      ? { icon: 'pause-circle-outline', title: 'لديك طلبات مؤجلة', text: `${deferredCount} طلب مؤجل — راجعها وأكمل التوصيل` }
      : pendingCount > 0
        ? { icon: 'time-outline', title: 'طلبات بانتظار الاستلام', text: `${pendingCount} طلب جاهز — يمكنك استلامها الآن` }
        : { icon: 'scan-outline', title: 'ابدأ يومك', text: 'امسح باركود الشحنة لاستلام طلب جديد بسرعة' };

  return (
    <View style={styles.container}>
      <AppHeader
        title={`${getGreeting()} 👋`}
        subtitle={driver?.DriverName ? `${driver.DriverName} — لوحة التحكم` : 'لوحة تحكم السائق'}
        badge="شركة ديما الحياة"
        compact
      >
        <SyncBadge lastUpdated={lastUpdated} loading={refreshing || loading} />
      </AppHeader>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />
        }
      >
        <TipCard icon={tip.icon} title={tip.title} text={tip.text} />

        <EarningsHero
          delivered={stats?.delivered ?? 0}
          returned={stats?.returned ?? 0}
          totalDue={totalDue}
          onPressStats={() => openMenuView('stats')}
        />

        <ProgressCard
          delivered={stats?.delivered ?? 0}
          returned={stats?.returned ?? 0}
          assigned={orders.length}
          totalDue={totalDue}
        />

        <View style={styles.statsRow}>
          <StatPill label="معك" value={orders.length} color={THEME.primary} />
          <StatPill label="نشطة" value={activeCount} color={THEME.success} />
          <StatPill label="مؤجلة" value={deferredCount} color={THEME.warning} />
          <StatPill label="منتظرة" value={pendingCount} color={THEME.accentBlue} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>إجراءات سريعة</Text>
          <View style={styles.quickGrid}>
            <QuickAction icon="scan" label="استلام" color={THEME.primary} bg="#ecfdf5" onPress={() => setTab('scan')} />
            <QuickAction icon="layers" label="طلباتي" color={THEME.accentBlue} bg="#eff6ff" badge={orders.length} onPress={() => { setOrdersFilter('all'); setTab('orders'); }} />
            <QuickAction icon="time" label="منتظرة" color={THEME.accentPurple} bg="#f5f3ff" badge={pendingCount} onPress={() => setTab('pending')} />
            <QuickAction icon="pause-circle" label="مؤجلة" color={THEME.warning} bg="#fffbeb" badge={deferredCount} onPress={() => { setOrdersFilter('deferred'); setTab('orders'); }} />
          </View>
        </View>

        <ActivityFeed
          items={activity}
          onPressItem={(item) => navigation.navigate('OrderDetail', { order: item, readOnly: true })}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>طلباتك الحالية</Text>
            {orders.length > 0 ? (
              <TouchableOpacity onPress={() => setTab('orders')}>
                <Text style={styles.sectionLink}>عرض الكل ({orders.length})</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {recentOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cube-outline" size={36} color={THEME.primary} />
              </View>
              <Text style={styles.emptyTitle}>لا توجد طلبات معك</Text>
              <Text style={styles.emptySub}>استلم طلباً جديداً للبدء</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setTab('scan')}>
                <Ionicons name="scan" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>استلام الآن</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentOrders.map((order) => (
              <OrderCard
                key={order.OrderID}
                order={order}
                compact
                showQuickActions={!isDeferredOrder(order)}
                onPress={() => navigation.navigate('OrderDetail', { order })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatPill({ label, value, color }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statPillValue, { color }]}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: THEME.space3xl },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spaceMd,
    marginHorizontal: THEME.spaceLg,
    marginBottom: THEME.spaceMd,
    marginTop: -THEME.spaceSm,
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusLg,
    padding: THEME.spaceMd,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    ...THEME.shadowSm,
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipBody: { flex: 1 },
  tipTitle: { fontSize: THEME.fontMd, fontWeight: '900', color: THEME.text },
  tipText: { fontSize: THEME.fontSm, color: THEME.textMuted, marginTop: 2, lineHeight: 20, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    gap: THEME.spaceSm,
    paddingHorizontal: THEME.spaceLg,
    marginBottom: THEME.spaceLg,
  },
  statPill: {
    flex: 1,
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusMd,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },
  statPillValue: { fontSize: THEME.fontXl, fontWeight: '900' },
  statPillLabel: { fontSize: 10, color: THEME.textMuted, fontWeight: '700', marginTop: 2 },
  section: { paddingHorizontal: THEME.spaceLg, marginBottom: THEME.spaceXl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spaceMd,
  },
  sectionTitle: { fontSize: THEME.fontLg, fontWeight: '900', color: THEME.text },
  sectionLink: { fontSize: THEME.fontSm, fontWeight: '800', color: THEME.primary },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: THEME.spaceSm },
  quickAction: {
    width: '48%',
    flexGrow: 1,
    borderRadius: THEME.radiusLg,
    padding: THEME.spaceLg,
    alignItems: 'center',
    position: 'relative',
    ...THEME.shadowSm,
  },
  quickBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    zIndex: 1,
  },
  quickBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  quickIcon: {
    width: 50,
    height: 50,
    borderRadius: THEME.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spaceSm,
  },
  quickLabel: { fontSize: THEME.fontSm, fontWeight: '800', color: THEME.textSecondary },
  emptyCard: {
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusXl,
    padding: THEME.space2xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.borderLight,
    ...THEME.shadowMd,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spaceMd,
  },
  emptyTitle: { fontSize: THEME.fontLg, fontWeight: '900', color: THEME.text },
  emptySub: { fontSize: THEME.fontSm, color: THEME.textMuted, marginTop: 4, marginBottom: THEME.spaceLg },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.primary,
    paddingHorizontal: THEME.space2xl,
    paddingVertical: 14,
    borderRadius: THEME.radiusFull,
    ...THEME.shadowSm,
  },
  emptyBtnText: { color: '#fff', fontWeight: '900', fontSize: THEME.fontMd },
});
