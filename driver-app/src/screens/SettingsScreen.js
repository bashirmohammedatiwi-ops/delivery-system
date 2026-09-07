import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { THEME } from '../theme';

export default function SettingsScreen() {
  const { driver, logout } = useAuth();
  const { refresh, lastUpdated, orders, pendingCount } = useAppData();
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تسجيل الخروج', style: 'destructive', onPress: logout },
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
    Alert.alert('تم', 'تم تحديث البيانات');
  };

  const lastUpdateText = lastUpdated
    ? lastUpdated.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={36} color={THEME.primary} />
        </View>
        <Text style={styles.label}>اسم السائق</Text>
        <Text style={styles.driverName}>{driver?.DriverName || '—'}</Text>
        {driver?.Username ? <Text style={styles.username}>@{driver.Username}</Text> : null}
      </View>

      <View style={styles.infoGrid}>
        <InfoBox icon="cube" label="طلبات معك" value={String(orders.length)} color={THEME.primary} />
        <InfoBox icon="time" label="منتظرة" value={String(pendingCount)} color={THEME.accentBlue} />
      </View>

      <TouchableOpacity style={styles.actionRow} onPress={handleRefresh} disabled={refreshing} activeOpacity={0.85}>
        <View style={[styles.actionIcon, { backgroundColor: THEME.primarySoft }]}>
          <Ionicons name="refresh" size={20} color={THEME.primary} />
        </View>
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>تحديث البيانات</Text>
          <Text style={styles.actionSub}>آخر تحديث: {lastUpdateText}</Text>
        </View>
        <Ionicons name="chevron-back" size={18} color={THEME.textLight} />
      </TouchableOpacity>

      <View style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>عن التطبيق</Text>
        <Text style={styles.aboutLine}>تطبيق السائق — شركة ديما الحياة</Text>
          <Text style={styles.aboutLine}>الإصدار 2.1 • تصميم محدّث</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={22} color="#fff" />
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoBox({ icon, label, value, color }) {
  return (
    <View style={styles.infoBox}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.infoValue, { color }]}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: THEME.spaceLg, paddingBottom: THEME.space3xl },
  profileCard: {
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusXl,
    padding: THEME.space2xl,
    alignItems: 'center',
    marginBottom: THEME.spaceLg,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    ...THEME.shadowMd,
  },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: THEME.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: THEME.spaceMd,
  },
  label: { fontSize: THEME.fontSm, color: THEME.textMuted, fontWeight: '600' },
  driverName: { fontSize: THEME.font2xl, fontWeight: '900', color: THEME.text, marginTop: 4 },
  username: { fontSize: THEME.fontSm, color: THEME.textMuted, marginTop: 4, fontWeight: '600' },
  infoGrid: { flexDirection: 'row', gap: THEME.spaceSm, marginBottom: THEME.spaceLg },
  infoBox: {
    flex: 1, backgroundColor: THEME.bgCard, borderRadius: THEME.radiusLg, padding: THEME.spaceLg,
    alignItems: 'center', borderWidth: 1, borderColor: THEME.borderLight, ...THEME.shadowSm,
  },
  infoValue: { fontSize: THEME.font2xl, fontWeight: '900', marginTop: 6 },
  infoLabel: { fontSize: THEME.fontXs, color: THEME.textMuted, fontWeight: '700', marginTop: 2 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusLg, padding: THEME.spaceLg, marginBottom: THEME.spaceLg,
    borderWidth: 1, borderColor: THEME.borderLight, ...THEME.shadowSm,
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: THEME.spaceMd,
  },
  actionText: { flex: 1 },
  actionTitle: { fontSize: THEME.fontMd, fontWeight: '800', color: THEME.text },
  actionSub: { fontSize: THEME.fontSm, color: THEME.textMuted, marginTop: 2 },
  aboutCard: {
    backgroundColor: THEME.bgMuted, borderRadius: THEME.radiusLg, padding: THEME.spaceLg, marginBottom: THEME.spaceXl,
  },
  aboutTitle: { fontSize: THEME.fontMd, fontWeight: '900', color: THEME.text, marginBottom: 8 },
  aboutLine: { fontSize: THEME.fontSm, color: THEME.textMuted, marginBottom: 4, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: THEME.danger, borderRadius: THEME.radiusLg, paddingVertical: 16, ...THEME.shadowSm,
  },
  logoutText: { color: '#fff', fontSize: THEME.fontMd, fontWeight: '800' },
});
