import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { THEME } from '../theme';

export default function RegionFilter({ regions, value, onChange }) {
  if (!regions.length) return null;
  const options = [{ key: 'all', label: 'كل المناطق' }, ...regions.map((r) => ({ key: r, label: r }))];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.85}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: THEME.spaceLg,
    paddingBottom: THEME.spaceMd,
    gap: THEME.spaceSm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radiusFull,
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
    maxWidth: 140,
  },
  chipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  chipText: { fontSize: THEME.fontSm, fontWeight: '700', color: THEME.textMuted },
  chipTextActive: { color: '#fff' },
});
