import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TabNavProvider } from '../context/TabNavContext';
import { useAppData } from '../context/AppDataContext';
import HomeScreen from '../screens/HomeScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ReceiveOrderScreen from '../screens/ReceiveOrderScreen';
import PendingOrdersScreen from '../screens/PendingOrdersScreen';
import MenuScreen from '../screens/MenuScreen';
import StatsScreen from '../screens/StatsScreen';
import OrdersHistoryScreen from '../screens/OrdersHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpScreen from '../screens/HelpScreen';
import AppHeader from '../components/AppHeader';
import { THEME } from '../theme';

const MAIN_TABS = [
  { key: 'home', label: 'الرئيسية', icon: 'home-outline', iconActive: 'home' },
  { key: 'orders', label: 'طلباتي', icon: 'layers-outline', iconActive: 'layers', badgeKey: 'orders' },
  { key: 'scan', label: 'استلام', icon: 'scan', iconActive: 'scan', center: true },
  { key: 'pending', label: 'منتظرة', icon: 'time-outline', iconActive: 'time', badgeKey: 'pending' },
  { key: 'menu', label: 'المزيد', icon: 'grid-outline', iconActive: 'grid', badgeKey: 'deferred' },
];

function TabBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

export default function MainTabs({ navigation }) {
  const insets = useSafeAreaInsets();
  const { orders, pendingCount, deferredCount, refresh } = useAppData();
  const [tab, setTabState] = useState('home');
  const [menuView, setMenuView] = useState('main');
  const [ordersFilter, setOrdersFilter] = useState('all');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const setTab = useCallback((nextTab) => {
    setTabState(nextTab);
    if (nextTab !== 'menu') setMenuView('main');
  }, []);

  const badges = useMemo(
    () => ({
      orders: orders.length,
      pending: pendingCount,
      deferred: deferredCount,
    }),
    [orders.length, pendingCount, deferredCount]
  );

  const tabNavValue = useMemo(
    () => ({
      setTab,
      ordersFilter,
      setOrdersFilter,
      openMenuView: (view) => {
        setTabState('menu');
        setMenuView(view || 'main');
      },
    }),
    [setTab, ordersFilter]
  );

  const renderContent = () => {
    if (tab === 'menu' && menuView !== 'main') {
      const back = () => setMenuView('main');
      if (menuView === 'stats') {
        return (
          <View style={styles.subScreen}>
            <AppHeader title="الإحصائيات" subtitle="أداءك اليومي" onBack={back} compact />
            <StatsScreen />
          </View>
        );
      }
      if (menuView === 'history') {
        return (
          <View style={styles.subScreen}>
            <AppHeader title="سجل الطلبات" subtitle="الموصّل والمرتجع" onBack={back} compact />
            <OrdersHistoryScreen />
          </View>
        );
      }
      if (menuView === 'settings') {
        return (
          <View style={styles.subScreen}>
            <AppHeader title="الإعدادات" onBack={back} compact />
            <SettingsScreen />
          </View>
        );
      }
      if (menuView === 'help') {
        return <HelpScreen onBack={back} />;
      }
    }

    switch (tab) {
      case 'home':
        return <HomeScreen navigation={navigation} />;
      case 'orders':
        return <OrdersScreen navigation={navigation} initialFilter={ordersFilter} />;
      case 'scan':
        return (
          <View style={styles.subScreen}>
            <AppHeader title="استلام طلب" subtitle="مسح الباركود أو إدخال الرقم يدوياً" compact />
            <ReceiveOrderScreen navigation={navigation} />
          </View>
        );
      case 'pending':
        return <PendingOrdersScreen navigation={navigation} />;
      case 'menu':
        return <MenuScreen onNavigate={setMenuView} deferredCount={deferredCount} />;
      default:
        return <HomeScreen navigation={navigation} />;
    }
  };

  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <TabNavProvider value={tabNavValue}>
      <View style={styles.container}>
        <View style={styles.content}>{renderContent()}</View>

        <View style={[styles.tabBar, { paddingBottom: bottomPad }]}>
          <View style={styles.tabBarInner}>
            {MAIN_TABS.map((t) => {
              const active = tab === t.key;
              const badgeCount = t.badgeKey ? badges[t.badgeKey] : 0;

              if (t.center) {
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={styles.fabWrap}
                    onPress={() => setTab('scan')}
                    activeOpacity={0.9}
                  >
                    <View style={[styles.fab, active && styles.fabActive]}>
                      <Ionicons name="scan" size={28} color="#fff" />
                    </View>
                    <Text style={[styles.fabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={t.key}
                  style={styles.tab}
                  onPress={() => setTab(t.key)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
                    <Ionicons
                      name={active ? t.iconActive : t.icon}
                      size={22}
                      color={active ? THEME.primary : THEME.textMuted}
                    />
                    <TabBadge count={badgeCount} />
                  </View>
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </TabNavProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  content: { flex: 1 },
  subScreen: { flex: 1 },
  tabBar: {
    backgroundColor: THEME.bgCard,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
    ...THEME.shadowLg,
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
  },
  tabIconWrap: {
    width: 44,
    height: 38,
    borderRadius: THEME.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabIconWrapActive: { backgroundColor: THEME.primarySoft },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.textMuted,
    marginTop: 2,
  },
  tabLabelActive: { color: THEME.primary, fontWeight: '800' },
  badge: {
    position: 'absolute',
    top: 0,
    left: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: THEME.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: THEME.bgCard,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  fabWrap: {
    flex: 1,
    alignItems: 'center',
    marginTop: -24,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: THEME.bgCard,
    ...THEME.shadowFab,
  },
  fabActive: { backgroundColor: THEME.primaryDark },
  fabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.textMuted,
    marginTop: 4,
  },
});
