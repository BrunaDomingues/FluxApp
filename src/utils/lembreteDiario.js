import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const KEY_ENABLED = '@fluxapp_lembrete_diario_enabled';
const KEY_TIME = '@fluxapp_lembrete_diario_time'; // "HH:mm"
const KEY_NOTIFICATION_ID = '@fluxapp_lembrete_diario_notification_id';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function parseTimeHHmm(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return { hh, mm, value: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` };
}

export async function getLembreteDiarioSettings() {
  const [enabledRaw, timeRaw] = await Promise.all([
    AsyncStorage.getItem(KEY_ENABLED),
    AsyncStorage.getItem(KEY_TIME),
  ]);
  const enabled = enabledRaw === '1';
  const parsed = parseTimeHHmm(timeRaw || '');
  return { enabled, time: parsed?.value || '17:00' };
}

async function ensurePermissions() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function disableLembreteDiario() {
  const notificationId = await AsyncStorage.getItem(KEY_NOTIFICATION_ID);
  if (notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (_) {}
  }
  await Promise.all([
    AsyncStorage.setItem(KEY_ENABLED, '0'),
    AsyncStorage.removeItem(KEY_NOTIFICATION_ID),
  ]);
}

export async function enableOrUpdateLembreteDiario(timeStr) {
  const parsed = parseTimeHHmm(timeStr);
  const time = parsed?.value || '17:00';
  const ok = await ensurePermissions();
  if (!ok) return { error: 'Permissão de notificação negada.' };

  // Android precisa de canal
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('lembrete-diario', {
      name: 'Lembrete diário',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Cancela o agendamento anterior (se houver) e agenda de novo
  const previousId = await AsyncStorage.getItem(KEY_NOTIFICATION_ID);
  if (previousId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(previousId);
    } catch (_) {}
  }

  const { hh, mm } = parseTimeHHmm(time) || { hh: 17, mm: 0 };
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'FluxApp',
      body: 'Não esqueça de registrar seus gastos de hoje.',
      sound: false,
    },
    trigger: {
      hour: hh,
      minute: mm,
      repeats: true,
      channelId: Platform.OS === 'android' ? 'lembrete-diario' : undefined,
    },
  });

  await Promise.all([
    AsyncStorage.setItem(KEY_ENABLED, '1'),
    AsyncStorage.setItem(KEY_TIME, time),
    AsyncStorage.setItem(KEY_NOTIFICATION_ID, id),
  ]);

  return { error: null };
}

