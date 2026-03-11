import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const iconPorCategoria = { Alimentação: 'restaurant-outline', Moradia: 'home-outline', Transporte: 'car-outline', Lazer: 'happy-outline', Casa: 'home-outline', Saúde: 'medkit-outline', Educação: 'school-outline' };
function getCatIcon(cat) {
  if (cat && cat.icon) return cat.icon;
  return iconPorCategoria[cat?.nome] || 'pricetag-outline';
}

export default function BalancoMensalScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());
  const [tab, setTab] = useState('categoria'); // 'categoria' | 'conta'

  const { contas, transacoes, categorias, getReceitasNoMes, getGastoPorCategoriaNoMes } = useApp();

  const receitasTotal = getReceitasNoMes(mes, ano);
  const gastoPorCat = getGastoPorCategoriaNoMes(mes, ano);
  const despesasTotal = Object.values(gastoPorCat).reduce((s, v) => s + v, 0);
  const balancoTotal = receitasTotal - despesasTotal;

  const receitasPorCategoria = useMemo(() => {
    const map = {};
    transacoes
      .filter((t) => t.tipo === 'entrada' && t.mes === mes && t.ano === ano)
      .forEach((t) => {
        const id = t.categoriaId || 'outros';
        map[id] = (map[id] || 0) + (t.valor || 0);
      });
    return map;
  }, [transacoes, mes, ano]);

  const porCategoria = useMemo(() => {
    const ids = new Set([...Object.keys(gastoPorCat), ...Object.keys(receitasPorCategoria)]);
    return Array.from(ids).map((id) => {
      const cat = categorias.find((c) => c.id === id);
      const receita = receitasPorCategoria[id] || 0;
      const despesa = gastoPorCat[id] || 0;
      const saldo = receita - despesa;
      return { id, cat, receita, despesa, saldo };
    }).filter((x) => x.receita !== 0 || x.despesa !== 0).sort((a, b) => (b.receita - b.despesa) - (a.receita - a.despesa));
  }, [gastoPorCat, receitasPorCategoria, categorias]);

  const porConta = useMemo(() => {
    return contas.filter((c) => !c.arquivada).map((conta) => {
      let receita = 0;
      let despesa = 0;
      transacoes.forEach((t) => {
        if (t.contaId !== conta.id) return;
        if (t.mes !== mes || t.ano !== ano) return;
        if (t.tipo === 'entrada') receita += t.valor || 0;
        if (t.tipo === 'saida') despesa += Math.abs(t.valor || 0);
      });
      return { conta, receita, despesa, saldo: receita - despesa };
    }).filter((x) => x.receita !== 0 || x.despesa !== 0);
  }, [contas, transacoes, mes, ano]);

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

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Balanço mensal</Text>
      </View>

      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MESES[mes]}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'categoria' && styles.tabActive]}
          onPress={() => setTab('categoria')}
        >
          <Text style={[styles.tabText, tab === 'categoria' && styles.tabTextActive]}>Balanço por categoria</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'conta' && styles.tabActive]}
          onPress={() => setTab('conta')}
        >
          <Text style={[styles.tabText, tab === 'conta' && styles.tabTextActive]}>Balanço por conta</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 80 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Balanço</Text>
          <Text style={[styles.balanceValue, { color: balancoTotal >= 0 ? colors.positive : colors.spending }]}>
            R$ {balancoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={styles.receitasDespesasRow}>
          <View style={styles.rdItem}>
            <View style={[styles.rdIcon, { backgroundColor: colors.positive + '30' }]}>
              <Ionicons name="arrow-up" size={22} color={colors.positive} />
            </View>
            <Text style={styles.rdLabel}>Receitas</Text>
            <Text style={[styles.rdValue, { color: colors.positive }]}>
              R$ {receitasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.rdItem}>
            <View style={[styles.rdIcon, { backgroundColor: colors.spending + '30' }]}>
              <Ionicons name="arrow-down" size={22} color={colors.spending} />
            </View>
            <Text style={styles.rdLabel}>Despesas</Text>
            <Text style={[styles.rdValue, { color: colors.spending }]}>
              R$ {despesasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {tab === 'categoria' && (
          <View style={styles.listSection}>
            <Text style={styles.listSectionTitle}>Por categoria</Text>
            {porCategoria.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma movimentação por categoria neste mês.</Text>
            ) : (
              porCategoria.map((item) => (
                <View key={item.id} style={styles.listRow}>
                  <View style={[styles.listIcon, { backgroundColor: (item.saldo >= 0 ? colors.positive : colors.spending) + '30' }]}>
                    <Ionicons name={getCatIcon(item.cat)} size={20} color={item.saldo >= 0 ? colors.positive : colors.spending} />
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={styles.listNome}>{item.cat?.nome || 'Outros'}</Text>
                    <Text style={styles.listSub}>
                      Receitas R$ {item.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · Despesas R$ {item.despesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <Text style={[styles.listValor, { color: item.saldo >= 0 ? colors.positive : colors.spending }]}>
                    R$ {item.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {tab === 'conta' && (
          <View style={styles.listSection}>
            <Text style={styles.listSectionTitle}>Por conta</Text>
            {porConta.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma movimentação por conta neste mês.</Text>
            ) : (
              porConta.map((item) => (
                <View key={item.conta.id} style={styles.listRow}>
                  <View style={[styles.listIcon, { backgroundColor: colors.primary + '30' }]}>
                    <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={styles.listNome}>{item.conta.nome}</Text>
                    <Text style={styles.listSub}>
                      Receitas R$ {item.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · Despesas R$ {item.despesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <Text style={[styles.listValor, { color: item.saldo >= 0 ? colors.positive : colors.spending }]}>
                    R$ {item.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              ))
            )}
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
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.lg,
    backgroundColor: colors.secondary + '20',
  },
  navBtn: { padding: spacing.xs },
  monthTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  tabs: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.backgroundCard,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.secondary + '40' },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.textPrimary },
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  balanceCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  balanceLabel: { fontSize: 14, color: colors.textMuted, marginBottom: 4 },
  balanceValue: { fontSize: 28, fontWeight: '700' },
  receitasDespesasRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  rdItem: {
    flex: 1,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  rdIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  rdLabel: { fontSize: 13, color: colors.textMuted },
  rdValue: { fontSize: 16, fontWeight: '700' },
  listSection: { marginTop: spacing.sm },
  listSectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textMuted, paddingVertical: spacing.lg, textAlign: 'center' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  listInfo: { flex: 1 },
  listNome: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  listSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  listValor: { fontSize: 15, fontWeight: '700' },
});
