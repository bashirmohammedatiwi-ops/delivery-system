import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { useTabNav } from '../context/TabNavContext';
import AppHeader from '../components/AppHeader';
import MenuTile from '../components/MenuTile';
import { THEME } from '../theme';
import { formatIQD } from '../utils/format';

export default function MenuScreen({ onNavigate, deferredCount = 0 }) {
  const { driver } = useAuth();
  const { stats, orders, pendingCount } = useAppData();
  const { setTab, setOrdersFilter } = useTabNav();

  return (
    <View style={styles.container}>
      <AppHeader title="المزيد" subtitle="الإعدادات والسجل والإحصائيات" compact />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={THEME.primary} />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileLabel}>السائق</Text>
            <Text style={styles.profileName}>{driver?.DriverName || '—'}</Text>
          </View>
        </View>

        <View style={styles.statsPreview}>
          <PreviewStat icon="cube" label="معك" value={orders.length} color={THEME.primary} />
          <PreviewStat icon="checkmark-circle" label="موصّل" value={stats?.delivered ?? 0} color={THEME.success} />
          <PreviewStat icon="time" label="منتظرة" value={pendingCount} color={THEME.accentBlue} />
          <PreviewStat icon="cash" label="إيراد" value={formatIQD(stats?.totalDeliveredIQD).replace(' د.ع', '')} color={THEME.warning} small />
        </View>

        <Text style={styles.groupTitle}>العمليات</Text>
        <MenuTile
          icon="stats-chart"
          iconColor={THEME.success}
          iconBg={THEME.successSoft}
          title="الإحصائيات"
          subtitle="أداء اليوم والمبالغ"
          onPress={() => onNavigate('stats')}
        />
        <MenuTile
          icon="document-text"
          iconColor={THEME.accentBlue}
          iconBg={THEME.accentBlueSoft}
          title="سجل الطلبات"
          subtitle="الموصّل والمرتجع"
          onPress={() => onNavigate('history')}
        />
        <MenuTile
          icon="pause-circle"
          iconColor={THEME.warning}
          iconBg={THEME.warningSoft}
          title="الطلبات المؤجلة"
          subtitle="عرض وإدارة التأجيل"
          badge={deferredCount > 0 ? deferredCount : null}
          onPress={() => {
            setOrdersFilter('deferred');
            setTab('orders');
          }}
        />

        <Text style={styles.groupTitle}>التطبيق</Text>
        <MenuTile
          icon="help-buoy"
          iconColor={THEME.accentPurple}
          iconBg={THEME.accentPurpleSoft}
          title="دليل الاستخدام"
          subtitle="خطوات سريعة للسائق"
          onPress={() => onNavigate('help')}
        />
        <MenuTile
          icon="settings"
          iconColor={THEME.textSecondary}
          iconBg={THEME.bgMuted}
          title="الإعدادات"
          subtitle="الحساب وتحديث البيانات"
          onPress={() => onNavigate('settings')}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>تطبيق السائق • شركة ديما الحياة</Text>
          <Text style={styles.footerVersion}>الإصدار 2.1</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function PreviewStat({ icon, label, value, color, small }) {
  return (
    <View style={styles.previewStat}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.previewValue, small && styles.previewValueSmall]} numberOfLines={1}>{value}</Text>
      <Text style={styles.previewLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  content: { padding: THEME.spaceLg, paddingBottom: THEME.space3xl },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusXl,
    padding: THEME.spaceLg,
    marginBottom: THEME.spaceMd,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    ...THEME.shadowMd,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: THEME.spaceMd,
  },
  profileText: { flex: 1 },
  profileLabel: { fontSize: THEME.fontSm, color: THEME.textMuted, fontWeight: '600' },
  profileName: { fontSize: THEME.font2xl, fontWeight: '900', color: THEME.text, marginTop: 2 },
  statsPreview: {
    flexDirection: 'row',
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusLg,
    padding: THEME.spaceMd,
    marginBottom: THEME.spaceXl,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    ...THEME.shadowSm,
  },
  previewStat: { flex: 1, alignItems: 'center' },
  previewValue: { fontSize: THEME.fontLg, fontWeight: '900', color: THEME.text, marginTop: 4 },
  previewValueSmall: { fontSize: THEME.fontXs },
  previewLabel: { fontSize: 10, color: THEME.textMuted, fontWeight: '700', marginTop: 2 },
  groupTitle: {
    fontSize: THEME.fontSm,
    fontWeight: '800',
    color: THEME.textMuted,
    marginBottom: THEME.spaceSm,
    marginTop: THEME.spaceSm,
  },
  footer: { alignItems: 'center', marginTop: THEME.space2xl },
  footerText: { fontSize: THEME.fontSm, color: THEME.textMuted, fontWeight: '600' },
  footerVersion: { fontSize: THEME.fontXs, color: THEME.textLight, marginTop: 4 },
});
