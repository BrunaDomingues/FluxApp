import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../constants/theme';

const TRANSAÇÕES = [
  { id: '1', categoria: 'Moradia', valor: 17, tipo: 'entrada', data: '10/03', icon: 'home-outline' },
  { id: '2', categoria: 'Alimentação', valor: -3, tipo: 'saida', data: '10/03', icon: 'restaurant-outline' },
  { id: '3', categoria: 'Uber', valor: -3.3, tipo: 'saida', data: '09/03', icon: 'car-outline' },
  { id: '4', categoria: 'Salário', valor: 2500, tipo: 'entrada', data: '05/03', icon: 'briefcase-outline' },
  { id: '5', categoria: 'Supermercado', valor: -120.5, tipo: 'saida', data: '04/03', icon: 'cart-outline' },
];

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();

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
          {TRANSAÇÕES.map((t) => (
            <View key={t.id} style={styles.row}>
              <View style={styles.iconWrap}>
                <Ionicons name={t.icon} size={20} color={colors.textMuted} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.categoria}>{t.categoria}</Text>
                <Text style={styles.data}>{t.data}</Text>
              </View>
              <Text
                style={[
                  styles.valor,
                  t.tipo === 'entrada' ? styles.valorEntrada : styles.valorSaida,
                ]}
              >
                {t.valor >= 0 ? '+' : ''}R$ {Math.abs(t.valor).toFixed(2)}
              </Text>
            </View>
          ))}
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
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
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
