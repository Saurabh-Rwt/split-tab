import notifee, {
  AndroidImportance,
  EventType,
} from '@notifee/react-native';

export const CHANNEL_ID = 'splittab_default';

export async function setupNotificationChannel() {
  await notifee.createChannel({
    id:         CHANNEL_ID,
    name:       'SplitTab Notifications',
    importance: AndroidImportance.HIGH,
  });
}

//  Send a local notification
export async function sendNotification(params: {
  title:   string;
  body:    string;
  data:    Record<string, string>;
}) {
  await notifee.displayNotification({
    title:   params.title,
    body:    params.body,
    data:    params.data,
    android: {
      channelId:  CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default' },
    },
    ios: {
      sound: 'default',
    },
  });
}

//  Simulate: new expense notification

export async function simulateExpenseNotification(
  groupId:   string,
  expenseId: string,
  description: string,
  amount:    string,
) {
  await sendNotification({
    title: '💸 New Expense Added',
    body:  `${description} · ${amount}`,
    data:  {
      type:      'expense',
      groupId,
      expenseId,
    },
  });
}

//  Simulate: settlement notification

export async function simulateSettlementNotification(
  groupId:      string,
  fromName:     string,
  amount:       string,
) {
  await sendNotification({
    title: '✅ Payment Received',
    body:  `${fromName} paid you ${amount}`,
    data:  {
      type:    'settlement',
      groupId,
    },
  });
}


export function registerNotificationHandler(
  navigate: (screen: string, params?: object) => void,
) {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS && detail.notification?.data) {
      handleDeepLink(detail.notification.data as Record<string, string>, navigate);
    }
  });
}

export async function registerBackgroundHandler(
  navigate: (screen: string, params?: object) => void,
) {
  const initialNotification = await notifee.getInitialNotification();
  if (initialNotification?.notification?.data) {
    handleDeepLink(
      initialNotification.notification.data as Record<string, string>,
      navigate,
    );
  }
}

//  Route notification data to correct screen
function handleDeepLink(
  data:     Record<string, string>,
  navigate: (screen: string, params?: object) => void,
) {
  const { type, groupId, expenseId } = data;

  if (type === 'expense' && groupId && expenseId) {
    navigate('ExpenseDetail', { expenseId, groupId });
  } else if (type === 'settlement' && groupId) {
    navigate('Settlement', { groupId });
  }
}