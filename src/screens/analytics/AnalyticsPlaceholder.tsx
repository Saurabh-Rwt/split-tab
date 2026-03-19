import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../constants/colors';

export const AnalyticsPlaceholder = () => (
  <View style={styles.wrap}>
    <Text style={styles.emoji}>📊</Text>
    <Text style={styles.title}>Analytics</Text>
    <Text style={styles.sub}>Coming in Part 6</Text>
  </View>
);

const styles = StyleSheet.create({
  wrap:  { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emoji: { fontSize: 48 },
  title: { fontSize: Typography.lg, fontWeight: '700', color: Colors.textPrimary },
  sub:   { fontSize: Typography.sm, color: Colors.textMuted },
});