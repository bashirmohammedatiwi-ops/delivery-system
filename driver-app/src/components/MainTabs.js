import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import OrdersScreen from '../screens/OrdersScreen';
import ReceiveOrderScreen from '../screens/ReceiveOrderScreen';
import PendingOrdersScreen from '../screens/PendingOrdersScreen';
import StatsScreen from '../screens/StatsScreen';
import OrdersHistoryScreen from '../screens/OrdersHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { THEME } from '../theme';

const TABS = [
  { key: 'orders', label: 'طلباتي', icon: 'cube-outline', iconActive: 'cube' },
  { key: 'receive', label: 'استلام', icon: 'camera-outline', iconActive: 'camera' },
  { key: 'pending', label: 'منتظرة', icon: 'time-outline', iconActive: 'time' },
  { key: 'stats', label: 'إحصائيات', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  { key: 'history', label: 'السجل', icon: 'document-text-outline', iconActive: 'document-text' },
  { key: 'settings', label: 'إعدادات', icon: 'settings-outline', iconActive: 'settings' },
];

export default function MainTabs({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('orders');

  const renderScreen = () => {
    switch (tab) {
      case 'orders':
        return <OrdersScreen navigation={navigation} />;
      case 'receive':
        return <ReceiveOrderScreen navigation={navigation} />;
      case 'pending':
        return <PendingOrdersScreen />;
      case 'stats':
        return <StatsScreen />;
      case 'history':
        return <OrdersHistoryScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <OrdersScreen navigation={navigation} />;
    }
  };

  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <View style={styles.container}>
      <View style={styles.content}>{renderScreen()}</View>
      <View style={[styles.tabBar, { paddingBottom: bottomPadding }]}>
        {TABS.map((t) => {
          const isActive = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Ionicons
                  name={isActive ? t.iconActive : t.icon}
                  size={22}
                  color={isActive ? THEME.primary : THEME.textMuted}
                />
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.bgCard,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
    ...THEME.shadowMd,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {},
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: THEME.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconWrapActive: {
    backgroundColor: THEME.primarySoft,
  },
  tabLabel: {
    fontSize: 10,
    color: THEME.textMuted,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: THEME.primary,
    fontWeight: '700',
  },
});
