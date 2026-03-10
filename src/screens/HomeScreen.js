import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import DonutChart from '../components/DonutChart';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const balance = 16392.0;
  const entradas = 109.0;
  const saidas = 52.45;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Olá, Usuário!</Text>
          <TouchableOpacity style={styles.avatar}>
            <Ionicons name="person-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.balanceRow}>
            <Text style={styles.cardLabel}>Saldo</Text>
            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceValue}>
            R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={styles.inOutCard}>
          <View style={styles.inOutItem}>
            <Text style={styles.inOutLabel}>Entradas</Text>
            <Text style={[styles.inOutValue, { color: colors.positive }]}>
              R$ {entradas.toFixed(2)}
            </Text>
          </View>
          <View style={styles.inOutItem}>
            <Text style={styles.inOutLabel}>Saídas</Text>
            <Text style={[styles.inOutValue, { color: colors.spending }]}>
              R$ {saidas.toFixed(2)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Gastos por categoria</Text>
        <DonutChart />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inOutCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  inOutItem: {
    flex: 1,
  },
  inOutLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  inOutValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
});
