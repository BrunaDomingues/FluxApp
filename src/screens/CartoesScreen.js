import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';

export default function CartoesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { cartoes, updateCartao, removeCartao } = useApp();

  const handleToggleAtivo = (cartao) => {
    updateCartao(cartao.id, { ativo: !cartao.ativo });
  };

  const handleExcluir = (cartao) => {
    Alert.alert(
      'Excluir cartão',
      `Excluir "${cartao.nome}"? As despesas vinculadas não serão removidas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => removeCartao(cartao.id) },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Cartões de crédito</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {cartoes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhum cartão cadastrado.</Text>
            <Text style={styles.emptySub}>Toque no + para adicionar.</Text>
          </View>
        ) : (
          cartoes.map((c) => (
            <View key={c.id} style={[styles.card, !c.ativo && styles.cardInativo]}>
              <TouchableOpacity
                style={styles.cardMain}
                onPress={() => navigation.navigate('AddCard', { editar: c })}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name="card-outline" size={24} color={colors.secondary} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardNome, !c.ativo && styles.cardNomeInativo]} numberOfLines={1}>
                    {c.nome}
                  </Text>
                  <Text style={styles.cardBandeira}>{c.bandeira || 'Cartão'}</Text>
                  <Text style={styles.cardLimite}>
                    Limite: R$ {(c.limite ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              <View style={styles.cardActions}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{c.ativo ? 'Ativo' : 'Desativado'}</Text>
                  <Switch
                    value={c.ativo !== false}
                    onValueChange={() => handleToggleAtivo(c)}
                    trackColor={{ false: colors.backgroundCardElevated, true: colors.secondary + '99' }}
                    thumbColor={c.ativo ? colors.secondary : colors.textMuted}
                  />
                </View>
                <TouchableOpacity
                  style={styles.excluirBtn}
                  onPress={() => handleExcluir(c)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.spending} />
                  <Text style={styles.excluirText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('SelectCardType')}
      >
        <Ionicons name="add" size={28} color={colors.textPrimary} />
      </TouchableOpacity>
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
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 100 },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: { fontSize: 16, color: colors.textMuted, marginTop: spacing.md },
  emptySub: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardInativo: { opacity: 0.7 },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardInfo: { flex: 1 },
  cardNome: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  cardNomeInativo: { color: colors.textMuted },
  cardBandeira: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  cardLimite: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchLabel: { fontSize: 13, color: colors.textMuted },
  excluirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  excluirText: { fontSize: 13, color: colors.spending, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl + 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
