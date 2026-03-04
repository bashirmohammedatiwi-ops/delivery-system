import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import OrdersScreen from '../screens/OrdersScreen';
import ReceiveOrderScreen from '../screens/ReceiveOrderScreen';
import StatsScreen from '../screens/StatsScreen';
import OrdersHistoryScreen from '../screens/OrdersHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

const TABS = [
  { key: 'orders', label: 'طلباتي', icon: '📦' },
  { key: 'receive', label: 'استلام', icon: '📷' },
  { key: 'stats', label: 'إحصائيات', icon: '📊' },
  { key: 'history', label: 'السجل', icon: '📋' },
  { key: 'settings', label: 'إعدادات', icon: '⚙️' },
];

export default function MainTabs({ navigation }) {
  const [tab, setTab] = useState('orders');

  const renderScreen = () => {
    switch (tab) {
      case 'orders':
        return <OrdersScreen navigation={navigation} />;
      case 'receive':
        return <ReceiveOrderScreen navigation={navigation} />;
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

  return (
    <View style={styles.container}>
      <View style={styles.content}>{renderScreen()}</View>
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  tabIcon: { fontSize: 20, marginBottom: 2 },
  tabLabel: { fontSize: 11, color: '#64748b' },
  tabLabelActive: { color: '#0ea5e9', fontWeight: '600' },
});
