import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { AppAlert } from '../components/AppAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { formatBRL, parseToRaw, rawToNumber } from '../utils/currency';

export default function FinanciamentoDetalhesScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const bottomSafe = insets.bottom || 12;
  const { financiamentos, contas, updateParcelaFinanciamento, removeFinanciamento } = useApp();
  const finParam = route?.params?.financiamento;
  const financiamento = financiamentos.find((f) => f.id === finParam?.id) || finParam;

  const [modalParcela, setModalParcela] = useState(null);
  const [valorPago, setValorPago] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');

  if (!financiamento) {
    navigation.goBack();
    return null;
  }

  const contasVisiveis = contas.filter((c) => !c.arquivada);
  const contaNome = financiamento.contaId
    ? contasVisiveis.find((c) => c.id === financiamento.contaId)?.nome
    : null;

  const parcelas = financiamento.parcelas || [];
  const pagasCount = parcelas.filter((p) => p.pago).length;
  const economiasTotal = parcelas.reduce((s, p) => {
    if (!p.pago || p.valorPago == null) return s;
    const economia = (p.valorPadrao || 0) - p.valorPago;
    return s + (economia > 0 ? economia : 0);
  }, 0);

  const openParcelaModal = (p) => {
    setModalParcela(p);
    setValorPago(p.valorPago != null ? String(Math.round(p.valorPago * 100)) : String(Math.round((p.valorPadrao || 0) * 100)));
    setDataPagamento(p.dataPagamento || '');
  };

  const handleSalvarParcela = () => {
    if (!modalParcela) return;
    const valor = rawToNumber(valorPago);
    updateParcelaFinanciamento(financiamento.id, modalParcela.numero, {
      pago: true,
      valorPago: valor,
      dataPagamento: (dataPagamento || '').trim() || null,
    });
    setModalParcela(null);
  };

  const handleDesmarcarPago = (p) => {
    AppAlert.alert(
      'Desmarcar parcela',
      `Desmarcar parcela ${p.numero} como paga?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desmarcar',
          onPress: () => {
            updateParcelaFinanciamento(financiamento.id, p.numero, {
              pago: false,
              valorPago: null,
              dataPagamento: null,
            });
          },
        },
      ]
    );
  };

  const handleExcluir = () => {
    AppAlert.alert(
      'Excluir financiamento',
      `Excluir "${financiamento.descricao}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            removeFinanciamento(financiamento.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: bottomSafe }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{financiamento.descricao}</Text>
        <View style={styles.headerRight} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 120 + (insets.bottom || 12) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.resumoCard}>
          <View style={styles.resumoRow}>
            <Text style={styles.resumoLabel}>Parcelas pagas</Text>
            <Text style={styles.resumoValue}>{pagasCount}/{financiamento.totalParcelas}</Text>
          </View>
          <View style={styles.resumoRow}>
            <Text style={styles.resumoLabel}>Valor padrão</Text>
            <Text style={styles.resumoValue}>
              {formatBRL(String(Math.round((financiamento.valorPadrao || 0) * 100)))}/parcela
            </Text>
          </View>
          {contaNome && (
            <View style={styles.resumoRow}>
              <Text style={styles.resumoLabel}>Conta</Text>
              <Text style={styles.resumoValue}>{contaNome}</Text>
            </View>
          )}
          <View style={styles.resumoRow}>
            <Text style={styles.resumoLabel}>Vencimento</Text>
            <Text style={styles.resumoValue}>Dia {financiamento.diaVencimento}</Text>
          </View>
          {economiasTotal > 0 && (
            <View style={[styles.resumoRow, styles.economiaRow]}>
              <Text style={styles.economiaLabel}>Economia total</Text>
              <Text style={styles.economiaValor}>
                {formatBRL(String(Math.round(economiasTotal * 100)))}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Parcelas</Text>
        {parcelas.map((p) => (
          <TouchableOpacity
            key={p.numero}
            style={[styles.parcelaRow, p.pago && styles.parcelaRowPaga]}
            onPress={() => (p.pago ? handleDesmarcarPago(p) : openParcelaModal(p))}
            activeOpacity={0.7}
          >
            <View style={styles.parcelaLeft}>
              <View style={[styles.parcelaNumBadge, p.pago && styles.parcelaNumBadgePago]}>
                <Text style={styles.parcelaNum}>{p.numero}</Text>
              </View>
              <View>
                <Text style={styles.parcelaValorPadrao}>
                  {formatBRL(String(Math.round((p.valorPadrao || 0) * 100)))}
                </Text>
                {p.pago && p.dataPagamento ? (
                  <Text style={styles.parcelaData}>Pago em {p.dataPagamento}</Text>
                ) : p.pago ? (
                  <Text style={styles.parcelaData}>Pago</Text>
                ) : (
                  <Text style={styles.parcelaDataPendente}>Toque para marcar como paga</Text>
                )}
              </View>
            </View>
            {p.pago ? (
              <View style={styles.parcelaRight}>
                {p.valorPago != null && p.valorPago < (p.valorPadrao || 0) && (
                  <Text style={styles.parcelaEconomia}>
                    Economia: {formatBRL(String(Math.round(((p.valorPadrao || 0) - p.valorPago) * 100)))}
                  </Text>
                )}
                <Text style={styles.parcelaValorPago}>
                  Pago: {formatBRL(String(Math.round((p.valorPago ?? p.valorPadrao ?? 0) * 100)))}
                </Text>
                <Ionicons name="checkmark-circle" size={24} color={colors.positive} />
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.excluirBtn} onPress={handleExcluir}>
          <Ionicons name="trash-outline" size={20} color={colors.spending} />
          <Text style={styles.excluirText}>Excluir financiamento</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={!!modalParcela} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalParcela(null)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              Parcela {modalParcela?.numero} — Valor pago
            </Text>
            <Text style={styles.modalSubtitle}>
              Valor padrão: {modalParcela ? formatBRL(String(Math.round((modalParcela.valorPadrao || 0) * 100))) : ''}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="R$ 0,00"
              placeholderTextColor={colors.textMuted}
              value={valorPago === '' ? '' : formatBRL(valorPago)}
              onChangeText={(t) => setValorPago(parseToRaw(t))}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Data do pagamento (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: 10/03/2026"
              placeholderTextColor={colors.textMuted}
              value={dataPagamento}
              onChangeText={setDataPagamento}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalParcela(null)}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnOk} onPress={handleSalvarParcela}>
                <Text style={styles.modalBtnOkText}>Marcar como paga</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
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
  headerRight: { width: 40 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  resumoCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  resumoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  resumoLabel: { fontSize: 14, color: colors.textMuted },
  resumoValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  economiaRow: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  economiaLabel: { fontSize: 14, color: colors.positive },
  economiaValor: { fontSize: 14, fontWeight: '700', color: colors.positive },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  parcelaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  parcelaRowPaga: { opacity: 0.9 },
  parcelaLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  parcelaNumBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundCardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  parcelaNumBadgePago: { backgroundColor: colors.positive + '40' },
  parcelaNum: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  parcelaValorPadrao: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  parcelaData: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  parcelaDataPendente: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  parcelaRight: { alignItems: 'flex-end' },
  parcelaEconomia: { fontSize: 12, color: colors.positive, marginBottom: 2 },
  parcelaValorPago: { fontSize: 14, color: colors.textPrimary },
  excluirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  excluirText: { fontSize: 14, color: colors.spending, fontWeight: '600' },
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
  label: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  modalButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
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
});
