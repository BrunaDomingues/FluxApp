import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

async function ensurePermissions() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleTransactionReminder({ title, body, datetime, channelId = 'lembretes-transacoes' }) {
  const ok = await ensurePermissions();
  if (!ok) return { notificationId: null, error: 'Permissão de notificação negada.' };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: 'Lembretes',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const when = datetime instanceof Date ? datetime : new Date(datetime);
  if (isNaN(when.getTime())) return { notificationId: null, error: 'Data/hora inválida.' };

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: title || 'FluxApp',
      body: body || 'Você tem uma transação para revisar.',
      sound: false,
    },
    trigger: when,
  });

  return { notificationId: id, error: null };
}

export async function cancelTransactionReminder(notificationId) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (_) {}
}

