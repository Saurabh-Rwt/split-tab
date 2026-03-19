import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppSelector } from '../../store';
import { selectIsOffline } from '../../store/slices/currencySlice';
import { Colors, Typography, Spacing, Radius } from '../../constants/colors';

export const OfflineBadge = () => {
  const isOffline = useAppSelector(selectIsOffline);
  if (!isOffline) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>📡  Offline — using cached rates</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.warning + '22',
    borderRadius:    Radius.sm,
    borderWidth:     1,
    borderColor:     Colors.warning + '55',
    paddingHorizontal: Spacing.md,
    paddingVertical:   4,
    alignSelf:       'flex-start',
    marginHorizontal: Spacing.base,
    marginBottom:    Spacing.sm,
  },
  text: {
    fontSize:   Typography.xs,
    color:      Colors.warning,
    fontWeight: '600',
  },
});