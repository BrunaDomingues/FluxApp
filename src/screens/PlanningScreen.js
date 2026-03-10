import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const iconPorCategoria = { Alimentação: 'restaurant-outline', Moradia: 'home-outline', Transporte: 'car-outline', Lazer: 'happy-outline' };
function getCatIcon(nome) { return iconPorCategoria[nome] || 'pricetag-outline'; }

export default function PlanningScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());

  const { getOrcamento, getGastoPorCategoriaNoMes, categorias, setOrcamentoMensal, removeOrcamentoMensal } = useApp();
  const orc = getOrcamento(mes, ano);
  const gastoPorCat = getGastoPorCategoriaNoMes(mes, ano);
  const totalOrcamento = orc.total || 0;
  const totalGasto = useMemo(() => Object.values(gastoPorCat).reduce((s, v) => s + v, 0), [gastoPorCat]);
  const restamTotal = Math.max(0, totalOrcamento - totalGasto);
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const diaHoje = now.getDate();
  const diasRestantes = Math.max(1, diasNoMes - diaHoje + 1);
  const disponivelPorDia = restamTotal / diasRestantes;

  const categoriasSaida = categorias.filter((c) => c.tipo === 'saida');
  const orcamentoPorCategoria = orc.categorias || {};
  const totalOrcamentoCategorias = Object.values(orcamentoPorCategoria).reduce((s, v) => s + (v || 0), 0);
  const restantesCategorias = Math.max(0, totalOrcamento - totalOrcamentoCategorias);

  const prevMonth = () => {
    if (mes === 0) {
      setMes(11);
      setAno((a) => a - 1);
    } else setMes((m) => m - 1);
  };
  const nextMonth = () => {
    if (mes === 11) {
      setMes(0);
      setAno((a) => a + 1);
    } else setMes((m) => m + 1);
  };

  const temOrcamento = totalOrcamento > 0;
  const mesAnterior = mes === 0 ? 11 : mes - 1;
  const anoAnterior = mes === 0 ? ano - 1 : ano;
  const orcAnterior = getOrcamento(mesAnterior, anoAnterior);
  const temOrcamentoAnterior = (orcAnterior.total || 0) > 0;

  const handleExcluir = () => {
    Alert.alert(
      'Excluir planejamento',
      `Excluir o planejamento de ${MESES[mes]}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => removeOrcamentoMensal(mes, ano) },
      ]
    );
  };

  const handleCopiarAnterior = () => {
    if (!temOrcamentoAnterior) return;
    setOrcamentoMensal(mes, ano, orcAnterior.total, orcAnterior.categorias || {});
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Mensal</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textPrimary} />
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{MESES[mes]}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        {temOrcamento && (
          <TouchableOpacity onPress={handleExcluir} style={styles.headerIconBtn}>
            <Ionicons name="trash-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.headerIconBtn}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!temOrcamento ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="wallet-outline" size={64} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Ops! Nenhum planejamento definido para este mês.</Text>
            <TouchableOpacity
              style={styles.copiarBtn}
              onPress={handleCopiarAnterior}
              disabled={!temOrcamentoAnterior}
            >
              <Text style={[styles.copiarBtnText, !temOrcamentoAnterior && styles.copiarBtnTextDisabled]}>
                COPIAR DO MÊS ANTERIOR
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.definirLink}
              onPress={() => navigation.navigate('DefinirOrcamento', { mes, ano })}
            >
              <Text style={styles.definirLinkText}>DEFINIR NOVO PLANEJAMENTO</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Planejamento total</Text>
            <TouchableOpacity>
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.restamLabel}>Restam</Text>
          <Text style={styles.restamValue}>R$ {restamTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          <Text style={styles.diariaLabel}>Disponível por dia</Text>
          <Text style={styles.diariaValue}>R$ {disponivelPorDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          <View style={styles.progressWrap}>
            <View style={[styles.progressBar, { flex: 1 }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${totalOrcamento ? Math.min(100, (totalGasto / totalOrcamento) * 100) : 0}%`,
                    backgroundColor: colors.secondary,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              R$ {totalGasto.toFixed(2)} de R$ {totalOrcamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {categoriasSaida.map((cat) => {
          const limite = orcamentoPorCategoria[cat.id] || 0;
          const gasto = gastoPorCat[cat.id] || 0;
          const restam = Math.max(0, limite - gasto);
          const pct = limite ? (gasto / limite) * 100 : 0;
          if (limite <= 0) return null;
          return (
            <View key={cat.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={[styles.catIcon, { backgroundColor: colors.spending + '40' }]}>
                  <Ionicons name={getCatIcon(cat.nome)} size={20} color={colors.spending} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.catNome}>{cat.nome}</Text>
                  <Text style={styles.restamCat}>Restam R$ {restam.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                </View>
              </View>
              <View style={styles.progressWrap}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, pct)}%`, backgroundColor: colors.spending }]} />
                </View>
                <Text style={styles.progressText}>
                  R$ {gasto.toFixed(2)} de R$ {limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          );
        })}

        {totalOrcamentoCategorias < totalOrcamento && totalOrcamento > 0 && (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[styles.catIcon, { backgroundColor: colors.secondary + '40' }]}>
                <Ionicons name="wallet-outline" size={20} color={colors.secondary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.catNome}>Categorias restantes</Text>
                <Text style={styles.restamCat}>Restam R$ {restantesCategorias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
              </View>
            </View>
            <View style={styles.progressWrap}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '0%', backgroundColor: colors.secondary }]} />
              </View>
              <Text style={styles.progressText}>R$ 0,00 de R$ {restantesCategorias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.definirBtn}
          onPress={() => navigation.navigate('DefinirOrcamento', { mes, ano })}
        >
          <Text style={styles.definirBtnText}>DEFINIR NOVO ORÇAMENTO</Text>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.secondary,
    gap: spacing.xs,
  },
  headerLabel: { fontSize: 16, color: colors.textPrimary, fontWeight: '600' },
  monthNav: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  navBtn: { padding: spacing.xs },
  monthTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  section: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  restamLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  restamValue: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  diariaLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  diariaValue: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.md },
  progressWrap: { marginTop: spacing.xs },
  progressBar: {
    height: 8,
    backgroundColor: colors.backgroundCardElevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, color: colors.textMuted },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardInfo: { flex: 1 },
  catNome: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  restamCat: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  definirBtn: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  definirBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  headerIconBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  copiarBtn: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    minWidth: 280,
    alignItems: 'center',
  },
  copiarBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  copiarBtnTextDisabled: {
    color: colors.textMuted,
    opacity: 0.8,
  },
  definirLink: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  definirLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
    letterSpacing: 0.3,
  },
});
