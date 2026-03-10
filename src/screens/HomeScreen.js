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
import { colors, spacing, borderRadius } from '../constants/theme';
import DonutChart from '../components/DonutChart';
import { useApp } from '../context/AppContext';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { contas, cartoes, saldoContas, totalReceitas, totalDespesas } = useApp();
  const cartoesAtivos = cartoes.filter((c) => c.ativo !== false);

  const saldo = saldoContas;
  const entradas = totalReceitas;
  const saidas = totalDespesas;

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

        {/* Contas */}
        <Text style={styles.sectionTitle}>Contas</Text>
        <View style={styles.card}>
          {contas.map((c) => (
            <View key={c.id} style={styles.contaRow}>
              <View style={styles.contaIconWrap}>
                <Ionicons name="wallet-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.contaInfo}>
                <Text style={styles.contaNome}>{c.nome}</Text>
                <Text style={styles.contaSaldo}>
                  R$ {(c.saldo ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addContaButton}
            onPress={() => navigation.navigate('AddAccount')}
          >
            <Ionicons name="add" size={20} color={colors.secondary} />
            <Text style={styles.addContaButtonText}>ADICIONAR UMA CONTA</Text>
          </TouchableOpacity>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Cartões */}
        <Text style={styles.sectionTitle}>Cartões de crédito</Text>
        <View style={styles.card}>
          {cartoesAtivos.length === 0 ? (
            <>
              <View style={styles.emptyCartaoIcon}>
                <Ionicons name="card-outline" size={40} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyCartaoText}>
                Ops! Você ainda não tem nenhum cartão de crédito cadastrado.
              </Text>
              <Text style={styles.emptyCartaoSub}>Melhore seu controle financeiro agora!</Text>
              <TouchableOpacity
                style={styles.addCartaoButton}
                onPress={() => navigation.navigate('AddCard')}
              >
                <Text style={styles.addCartaoButtonText}>ADICIONAR NOVO CARTÃO</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {cartoesAtivos.map((c) => (
                <View key={c.id} style={styles.contaRow}>
                  <View style={[styles.contaIconWrap, { backgroundColor: colors.secondary + '30' }]}>
                    <Ionicons name="card-outline" size={22} color={colors.secondary} />
                  </View>
                  <View style={styles.contaInfo}>
                    <Text style={styles.contaNome}>{c.nome}</Text>
                    <Text style={styles.contaSaldo}>
                      Limite R$ {(c.limite ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={styles.addCartaoButtonSecondary}
                onPress={() => navigation.navigate('AddCard')}
              >
                <Ionicons name="add" size={20} color={colors.secondary} />
                <Text style={styles.addContaButtonText}>ADICIONAR OUTRO CARTÃO</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Resumo */}
        <View style={styles.card}>
          <View style={styles.balanceRow}>
            <Text style={styles.cardLabel}>Saldo em contas</Text>
          </View>
          <Text style={styles.balanceValue}>
            R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={styles.inOutCard}>
          <View style={styles.inOutItem}>
            <Text style={styles.inOutLabel}>Receitas</Text>
            <Text style={[styles.inOutValue, { color: colors.positive }]}>
              R$ {entradas.toFixed(2)}
            </Text>
          </View>
          <View style={styles.inOutItem}>
            <Text style={styles.inOutLabel}>Despesas</Text>
            <Text style={[styles.inOutValue, { color: colors.spending }]}>
              R$ {saidas.toFixed(2)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.categoriasLink}
          onPress={() => navigation.navigate('Categories')}
        >
          <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
          <Text style={styles.categoriasLinkText}>Gerenciar categorias</Text>
        </TouchableOpacity>

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
  scroll: { flex: 1 },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  contaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  contaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contaInfo: { flex: 1 },
  contaNome: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  contaSaldo: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  addContaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  addContaButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.5,
  },
  addCartaoButton: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  addCartaoButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  addCartaoButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  totalLabel: { fontSize: 14, color: colors.textMuted },
  totalValue: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptyCartaoIcon: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyCartaoText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptyCartaoSub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardLabel: { fontSize: 14, color: colors.textMuted },
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
  inOutItem: { flex: 1 },
  inOutLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  inOutValue: { fontSize: 18, fontWeight: '700' },
  categoriasLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  categoriasLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
