import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { THEME } from '../theme';

function Bone({ style }) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[styles.bone, style, { opacity }]} />;
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Bone style={styles.lineShort} />
      <Bone style={styles.lineTitle} />
      <Bone style={styles.lineBody} />
      <Bone style={styles.lineBody2} />
    </View>
  );
}

export function SkeletonHome() {
  return (
    <View style={styles.wrap}>
      <Bone style={styles.hero} />
      <View style={styles.row3}>
        <Bone style={styles.box} />
        <Bone style={styles.box} />
        <Bone style={styles.box} />
      </View>
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

export function SkeletonList({ count = 4 }) {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: THEME.spaceLg, gap: THEME.spaceMd },
  bone: { backgroundColor: THEME.border, borderRadius: THEME.radiusSm },
  card: {
    backgroundColor: THEME.bgCard,
    borderRadius: THEME.radiusLg,
    padding: THEME.spaceLg,
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },
  lineShort: { width: '35%', height: 14, marginBottom: 12 },
  lineTitle: { width: '70%', height: 18, marginBottom: 10 },
  lineBody: { width: '100%', height: 12, marginBottom: 8 },
  lineBody2: { width: '55%', height: 12 },
  hero: { height: 120, borderRadius: THEME.radiusXl, marginBottom: THEME.spaceSm },
  row3: { flexDirection: 'row', gap: THEME.spaceSm, marginBottom: THEME.spaceMd },
  box: { flex: 1, height: 72, borderRadius: THEME.radiusMd },
});
