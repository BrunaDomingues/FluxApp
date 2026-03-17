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

export default function PagamentosSinalizadosScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { getPaymentSignaledAwaitingConfirmation, confirmOwnerRecebimentoFromPart } = useAuth();
  const { refetchUserData } = useApp();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await getPaymentSignaledAwaitingConfirmation?.() ?? { data: [], error: null };
    if (error) {
      setList([]);
      return;
    }
    setList(Array.isArray(data) ? data : []);
  }, [getPaymentSignaledAwaitingConfirmation]);

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

  const handleConfirmar = (item) => {
    AppAlert.alert(
      'Confirmar recebimento',
      `${item.debtorNome} sinalizou que pagou R$ ${(item.valor || 0).toFixed(2).replace('.', ',')} (${item.descricao}). Os dados (data, horário e comprovante) serão usados na sua receita. Confirmar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setConfirmingId(item.id);
            const { error } = await confirmOwnerRecebimentoFromPart?.(item.id) ?? {};
            setConfirmingId(null);
            if (error) {
              AppAlert.alert('Erro', error);
              return;
            }
            await refetchUserData?.();
            await load();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Pagamentos sinalizados</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
      >
        <Text style={styles.subtitle}>
          Alguém marcou que te pagou. Confirme para levar o valor e os dados (data, horário, comprovante) para sua conta.
        </Text>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhum pagamento sinalizado</Text>
            <Text style={styles.emptySub}>Quando alguém marcar "Paguei" na parte dele, aparecerá aqui.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {list.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.descricao}>{item.descricao}</Text>
                    <Text style={styles.debtor}>{item.debtorNome} sinalizou que pagou</Text>
                    {(item.dataPagamentoSinalizada || item.horarioPagamentoSinalizado) && (
                      <Text style={styles.dados}>
                        {[item.dataPagamentoSinalizada, item.horarioPagamentoSinalizado].filter(Boolean).join(' — ')}
                        {item.hasComprovante ? ' • Com comprovante' : ''}
                      </Text>
                    )}
                    {!item.dataPagamentoSinalizada && !item.horarioPagamentoSinalizado && item.hasComprovante && (
                      <Text style={styles.dados}>Com comprovante anexado</Text>
                    )}
                    <Text style={styles.valor}>R$ {(item.valor || 0).toFixed(2).replace('.', ',')}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.btnConfirmar, confirmingId === item.id && styles.btnConfirmarDisabled]}
                    onPress={() => handleConfirmar(item)}
                    disabled={confirmingId !== null}
                  >
                    {confirmingId === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text style={styles.btnConfirmarText}>Confirmar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
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
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  loading: { paddingVertical: spacing.xl * 2, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { fontSize: 16, color: colors.textMuted, marginTop: spacing.md },
  emptySub: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  list: { gap: spacing.md },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowLeft: { flex: 1 },
  descricao: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  debtor: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  dados: { fontSize: 12, color: colors.positive, marginTop: 2 },
  valor: { fontSize: 15, fontWeight: '600', color: colors.positive, marginTop: 4 },
  btnConfirmar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.positive,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  btnConfirmarDisabled: { opacity: 0.7 },
  btnConfirmarText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
