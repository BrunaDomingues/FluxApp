import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { formatBRL, numberToRaw, parseToRaw, rawToNumber } from '../utils/currency';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const OPCOES_MENU = [
  { id: 'transacoes', label: 'Transações', icon: 'list-outline' },
  { id: 'saldoEmContas', label: 'Saldo em contas', icon: 'wallet-outline' },
  { id: 'detalhar', label: 'Detalhar', icon: 'document-text-outline' },
  { id: 'reajustar', label: 'Reajustar saldo', icon: 'create-outline' },
  { id: 'arquivar', label: 'Arquivar', icon: 'archive-outline' },
];

export default function ContasScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const bottomSafe = insets.bottom || 12;
  const { contas, saldoTodasContas, removeConta, updateConta } = useApp();
  const [mesIndex, setMesIndex] = useState(new Date().getMonth());
  const [menuConta, setMenuConta] = useState(null);
  const [reajustarConta, setReajustarConta] = useState(null);
  const [reajustarValor, setReajustarValor] = useState('');

  const contasVisiveis = contas.filter((c) => !c.arquivada);
  const saldoPrevisto = saldoTodasContas;

  const handleAbrirMenu = (conta) => {
    setMenuConta(conta);
  };

  const handleFecharMenu = () => {
    setMenuConta(null);
  };

  const handleOpcaoMenu = (opcaoId, conta) => {
    setMenuConta(null);
    switch (opcaoId) {
      case 'transacoes':
        navigation.navigate('AddTransaction', { contaId: conta.id });
        break;
      case 'saldoEmContas':
        navigation.navigate('SaldoEmContas', { conta });
        break;
      case 'detalhar':
        navigation.navigate('ContaDetalhes', { conta });
        break;
      case 'reajustar':
        setReajustarConta(conta);
        setReajustarValor(numberToRaw(conta.saldo || 0));
        break;
      case 'arquivar':
        Alert.alert(
          'Arquivar conta',
          `Arquivar "${conta.nome}"? Ela sairá da listagem mas poderá ser reativada.`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Arquivar', onPress: () => updateConta(conta.id, { arquivada: true }) },
          ]
        );
        break;
      default:
        break;
    }
  };

  const handleReajustarSalvar = () => {
    if (!reajustarConta) return;
    const valor = rawToNumber(reajustarValor);
    updateConta(reajustarConta.id, { saldo: valor });
    setReajustarConta(null);
    setReajustarValor('');
  };

  const handleExcluirConta = (conta) => {
    Alert.alert(
      'Excluir conta',
      `Excluir "${conta.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => removeConta(conta.id) },
      ]
    );
  };

  const mesAnterior = () => setMesIndex((i) => (i === 0 ? 11 : i - 1));
  const mesProximo = () => setMesIndex((i) => (i === 11 ? 0 : i + 1));

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: bottomSafe }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Contas</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="archive-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="sync-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.monthRow}>
        <TouchableOpacity onPress={mesAnterior} style={styles.monthArrow}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MESES[mesIndex]}</Text>
        <TouchableOpacity onPress={mesProximo} style={styles.monthArrow}>
          <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 80 + bottomSafe }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.saldoRow}>
          <View style={styles.saldoCard}>
            <View style={styles.saldoIconWrap}>
              <Ionicons name="cash-outline" size={20} color={colors.textMuted} />
            </View>
            <Text style={styles.saldoLabel}>Saldo atual</Text>
            <Text style={[styles.saldoValor, saldoTodasContas < 0 && styles.saldoNegativo]}>
              {formatBRL(numberToRaw(saldoTodasContas))}
            </Text>
          </View>
          <View style={styles.saldoCard}>
            <View style={styles.saldoIconWrap}>
              <Ionicons name="cash-outline" size={20} color={colors.textMuted} />
            </View>
            <Text style={styles.saldoLabel}>Saldo previsto</Text>
            <Text style={[styles.saldoValor, saldoPrevisto < 0 && styles.saldoNegativo]}>
              {formatBRL(numberToRaw(saldoPrevisto))}
            </Text>
          </View>
        </View>

        {contasVisiveis.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhuma conta cadastrada.</Text>
            <Text style={styles.emptySub}>Toque no + para adicionar.</Text>
          </View>
        ) : (
          contasVisiveis.map((conta) => (
            <View key={conta.id} style={styles.contaRow}>
              <View style={styles.contaIconWrap}>
                <Ionicons name="wallet-outline" size={22} color={colors.secondary} />
              </View>
              <View style={styles.contaInfo}>
                <Text style={styles.contaNome}>{conta.nome}</Text>
                <View style={styles.contaSaldos}>
                  <Text style={[styles.contaSaldo, (conta.saldo || 0) < 0 && styles.saldoNegativo]}>
                    Saldo atual {formatBRL(numberToRaw(conta.saldo || 0))}
                  </Text>
                  <Text style={[styles.contaSaldo, (conta.saldo || 0) < 0 && styles.saldoNegativo]}>
                    Saldo previsto {formatBRL(numberToRaw(conta.saldo || 0))}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.moreBtn}
                onPress={() => handleAbrirMenu(conta)}
              >
                <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Menu dropdown (opções dos 3 pontos) */}
      <Modal visible={!!menuConta} transparent animationType="fade">
        <Pressable style={styles.menuBackdrop} onPress={handleFecharMenu}>
          <Pressable style={styles.menuDropdown} onPress={(e) => e.stopPropagation()}>
            {menuConta && OPCOES_MENU.map((op) => (
              <TouchableOpacity
                key={op.id}
                style={styles.menuOption}
                onPress={() => handleOpcaoMenu(op.id, menuConta)}
                activeOpacity={0.7}
              >
                <Ionicons name={op.icon} size={20} color={colors.textPrimary} style={styles.menuOptionIcon} />
                <Text style={styles.menuOptionText}>{op.label}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Reajustar saldo */}
      <Modal visible={!!reajustarConta} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => { setReajustarConta(null); setReajustarValor(''); }}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Reajustar saldo</Text>
            {reajustarConta && (
              <Text style={styles.modalSubtitle}>{reajustarConta.nome}</Text>
            )}
            <TextInput
              style={styles.input}
              placeholder="R$ 0,00"
              placeholderTextColor={colors.textMuted}
              value={reajustarValor === '' ? '' : formatBRL(reajustarValor)}
              onChangeText={(t) => setReajustarValor(parseToRaw(t))}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => { setReajustarConta(null); setReajustarValor(''); }}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnOk} onPress={handleReajustarSalvar}>
                <Text style={styles.modalBtnOkText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.secondary, bottom: bottomSafe + spacing.xl }]}
        onPress={() => navigation.navigate('AddAccount')}
      >
        <Ionicons name="add" size={28} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.secondary,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  headerIcon: { padding: spacing.xs, marginLeft: spacing.xs },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.secondary,
    gap: spacing.md,
  },
  monthArrow: { padding: spacing.xs },
  monthLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 80 },
  saldoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  saldoCard: {
    flex: 1,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  saldoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundCardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  saldoLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  saldoValor: { fontSize: 16, fontWeight: '700', color: colors.positive },
  saldoNegativo: { color: colors.spending },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: { fontSize: 16, color: colors.textMuted, marginTop: spacing.md },
  emptySub: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  contaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  contaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary + '35',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contaInfo: { flex: 1 },
  contaNome: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  contaSaldos: { gap: 2 },
  contaSaldo: { fontSize: 13, color: colors.textMuted },
  moreBtn: { padding: spacing.xs },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 120,
    paddingRight: spacing.md,
  },
  menuDropdown: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    minWidth: 220,
    paddingVertical: spacing.xs,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  menuOptionIcon: { marginRight: spacing.sm },
  menuOptionText: { fontSize: 15, color: colors.textPrimary },
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
    backgroundColor: colors.secondary,
  },
  modalBtnOkText: { fontSize: 16, color: colors.textPrimary, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
