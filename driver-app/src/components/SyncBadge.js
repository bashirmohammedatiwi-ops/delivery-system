import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

export default function SyncBadge({ lastUpdated, loading }) {
  const timeText = lastUpdated
    ? lastUpdated.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <View style={styles.wrap}>
      <Ionicons name={loading ? 'sync' : 'cloud-done-outline'} size={14} color="rgba(255,255,255,0.9)" />
      <Text style={styles.text}>
        {loading ? 'جاري التحديث...' : `آخر مزامنة ${timeText}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radiusFull,
    alignSelf: 'center',
  },
  text: { fontSize: THEME.fontXs, color: 'rgba(255,255,255,0.92)', fontWeight: '700' },
});
