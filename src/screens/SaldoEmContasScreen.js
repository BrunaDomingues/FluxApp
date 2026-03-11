import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { formatBRL, numberToRaw } from '../utils/currency';
import GraficoFluxoAnual from '../components/GraficoFluxoAnual';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const CHART_WIDTH = Dimensions.get('window').width - spacing.lg * 2;

export default function SaldoEmContasScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { contas, transacoes } = useApp();
  const [selectedContaId, setSelectedContaId] = useState(route?.params?.conta?.id ?? null);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const contasVisiveis = contas.filter((c) => !c.arquivada);
  const conta = contasVisiveis.find((c) => c.id === selectedContaId) ?? contasVisiveis[0];

  if (contasVisiveis.length === 0) {
    navigation.goBack();
    return null;
  }

  const anoAtual = new Date().getFullYear();
  const mesesComDados = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((mes) => {
    const entradas = transacoes
      .filter((t) => t.tipo === 'entrada' && t.contaId === conta.id && t.mes === mes && t.ano === anoAtual)
      .reduce((s, t) => s + (t.valor || 0), 0);
    const saidas = transacoes
      .filter((t) => (t.tipo === 'saida' || t.tipo === 'despesa_cartao') && t.contaId === conta.id && t.mes === mes && t.ano === anoAtual)
      .reduce((s, t) => s + Math.abs(t.valor || 0), 0);
    return { mes, nome: MESES[mes], entradas, saidas, balanco: entradas - saidas };
  });

  const valoresGrafico = mesesComDados.map((m) => m.balanco);

  const handleSelectConta = (c) => {
    setSelectedContaId(c.id);
    setDropdownVisible(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Saldo em contas</Text>
      </View>
      {/* Dropdown: nome da conta com seta para trocar */}
      <TouchableOpacity
        style={styles.contaSelector}
        onPress={() => contasVisiveis.length > 1 && setDropdownVisible(true)}
        disabled={contasVisiveis.length <= 1}
      >
        <Text style={styles.contaNome}>{conta.nome}</Text>
        {contasVisiveis.length > 1 ? (
          <Ionicons name="chevron-down" size={20} color={colors.textPrimary} />
        ) : null}
      </TouchableOpacity>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: (spacing.xl * 2) + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {/* Gráfico fluxo de caixa no ano */}
        <GraficoFluxoAnual values={valoresGrafico} width={CHART_WIDTH} ano={anoAtual} />
        {mesesComDados.map((m) => (
          <View key={m.mes} style={styles.mesRow}>
            <Text style={styles.mesLabel}>{m.nome}</Text>
            <View style={styles.valoresRow}>
              <Text style={styles.entradaText}>Entradas {formatBRL(numberToRaw(m.entradas))}</Text>
              <Text style={styles.sep}> - </Text>
              <Text style={styles.saidaText}>Saídas {formatBRL(numberToRaw(m.saidas))}</Text>
              <Text style={styles.sep}> = </Text>
              <Text style={[styles.balancoText, m.balanco < 0 && styles.balancoNegativo]}>
                Balanço {formatBRL(numberToRaw(m.balanco))}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  contaSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.backgroundCard,
  },
  contaNome: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  mesRow: { marginBottom: spacing.lg },
  mesLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs },
  valoresRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  entradaText: { fontSize: 14, color: colors.positive },
  saidaText: { fontSize: 14, color: colors.spending },
  balancoText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  balancoNegativo: { color: colors.spending },
  sep: { fontSize: 14, color: colors.textMuted, marginHorizontal: 2 },
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
