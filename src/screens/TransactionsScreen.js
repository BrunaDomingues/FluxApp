import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '../components/Icons';
import { colors, spacing } from '../constants/theme';
import { useApp } from '../context/AppContext';

const iconMap = {
  Moradia: 'home-outline',
  Alimentação: 'restaurant-outline',
  Transporte: 'car-outline',
  Lazer: 'happy-outline',
  Salário: 'briefcase-outline',
  Freelance: 'laptop-outline',
  default: 'cash-outline',
};

const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'saida', label: 'Despesas' },
  { id: 'entrada', label: 'Receitas' },
];

export default function TransactionsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const {
    transacoes,
    contas,
    usuarios,
    getPrincipalUserId,
    getValorPartePrincipal,
    getDespesasComParteDoUsuario,
  } = useApp();
  const contaIdFromParams = route.params?.contaId ?? null;
  const filterTipoFromParams = route.params?.filterTipo ?? null;

  const [filterTipo, setFilterTipo] = useState(filterTipoFromParams || 'todas');
  const [contaId, setContaId] = useState(contaIdFromParams);
  const [userId, setUserId] = useState(null);
  const [modalConta, setModalConta] = useState(false);
  const [modalUsuario, setModalUsuario] = useState(false);

  const principalId = getPrincipalUserId();
  const outrosUsuarios = (usuarios || []).filter((u) => !u.principal);

  useFocusEffect(
    React.useCallback(() => {
      if (contaIdFromParams != null) setContaId(contaIdFromParams);
      if (filterTipoFromParams != null) setFilterTipo(filterTipoFromParams);
    }, [contaIdFromParams, filterTipoFromParams])
  );

  const transacoesFiltradas = useMemo(() => {
    let list = transacoes;
    if (contaId) {
      list = list.filter((t) => t.contaId === contaId);
    }
    if (filterTipo === 'entrada') {
      list = list.filter((t) => t.tipo === 'entrada');
    } else if (filterTipo === 'saida') {
      list = list.filter((t) => t.tipo === 'saida' || t.tipo === 'despesa_cartao');
    }
    if (userId) {
      list = list.filter((t) => {
        if (t.tipo !== 'saida' && t.tipo !== 'despesa_cartao') return false;
        return t.divisao?.partes?.some((p) => p.userId === userId);
      });
    }
    return list;
  }, [transacoes, contaId, filterTipo, userId]);

  const getIcon = (categoriaNome) => iconMap[categoriaNome] || iconMap.default;
  const contaNome = contaId ? contas.find((c) => c.id === contaId)?.nome : null;
  const usuarioNome = userId ? (usuarios || []).find((u) => u.id === userId)?.nome : null;
  const contasVisiveis = contas.filter((c) => !c.arquivada);

  const valorExibir = (t) => {
    if (!userId) {
      if ((t.tipo === 'saida' || t.tipo === 'despesa_cartao') && t.divisao && principalId) {
        return getValorPartePrincipal(t);
      }
      return Math.abs(t.valor || 0);
    }
    const despesas = getDespesasComParteDoUsuario(userId);
    const item = despesas.find((d) => d.transacao.id === t.id);
    return item ? item.valorParte : Math.abs(t.valor || 0);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Transações</Text>
        <TouchableOpacity
          style={styles.contaFilterBtn}
          onPress={() => setModalConta(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="wallet-outline" size={18} color={colors.textMuted} />
          <Text style={styles.contaFilterBtnText}>
            {contaNome || 'Todas as contas'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        {outrosUsuarios.length > 0 && (
          <TouchableOpacity
            style={styles.contaFilterBtn}
            onPress={() => setModalUsuario(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
            <Text style={styles.contaFilterBtnText}>
              {usuarioNome || 'Todos'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.filtrosRow}>
        {FILTROS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filtroBtn, filterTipo === f.id && styles.filtroBtnActive]}
            onPress={() => setFilterTipo(f.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filtroBtnText, filterTipo === f.id && styles.filtroBtnTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: (spacing.xl * 2) + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {transacoesFiltradas.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="list-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {transacoes.length === 0 ? 'Nenhuma transação ainda.' : 'Nenhuma transação com esse filtro.'}
              </Text>
              <Text style={styles.emptySub}>Use o botão + para adicionar.</Text>
            </View>
          ) : (
            transacoesFiltradas.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={styles.row}
                onPress={() => navigation.navigate('AddTransaction', { editar: t })}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={t.categoriaNome ? getIcon(t.categoriaNome) : (t.tipo === 'entrada' ? 'trending-up-outline' : 'trending-down-outline')}
                    size={20}
                    color={colors.textMuted}
                  />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.categoria}>
                    {t.descricao || t.categoriaNome || (t.tipo === 'entrada' ? 'Entrada' : 'Despesa')}
                  </Text>
                  <Text style={styles.data}>{t.data || '—'}</Text>
                  {t.local ? <Text style={styles.local}>{t.local}</Text> : null}
                </View>
                <Text
                  style={[
                    styles.valor,
                    (t.tipo === 'entrada' || (t.valor && t.valor > 0)) ? styles.valorEntrada : styles.valorSaida,
                  ]}
                >
                  {t.tipo === 'entrada' || (t.valor && t.valor > 0)
                    ? `+R$ ${valorExibir(t).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : `-R$ ${valorExibir(t).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={modalConta} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalConta(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Filtrar por conta</Text>
            <TouchableOpacity
              style={[styles.modalItem, !contaId && styles.modalItemActive]}
              onPress={() => { setContaId(null); setModalConta(false); }}
            >
              <Text style={styles.modalItemText}>Todas as contas</Text>
              {!contaId ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
            </TouchableOpacity>
            {contasVisiveis.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.modalItem, contaId === c.id && styles.modalItemActive]}
                onPress={() => { setContaId(c.id); setModalConta(false); }}
              >
                <Text style={styles.modalItemText}>{c.nome}</Text>
                {contaId === c.id ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
      <Modal visible={modalUsuario} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalUsuario(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Filtrar por usuário</Text>
            <TouchableOpacity
              style={[styles.modalItem, !userId && styles.modalItemActive]}
              onPress={() => { setUserId(null); setModalUsuario(false); }}
            >
              <Text style={styles.modalItemText}>Todos</Text>
              {!userId ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
            </TouchableOpacity>
            {outrosUsuarios.map((u) => (
              <TouchableOpacity
                key={u.id}
                style={[styles.modalItem, userId === u.id && styles.modalItemActive]}
                onPress={() => { setUserId(u.id); setModalUsuario(false); }}
              >
                <Text style={styles.modalItemText}>{u.nome}</Text>
                {userId === u.id ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  contaFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundCardElevated,
    borderRadius: 20,
  },
  contaFilterBtnText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  filtrosRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filtroBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.backgroundCardElevated,
  },
  filtroBtnActive: {
    backgroundColor: colors.primary,
  },
  filtroBtnText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  filtroBtnTextActive: {
    color: colors.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    overflow: 'hidden',
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundCardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowContent: {
    flex: 1,
  },
  categoria: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  data: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  local: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  valor: {
    fontSize: 16,
    fontWeight: '700',
  },
  valorEntrada: {
    color: colors.positive,
  },
  valorSaida: {
    color: colors.spending,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: spacing.sm,
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  modalItemActive: {
    backgroundColor: colors.primary + '25',
  },
  modalItemText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
});
