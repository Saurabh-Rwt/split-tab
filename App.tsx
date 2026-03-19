import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PermissionsAndroid, Platform } from 'react-native';
import { store } from './src/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { navigate } from './src/navigation/navigationRef';

import {
  setupNotificationChannel,
  registerNotificationHandler,
  registerBackgroundHandler,
} from './src/services/NotificationService';

// Request notification permission
async function requestNotificationPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return status === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

const App = () => {

  useEffect(() => {
    const init = async () => {
      await requestNotificationPermission();
      await setupNotificationChannel();

      const unsubscribe = registerNotificationHandler(navigate);
      registerBackgroundHandler(navigate);

      return unsubscribe;
    };

    let unsubscribe: (() => void) | undefined;

    init().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <Provider store={store}>
      <AppNavigator />
    </Provider>
  );
};

export default App;