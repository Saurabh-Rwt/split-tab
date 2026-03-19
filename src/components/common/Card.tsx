import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '../../constants/colors';

interface Props {
  children: React.ReactNode;
  style?:   ViewStyle;
}

export const Card = ({ children, style }: Props) => (
  <View style={[styles.card, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius:    Radius.lg,
    padding:         Spacing.base,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
});