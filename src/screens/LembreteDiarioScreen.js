import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { AppAlert } from '../components/AppAlert';
import { disableLembreteDiario, enableOrUpdateLembreteDiario, getLembreteDiarioSettings } from '../utils/lembreteDiario';

export default function LembreteDiarioScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('17:00'); // HH:mm

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getLembreteDiarioSettings();
      setEnabled(!!s.enabled);
      setTime(s.time || '17:00');
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async () => {
    if (saving) return;
    if (enabled) {
      setSaving(true);
      await disableLembreteDiario();
      setEnabled(false);
      setSaving(false);
      return;
    }
    setSaving(true);
    const { error } = await enableOrUpdateLembreteDiario(time);
    setSaving(false);
    if (error) {
      AppAlert.alert('Notificações', error);
      return;
    }
    setEnabled(true);
  };

  const handleSaveTime = async () => {
    if (saving) return;
    const normalized = String(time || '').trim();
    if (!/^\d{1,2}:\d{2}$/.test(normalized)) {
      AppAlert.alert('Horário inválido', 'Use o formato HH:mm (ex.: 17:00).');
      return;
    }
    if (!enabled) {
      AppAlert.alert('Lembrete desativado', 'Ative o lembrete para aplicar o horário.');
      return;
    }
    setSaving(true);
    const { error } = await enableOrUpdateLembreteDiario(normalized);
    setSaving(false);
    if (error) AppAlert.alert('Erro', error);
    else AppAlert.alert('Pronto', 'Horário atualizado.');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Lembrete diário</Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Ative um lembrete diário para não esquecer de registrar seus gastos.
          </Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>Lembrete</Text>
                <Text style={styles.rowSub}>{enabled ? 'Ativo' : 'Desativado'}</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleBtn, enabled ? styles.toggleBtnOn : styles.toggleBtnOff, saving && styles.btnDisabled]}
                onPress={handleToggle}
                activeOpacity={0.8}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.toggleText}>{enabled ? 'Ativo' : 'Ativar'}</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={[styles.row, { marginTop: spacing.md }]}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>Horário</Text>
                <Text style={styles.rowSub}>Formato: HH:mm</Text>
              </View>
              <TextInput
                value={time}
                onChangeText={setTime}
                placeholder="17:00"
                placeholderTextColor={colors.textMuted}
                style={styles.timeInput}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
                maxLength={5}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSaveTime}
              activeOpacity={0.8}
              disabled={saving}
            >
              <Ionicons name="time-outline" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Salvar horário</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flex: 1, paddingRight: spacing.md },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  rowSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  toggleBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: borderRadius.full },
  toggleBtnOn: { backgroundColor: colors.positive },
  toggleBtnOff: { backgroundColor: colors.primary },
  toggleText: { color: '#fff', fontWeight: '700' },
  timeInput: {
    width: 90,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundCardElevated,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.lg,
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  btnDisabled: { opacity: 0.7 },
});

