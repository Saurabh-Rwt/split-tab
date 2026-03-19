import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAppSelector } from '../store';
import { selectHasCompletedOnboarding } from '../store/slices/authSlice';
import { RootStackParamList } from '../types';
import { Colors } from '../constants/colors';

import { OnboardingScreen } from '../screens/Onboardingscreen ';
import { LoginScreen }      from '../screens/auth/Loginscreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AuthNavigator = () => {
  const hasOnboarded = useAppSelector(selectHasCompletedOnboarding);

  return (
    <Stack.Navigator
      initialRouteName={hasOnboarded ? 'Login' : 'Onboarding'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login"      component={LoginScreen} />
    </Stack.Navigator>
  );
};