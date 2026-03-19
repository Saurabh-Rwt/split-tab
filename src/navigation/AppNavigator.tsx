import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, View, ActivityIndicator } from 'react-native';

import { useAppDispatch, useAppSelector } from '../store';
import { hydrateAuth, selectIsLoggedIn, selectIsHydrated } from '../store/slices/authSlice';
import { hydrateGroups } from '../store/slices/groupsSlice';
import { hydrateExpenses } from '../store/slices/expensesSlice';
import { hydrateSettlements } from '../store/slices/settlementsSlice';
import { hydrateCurrency } from '../store/slices/currencySlice';

import { Colors } from '../constants/colors';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { navigationRef } from './navigationRef';

export const AppNavigator = () => {
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const isHydrated = useAppSelector(selectIsHydrated);

  useEffect(() => {
    Promise.all([
      dispatch(hydrateAuth()),
      dispatch(hydrateGroups()),
      dispatch(hydrateExpenses()),
      dispatch(hydrateSettlements()),
      dispatch(hydrateCurrency()),
    ]);
  }, [dispatch]);

  if (!isHydrated) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      {isLoggedIn ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};