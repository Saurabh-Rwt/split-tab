import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Colors } from '../../constants/colors';
import { GroupsStackParamList } from '../../types';

import { GroupListScreen }     from './GroupListScreen';
import { CreateGroupScreen }   from './CreateGroupScreen';
import { GroupDetailScreen }   from './GroupDetailScreen';
import { AddExpenseScreen }    from './AddExpenseScreen';
import { ExpenseDetailScreen } from './ExpenseDetailScreen';
import { EditExpenseScreen }   from './EditExpenseScreen';
import { BalanceScreen }       from './BalanceScreen';
import { SettlementScreen }    from './SettlementScreen';

const Stack = createNativeStackNavigator<GroupsStackParamList>();

export const GroupsPlaceholder = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown:  false,
      contentStyle: { backgroundColor: Colors.background },
      animation:    'slide_from_right',
    }}>
    <Stack.Screen name="GroupList"     component={GroupListScreen} />
    <Stack.Screen name="CreateGroup"   component={CreateGroupScreen} />
    <Stack.Screen name="GroupDetail"   component={GroupDetailScreen} />
    <Stack.Screen name="AddExpense"    component={AddExpenseScreen} />
    <Stack.Screen name="ExpenseDetail" component={ExpenseDetailScreen} />
    <Stack.Screen name="EditExpense"   component={EditExpenseScreen} />
    <Stack.Screen name="Balance"       component={BalanceScreen} />
    <Stack.Screen name="Settlement"    component={SettlementScreen} />
  </Stack.Navigator>
);
