import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

export default function SortMenu({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <View style={styles.sortIcon}>
        <Ionicons name="funnel-outline" size={16} color={THEME.textMuted} />
      </View>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.85}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
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
    alignItems: 'center',
  },
  sortIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.radiusFull,
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  chipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  chipText: { fontSize: THEME.fontSm, fontWeight: '700', color: THEME.textMuted },
  chipTextActive: { color: '#fff' },
});
