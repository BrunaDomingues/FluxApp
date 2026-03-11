import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { formatBRL, numberToRaw, parseToRaw, rawToNumber } from '../utils/currency';

export default function ContaDetalhesScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const bottomSafe = insets.bottom || 12;
  const contaParam = route?.params?.conta;
  const { contas, transacoes, updateConta } = useApp();
  const [reajustarVisible, setReajustarVisible] = useState(false);
  const [reajustarValor, setReajustarValor] = useState('');
  const [selectedContaId, setSelectedContaId] = useState(contaParam?.id ?? null);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const contasVisiveis = contas.filter((c) => !c.arquivada);
  const conta = contasVisiveis.find((c) => c.id === selectedContaId) ?? contasVisiveis[0] ?? contaParam;

  if (contasVisiveis.length === 0 && !contaParam) {
    navigation.goBack();
    return null;
  }
  if (!conta) {
    navigation.goBack();
    return null;
  }

  const despesas = transacoes.filter(
    (t) => (t.tipo === 'saida' || t.tipo === 'despesa_cartao') && t.contaId === conta.id
  );
  const receitas = transacoes.filter((t) => t.tipo === 'entrada' && t.contaId === conta.id);
  const transferencias = transacoes.filter(
    (t) => t.descricao && t.descricao.includes('Transferência') && t.contaId === conta.id
  );

  const handleReajustar = () => {
    setReajustarValor(numberToRaw(conta.saldo || 0));
    setReajustarVisible(true);
  };

  const handleReajustarSalvar = () => {
    updateConta(conta.id, { saldo: rawToNumber(reajustarValor) });
    setReajustarVisible(false);
    setReajustarValor('');
  };

  const handleSelectConta = (c) => {
    setSelectedContaId(c.id);
    setDropdownVisible(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: bottomSafe }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Detalhes</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="list-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="scale-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={[styles.contaSelector, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          style={styles.contaSelectorTouch}
          onPress={() => contasVisiveis.length > 1 && setDropdownVisible(true)}
          disabled={contasVisiveis.length <= 1}
        >
          <Text style={styles.contaNome}>{conta.nome}</Text>
          {contasVisiveis.length > 1 ? (
            <Ionicons name="chevron-down" size={20} color={colors.textPrimary} />
          ) : null}
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: 80 + bottomSafe }]}>
        <View style={styles.saldoSection}>
          <Text style={styles.label}>Saldo atual</Text>
          <Text style={[styles.saldoValor, (conta.saldo || 0) < 0 && styles.saldoNegativo]}>
            {formatBRL(numberToRaw(conta.saldo || 0))}
          </Text>
          <TouchableOpacity style={styles.reajustarBtn} onPress={handleReajustar}>
            <Text style={styles.reajustarBtnText}>REAJUSTAR SALDO</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="wallet-outline" size={20} color={colors.textMuted} />
          <Text style={styles.infoLabel}>Tipo da conta</Text>
          <Text style={styles.infoValue}>{conta.nome}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={20} color={colors.textMuted} />
          <Text style={styles.infoLabel}>Saldo inicial</Text>
          <Text style={styles.infoValue}>R$ 0,00</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="trending-down-outline" size={20} color={colors.spending} />
          <Text style={styles.infoLabel}>Quantidade de despesas</Text>
          <TouchableOpacity
            style={styles.infoRowTouch}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Transações', params: { contaId: conta.id, filterTipo: 'saida' } })}
            activeOpacity={0.7}
          >
            <Text style={[styles.infoValue, { color: colors.spending }]}>{despesas.length} Despesa(s)</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.spending} />
          </TouchableOpacity>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="trending-up-outline" size={20} color={colors.positive} />
          <Text style={styles.infoLabel}>Quantidade de receitas</Text>
          <TouchableOpacity
            style={styles.infoRowTouch}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Transações', params: { contaId: conta.id, filterTipo: 'entrada' } })}
            activeOpacity={0.7}
          >
            <Text style={[styles.infoValue, { color: colors.positive }]}>{receitas.length} Receita(s)</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.positive} />
          </TouchableOpacity>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="swap-horizontal-outline" size={20} color={colors.textMuted} />
          <Text style={styles.infoLabel}>Quantidade de transferências</Text>
          <Text style={styles.infoValue}>{transferencias.length} Transferência(s)</Text>
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Ionicons name="calculator-outline" size={20} color={colors.textMuted} style={styles.rowIcon} />
            <Text style={styles.toggleLabel}>Incluir na soma da tela inicial</Text>
          </View>
          <Switch
            value={conta.incluirNaSomaTelaInicial !== false}
            onValueChange={(value) => updateConta(conta.id, { incluirNaSomaTelaInicial: value })}
            trackColor={{ false: colors.backgroundCardElevated, true: colors.primary + '99' }}
            thumbColor={conta.incluirNaSomaTelaInicial !== false ? colors.primary : colors.textMuted}
          />
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: bottomSafe + spacing.xl }]}
        onPress={() => navigation.navigate('AddAccount', { editar: conta })}
      >
        <Ionicons name="pencil" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <Modal visible={reajustarVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setReajustarVisible(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Reajustar saldo</Text>
            <Text style={styles.modalSubtitle}>{conta.nome}</Text>
            <TextInput
              style={styles.input}
              placeholder="R$ 0,00"
              placeholderTextColor={colors.textMuted}
              value={reajustarValor === '' ? '' : formatBRL(reajustarValor)}
              onChangeText={(t) => setReajustarValor(parseToRaw(t))}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setReajustarVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnOk} onPress={handleReajustarSalvar}>
                <Text style={styles.modalBtnOkText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal dropdown: trocar de conta */}
      <Modal visible={dropdownVisible} transparent animationType="fade">
        <Pressable style={styles.dropdownBackdrop} onPress={() => setDropdownVisible(false)}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Selecionar conta</Text>
            {contasVisiveis.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.dropdownOption, c.id === (selectedContaId ?? conta?.id) && styles.dropdownOptionActive]}
                onPress={() => handleSelectConta(c)}
              >
                <Text style={[styles.dropdownOptionText, c.id === (selectedContaId ?? conta?.id) && styles.dropdownOptionTextActive]}>
                  {c.nome}
                </Text>
                {c.id === (selectedContaId ?? conta?.id) ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
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
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  headerIcon: { padding: spacing.xs, marginLeft: spacing.xs },
  contaSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  contaSelectorTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  contaNome: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  saldoSection: { marginBottom: spacing.lg },
  label: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
  saldoValor: { fontSize: 28, fontWeight: '700', color: colors.positive, marginBottom: spacing.md },
  saldoNegativo: { color: colors.spending },
  reajustarBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  reajustarBtnText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: spacing.sm,
  },
  infoLabel: { flex: 1, fontSize: 14, color: colors.textMuted },
  infoValue: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  infoRowTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: spacing.sm,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowIcon: { marginRight: spacing.sm },
  toggleLabel: { fontSize: 14, color: colors.textMuted },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  modalSubtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  modalButtons: { flexDirection: 'row', gap: spacing.md },
  modalBtnCancel: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundCardElevated,
  },
  modalBtnCancelText: { fontSize: 16, color: colors.textMuted, fontWeight: '600' },
  modalBtnOk: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  modalBtnOkText: { fontSize: 16, color: colors.textPrimary, fontWeight: '600' },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dropdownBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: spacing.sm,
    maxHeight: 320,
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  dropdownOptionActive: {
    backgroundColor: colors.primary + '25',
  },
  dropdownOptionText: { fontSize: 16, color: colors.textPrimary },
  dropdownOptionTextActive: { fontWeight: '600', color: colors.primary },
});
