import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { formatIQD } from '../utils/format';

export default function ProgressCard({ delivered = 0, returned = 0, assigned = 0, totalDue = 0 }) {
  const total = delivered + returned + assigned;
  const progress = total > 0 ? Math.round((delivered / total) * 100) : 0;
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>أداء اليوم</Text>
          <Text style={styles.subtitle}>نسبة إنجاز التوصيل</Text>
        </View>
        <View style={styles.percentBadge}>
          <Text style={styles.percentText}>{clamped}%</Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%` }]} />
      </View>

      <View style={styles.statsRow}>
        <MiniStat icon="checkmark-circle" color={THEME.success} label="موصّل" value={delivered} />
        <MiniStat icon="close-circle" color={THEME.danger} label="مرتجع" value={returned} />
        <MiniStat icon="cube" color={THEME.primary} label="معك" value={assigned} />
      </View>

      {totalDue > 0 ? (
        <View style={styles.dueRow}>
          <Ionicons name="wallet-outline" size={16} color={THEME.success} />
          <Text style={styles.dueText}>مستحق اليوم: {formatIQD(totalDue)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function MiniStat({ icon, color, label, value }) {
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: THEME.spaceLg,
    marginBottom: THEME.spaceLg,
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusXl,
    padding: THEME.spaceLg,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    ...THEME.shadowMd,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spaceMd,
  },
  title: { fontSize: THEME.fontLg, fontWeight: '900', color: THEME.text },
  subtitle: { fontSize: THEME.fontSm, color: THEME.textMuted, marginTop: 2, fontWeight: '600' },
  percentBadge: {
    backgroundColor: THEME.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radiusFull,
  },
  percentText: { fontSize: THEME.fontLg, fontWeight: '900', color: THEME.primaryDark },
  track: {
    height: 10,
    backgroundColor: THEME.bgMuted,
    borderRadius: THEME.radiusFull,
    overflow: 'hidden',
    marginBottom: THEME.spaceMd,
  },
  fill: {
    height: '100%',
    backgroundColor: THEME.primary,
    borderRadius: THEME.radiusFull,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  miniStat: { alignItems: 'center', flex: 1 },
  miniValue: { fontSize: THEME.fontXl, fontWeight: '900', color: THEME.text, marginTop: 4 },
  miniLabel: { fontSize: THEME.fontXs, color: THEME.textMuted, fontWeight: '700', marginTop: 2 },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: THEME.spaceMd,
    paddingTop: THEME.spaceMd,
    borderTopWidth: 1,
    borderTopColor: THEME.divider,
  },
  dueText: { fontSize: THEME.fontSm, fontWeight: '800', color: THEME.success },
});
