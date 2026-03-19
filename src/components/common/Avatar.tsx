import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  name:  string;
  color: string;
  size?: number;
}

export const Avatar = ({ name, color, size = 40 }: Props) => {
  const fontSize     = size * 0.4;
  const borderRadius = size / 2;

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius, backgroundColor: color }]}>
      <Text style={[styles.initial, { fontSize }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  circle:  { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontWeight: '700' },
});