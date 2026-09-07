import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';

export default function EmptyState({ icon = 'cube-outline', title, subtitle }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={40} color={THEME.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: THEME.space2xl,
    paddingVertical: THEME.space3xl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spaceLg,
  },
  title: {
    fontSize: THEME.fontLg,
    fontWeight: '700',
    color: THEME.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spaceSm,
  },
  subtitle: {
    fontSize: THEME.fontSm,
    color: THEME.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
