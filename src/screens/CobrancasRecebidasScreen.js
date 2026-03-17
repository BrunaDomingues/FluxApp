import React, { useState } from 'react';
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

export default function CobrancasRecebidasScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { cobrancasRecebidas } = useApp();
  const [detalheId, setDetalheId] = useState(null);

  const lista = cobrancasRecebidas || [];
  const detalhe = detalheId ? lista.find((c) => c.id === detalheId) : null;

  const formatarData = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (_) {
      return iso;
    }
  };

  const totalRecebidoNaCobranca = (c) => (c.recebimentos || []).reduce((s, r) => s + (r.valor || 0), 0);
  const totalRestante = (c) => Math.max(0, (c.totalAReceber || 0) - totalRecebidoNaCobranca(c));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Cobranças recebidas</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl * 2 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hint}>
          Cobranças que outras pessoas enviaram para você (arquivo importado em Mais → Importar dados).
        </Text>
        {lista.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhuma cobrança recebida ainda</Text>
            <Text style={styles.emptySub}>
              Peça para quem dividiu despesas com você usar no app: Cobrança por usuário → Compartilhar dados para importar no app. Depois importe o arquivo aqui em Mais → Importar dados.
            </Text>
          </View>
        ) : detalhe ? (
          <View style={styles.detalhe}>
            <TouchableOpacity style={styles.voltarLista} onPress={() => setDetalheId(null)}>
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
              <Text style={styles.voltarListaText}>Voltar à lista</Text>
            </TouchableOpacity>
            <Text style={styles.detalheTitulo}>Cobrança de {detalhe.fromUser?.nome || 'Alguém'}</Text>
            <Text style={styles.detalheSub}>Enviada em {formatarData(detalhe.generatedAt)}</Text>
            {(detalhe.despesas || []).length === 0 ? (
              <Text style={styles.resumoEmpty}>Nenhuma despesa nesta cobrança.</Text>
            ) : (
              <>
                {(detalhe.despesas || []).map(({ transacao, valorParte, porcentagem }, i) => (
                  <View key={i} style={styles.resumoRow}>
                    <View style={styles.resumoRowLeft}>
                      <Text style={styles.resumoDesc} numberOfLines={1}>
                        {transacao?.descricao || 'Despesa'}
                      </Text>
                      <Text style={styles.resumoData}>
                        {transacao?.data || '—'}
                        {transacao?.local ? ` • ${transacao.local}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.resumoValor}>
                      R$ {(valorParte || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      {porcentagem > 0 && (
                        <Text style={styles.resumoPct}> ({Number(porcentagem).toFixed(0)}%)</Text>
                      )}
                    </Text>
                  </View>
                ))}
                <View style={styles.resumoTotalWrap}>
                  <Text style={styles.resumoTotalLabel}>Total a pagar</Text>
                  <Text style={styles.resumoTotalValor}>
                    R$ {(detalhe.totalAReceber || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                {(detalhe.recebimentos || []).length > 0 && (
                  <View style={styles.recebidosWrap}>
                    <Text style={styles.recebidosLabel}>Já registrado como pago</Text>
                    {(detalhe.recebimentos || []).map((r, i) => (
                      <Text key={i} style={styles.recebidosItem}>
                        R$ {(r.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        {r.data ? ` em ${formatarData(r.data)}` : ''}
                      </Text>
                    ))}
                    <Text style={styles.restanteLabel}>
                      Restante: R$ {totalRestante(detalhe).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        ) : (
          lista.map((c) => {
            const restante = totalRestante(c);
            return (
              <TouchableOpacity
                key={c.id}
                style={styles.card}
                onPress={() => setDetalheId(c.id)}
                activeOpacity={0.8}
              >
                <View style={styles.cardTop}>
                  <Ionicons name="person-outline" size={22} color={colors.primary} />
                  <Text style={styles.cardTitulo}>{c.fromUser?.nome || 'Cobrança'}</Text>
                </View>
                <Text style={styles.cardData}>{formatarData(c.generatedAt)}</Text>
                <View style={styles.cardValores}>
                  <Text style={styles.cardTotal}>
                    R$ {(c.totalAReceber || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                  {restante > 0 && restante < (c.totalAReceber || 0) && (
                    <Text style={styles.cardRestante}>
                      Restante: R$ {restante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  )}
                </View>
                <Text style={styles.cardItens}>{(c.despesas || []).length} despesa(s)</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={styles.cardChevron} />
              </TouchableOpacity>
            );
          })
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
  backBtn: { marginRight: spacing.sm, padding: spacing.xs },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: spacing.sm },
  emptySub: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center', paddingHorizontal: spacing.lg },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardTitulo: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginLeft: spacing.sm },
  cardData: { fontSize: 12, color: colors.textMuted, marginLeft: 30 },
  cardValores: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  cardTotal: { fontSize: 18, fontWeight: '700', color: colors.primary },
  cardRestante: { fontSize: 13, color: colors.textMuted, marginLeft: spacing.sm },
  cardItens: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  cardChevron: { position: 'absolute', right: spacing.sm, top: spacing.md },
  detalhe: { marginTop: spacing.sm },
  voltarLista: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  voltarListaText: { fontSize: 14, color: colors.primary, marginLeft: 4 },
  detalheTitulo: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  detalheSub: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  resumoEmpty: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
  resumoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  resumoRowLeft: { flex: 1, marginRight: spacing.sm },
  resumoDesc: { fontSize: 14, color: colors.textPrimary },
  resumoData: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  resumoValor: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  resumoPct: { fontSize: 12, fontWeight: '400', color: colors.textMuted },
  resumoTotalWrap: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resumoTotalLabel: { fontSize: 14, color: colors.textSecondary },
  resumoTotalValor: { fontSize: 18, fontWeight: '700', color: colors.primary },
  recebidosWrap: { marginTop: spacing.md, paddingTop: spacing.sm },
  recebidosLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  recebidosItem: { fontSize: 13, color: colors.textSecondary },
  restanteLabel: { fontSize: 14, fontWeight: '600', color: colors.positive, marginTop: 4 },
});
