import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { AppAlert } from '../components/AppAlert';

export default function GerenciarContasScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    getStoredAccounts,
    switchToAccount,
    removeStoredAccount,
    saveCurrentSessionToStorage,
    signOut,
  } = useAuth();
  const { syncToSupabaseNow } = useApp();
  const [data, setData] = useState({ accounts: [], activeSlot: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingSlot, setActingSlot] = useState(null);

  const load = useCallback(async () => {
    const result = await getStoredAccounts?.() ?? { accounts: [], activeSlot: 1 };
    setData(result);
  }, [getStoredAccounts]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleUsarConta = async (slot) => {
    setActingSlot(slot);
    const { error } = await switchToAccount?.(slot) ?? {};
    setActingSlot(null);
    if (error) AppAlert.alert('Erro', error);
    else await load();
  };

  const handleEncerrarSessao = (account) => {
    AppAlert.alert(
      'Encerrar sessão',
      `Encerrar a sessão de ${account.email}? Você poderá entrar novamente depois.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Encerrar',
          style: 'destructive',
          onPress: async () => {
            setActingSlot(account.slot);
            await removeStoredAccount?.(account.slot);
            setActingSlot(null);
            await load();
          },
        },
      ]
    );
  };

  const handleEncerrarTodas = () => {
    AppAlert.alert(
      'Encerrar todas as sessões',
      'Isso vai sair de todas as contas. Os dados serão sincronizados antes. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Encerrar todas',
          style: 'destructive',
          onPress: async () => {
            const { error } = await syncToSupabaseNow?.() ?? {};
            if (error) {
              AppAlert.alert(
                'Sincronização pendente',
                'Não foi possível enviar tudo ao banco. Deseja sair mesmo assim?',
                [
                  { text: 'Ficar', style: 'cancel' },
                  { text: 'Sair mesmo assim', style: 'destructive', onPress: () => signOut?.() },
                ]
              );
            } else {
              signOut?.();
            }
          },
        },
      ]
    );
  };

  const handleAdicionarConta = async () => {
    await saveCurrentSessionToStorage?.();
    navigation.navigate('Login', { addAccount: true });
  };

  const { accounts, activeSlot } = data;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Contas</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl * 2 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
      >
        <Text style={styles.hint}>
          Contas com sessão ativa. Toque em &quot;Usar esta conta&quot; para alternar. Você pode encerrar uma sessão ou todas.
        </Text>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : accounts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="person-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhuma conta com sessão ativa</Text>
            <Text style={styles.emptySub}>Ao fazer login, as contas aparecerão aqui.</Text>
          </View>
        ) : (
          <>
            {accounts.map((acc) => {
              const isActive = acc.slot === activeSlot;
              const isActing = actingSlot === acc.slot;
              return (
                <View key={acc.slot} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardLeft}>
                      <Text style={styles.email}>{acc.email}</Text>
                      {isActive && (
                        <View style={styles.badgeAtiva}>
                          <Text style={styles.badgeAtivaText}>Ativa</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardActions}>
                      {!isActive && (
                        <TouchableOpacity
                          style={[styles.btnUsar, isActing && styles.btnDisabled]}
                          onPress={() => handleUsarConta(acc.slot)}
                          disabled={!!actingSlot}
                        >
                          {isActing ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                              <Text style={styles.btnUsarText}>Usar esta conta</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.btnEncerrar}
                        onPress={() => handleEncerrarSessao(acc)}
                      >
                        <Ionicons name="log-out-outline" size={18} color={colors.spending} />
                        <Text style={styles.btnEncerrarText}>Encerrar sessão</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}

            {accounts.length < 2 && (
              <TouchableOpacity style={styles.btnAdicionar} onPress={handleAdicionarConta}>
                <Ionicons name="person-add-outline" size={22} color={colors.primary} />
                <Text style={styles.btnAdicionarText}>Entrar em outra conta</Text>
              </TouchableOpacity>
            )}

            {accounts.length > 0 && (
              <TouchableOpacity style={styles.btnEncerrarTodas} onPress={handleEncerrarTodas}>
                <Ionicons name="log-out-outline" size={22} color={colors.spending} />
                <Text style={styles.btnEncerrarTodasText}>Encerrar todas as sessões</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
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
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  loading: { paddingVertical: spacing.xl * 2, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { fontSize: 16, color: colors.textMuted, marginTop: spacing.md },
  emptySub: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  cardLeft: { flex: 1, minWidth: 120 },
  email: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  badgeAtiva: {
    alignSelf: 'flex-start',
    backgroundColor: colors.positive + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  badgeAtivaText: { fontSize: 12, fontWeight: '600', color: colors.positive },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  btnUsar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.positive,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  btnDisabled: { opacity: 0.7 },
  btnUsarText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  btnEncerrar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  btnEncerrarText: { fontSize: 14, color: colors.spending },
  btnAdicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '60',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  btnAdicionarText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  btnEncerrarTodas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.spending + '60',
    borderRadius: borderRadius.md,
  },
  btnEncerrarTodasText: { fontSize: 16, fontWeight: '600', color: colors.spending },
});
