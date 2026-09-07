import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { THEME } from '../theme';

export default function LoadingView({ message = 'جاري التحميل...' }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={THEME.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.space2xl,
  },
  text: {
    marginTop: THEME.spaceMd,
    fontSize: THEME.fontMd,
    color: THEME.textMuted,
    fontWeight: '600',
  },
});
