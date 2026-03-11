import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { formatBRL } from '../utils/currency';

export default function FinanciamentosScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { financiamentos, contas } = useApp();
  const contasVisiveis = contas.filter((c) => !c.arquivada);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Financiamentos</Text>
        <View style={styles.headerRight} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {financiamentos.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhum financiamento cadastrado.</Text>
            <Text style={styles.emptySub}>Toque em + para registrar (ex.: moto, carro).</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('AddFinanciamento')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={24} color={colors.textPrimary} />
              <Text style={styles.addBtnText}>Novo financiamento</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {financiamentos.map((f) => {
              const parcelas = f.parcelas || [];
              const pagas = parcelas.filter((p) => p.pago).length;
              const totalFinanciamento = (f.totalParcelas || 0) * (f.valorPadrao || 0);
              const totalPago = parcelas.reduce((s, p) => s + (p.pago ? (p.valorPago ?? p.valorPadrao ?? 0) : 0), 0);
              const economias = parcelas.reduce((s, p) => {
                if (!p.pago || p.valorPago == null) return s;
                const economia = (p.valorPadrao || 0) - p.valorPago;
                return s + (economia > 0 ? economia : 0);
              }, 0);
              const contaNome = f.contaId ? contasVisiveis.find((c) => c.id === f.contaId)?.nome : null;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={styles.card}
                  onPress={() => navigation.navigate('FinanciamentoDetalhes', { financiamento: f })}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                    <View style={styles.cardTitleWrap}>
                      <Text style={styles.cardTitle}>{f.descricao}</Text>
                      {contaNome ? (
                        <Text style={styles.cardSub}>{contaNome} · Venc. dia {f.diaVencimento}</Text>
                      ) : (
                        <Text style={styles.cardSub}>Venc. dia {f.diaVencimento}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </View>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Parcelas</Text>
                    <Text style={styles.cardValue}>{pagas}/{f.totalParcelas}</Text>
                  </View>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Valor padrão</Text>
                    <Text style={styles.cardValue}>{formatBRL(String(Math.round((f.valorPadrao || 0) * 100)))}/parcela</Text>
                  </View>
                  {totalFinanciamento > 0 && (
                    <View style={styles.cardRow}>
                      <Text style={styles.cardLabel}>Total do financiamento</Text>
                      <Text style={styles.cardValue}>{formatBRL(String(Math.round(totalFinanciamento * 100)))}</Text>
                    </View>
                  )}
                  {(pagas > 0 || totalPago > 0) && (
                    <View style={styles.cardRow}>
                      <Text style={styles.cardLabel}>Total pago</Text>
                      <Text style={styles.cardValue}>{formatBRL(String(Math.round(totalPago * 100)))}</Text>
                    </View>
                  )}
                  {economias > 0 && (
                    <View style={[styles.cardRow, styles.economiaRow]}>
                      <Text style={styles.economiaLabel}>Economia</Text>
                      <Text style={styles.economiaValor}>{formatBRL(String(Math.round(economias * 100)))}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.fabList}
              onPress={() => navigation.navigate('AddFinanciamento')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color={colors.primary} />
              <Text style={styles.fabListText}>Novo financiamento</Text>
            </TouchableOpacity>
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
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  headerRight: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: { fontSize: 16, color: colors.textMuted, marginTop: spacing.md },
  emptySub: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  addBtnText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitleWrap: { flex: 1, marginLeft: spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  cardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  cardLabel: { fontSize: 14, color: colors.textMuted },
  cardValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  economiaRow: { marginTop: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  economiaLabel: { fontSize: 14, color: colors.positive },
  economiaValor: { fontSize: 14, fontWeight: '700', color: colors.positive },
  fabList: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  fabListText: { fontSize: 16, fontWeight: '600', color: colors.primary },
});
