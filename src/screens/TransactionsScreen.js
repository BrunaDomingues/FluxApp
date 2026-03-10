import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const { transacoes } = useApp();

  const getIcon = (categoriaNome) => iconMap[categoriaNome] || iconMap.default;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Transações</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {transacoes.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="list-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Nenhuma transação ainda.</Text>
              <Text style={styles.emptySub}>Use o botão + para adicionar.</Text>
            </View>
          ) : (
            transacoes.map((t) => (
              <View key={t.id} style={styles.row}>
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
                </View>
                <Text
                  style={[
                    styles.valor,
                    (t.tipo === 'entrada' || (t.valor && t.valor > 0)) ? styles.valorEntrada : styles.valorSaida,
                  ]}
                >
                  {t.valor >= 0 ? '+' : ''}R$ {Math.abs(t.valor || 0).toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
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
});
