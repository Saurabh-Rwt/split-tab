import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

import { Colors, Typography } from '../constants/colors';
import { MainTabParamList } from '../types';

import { GroupsPlaceholder } from '../screens/groups/GroupsPlaceholder';
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabIcon = ({
  emoji, label, focused,
}: { emoji: string; label: string; focused: boolean }) => (
  <View style={s.tabItem}>
    <Text style={[s.emoji, focused && s.emojiFocused]}>{emoji}</Text>
    <Text style={[s.label, focused && s.labelFocused]}>{label}</Text>
  </View>
);


export const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: s.tabBar,
      tabBarShowLabel: false,
    }}>
    <Tab.Screen
      name="GroupsTab"
      component={GroupsPlaceholder}
      options={{
        tabBarIcon: ({ focused }) =>
          <TabIcon emoji="👥" label="Groups" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="AnalyticsTab"
      component={AnalyticsScreen}
      options={{
        tabBarIcon: ({ focused }) =>
          <TabIcon emoji="📊" label="Analytics" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileScreen}
      options={{
        tabBarIcon: ({ focused }) =>
          <TabIcon emoji="👤" label="Profile" focused={focused} />,
      }}
    />
  </Tab.Navigator>
);

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 68,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: { alignItems: 'center', gap: 3 },
  emoji: { fontSize: 22, opacity: 0.4 },
  emojiFocused: { opacity: 1 },
  label: { fontSize: Typography.xs, color: Colors.textMuted, fontWeight: Typography.medium },
  labelFocused: { color: Colors.primary, fontWeight: Typography.bold },
});