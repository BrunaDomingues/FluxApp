import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing } from '../constants/theme';
import { useApp } from '../context/AppContext';

const LISTA_CARDS = [
  { key: 'pendenciasAlertas', label: 'Pendências e alertas' },
  { key: 'contas', label: 'Contas' },
  { key: 'cartoes', label: 'Cartões' },
  { key: 'financiamentos', label: 'Financiamentos' },
  { key: 'despesasPorCategoria', label: 'Despesas por categoria' },
  { key: 'planejamentoMensal', label: 'Planejamento mensal' },
  { key: 'economiaMensal', label: 'Economia mensal' },
  { key: 'frequenciaGastos', label: 'Frequência de gastos' },
  { key: 'balancoMensal', label: 'Balanço mensal' },
  { key: 'transacoesFavoritas', label: 'Transações favoritas' },
  { key: 'objetivos', label: 'Objetivos' },
];

export default function CardsDaTelaInicialScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { cardsDaTelaInicial, setCardsDaTelaInicial, cardsOrdem, setCardsOrdem } = useApp();

  const mapByKey = React.useMemo(
    () => LISTA_CARDS.reduce((acc, c) => { acc[c.key] = c; return acc; }, {}),
    []
  );
  const orderedList = React.useMemo(() => {
    const ordered = cardsOrdem.map((k) => mapByKey[k]).filter(Boolean);
    const missing = LISTA_CARDS.filter((c) => !cardsOrdem.includes(c.key));
    return [...ordered, ...missing];
  }, [cardsOrdem, mapByKey]);

  const handleToggle = (key) => {
    setCardsDaTelaInicial((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const moveUp = (key) => {
    setCardsOrdem((prev) => {
      const i = prev.indexOf(key);
      if (i <= 0) return prev;
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  };

  const moveDown = (key) => {
    setCardsOrdem((prev) => {
      const i = prev.indexOf(key);
      if (i < 0 || i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Cards da tela inicial</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {orderedList.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === orderedList.length - 1;
          return (
            <View key={item.key} style={styles.row}>
              <View style={styles.dragHandle}>
                <View style={styles.orderBtns}>
                  <TouchableOpacity
                    onPress={() => moveUp(item.key)}
                    disabled={isFirst}
                    style={[styles.orderBtn, isFirst && styles.orderBtnDisabled]}
                  >
                    <Ionicons name="chevron-up" size={20} color={isFirst ? colors.textMuted : colors.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveDown(item.key)}
                    disabled={isLast}
                    style={[styles.orderBtn, isLast && styles.orderBtnDisabled]}
                  >
                    <Ionicons name="chevron-down" size={20} color={isLast ? colors.textMuted : colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Switch
                value={!!cardsDaTelaInicial[item.key]}
                onValueChange={() => handleToggle(item.key)}
                trackColor={{ false: colors.backgroundCardElevated, true: colors.secondary + '99' }}
                thumbColor={cardsDaTelaInicial[item.key] ? colors.secondary : colors.textMuted}
              />
            </View>
          );
        })}
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
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dragHandle: {
    marginRight: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderBtns: { marginLeft: 2 },
  orderBtn: { padding: 2 },
  orderBtnDisabled: { opacity: 0.5 },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});
