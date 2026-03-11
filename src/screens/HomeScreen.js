import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius, categoryChartColors } from '../constants/theme';
import DonutChart from '../components/DonutChart';
import { useApp } from '../context/AppContext';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function buildOpcoesMeses() {
  const now = new Date();
  const anoAtual = now.getFullYear();
  const mesAtual = now.getMonth();
  const opcoes = [];
  for (let i = 0; i < 24; i++) {
    let mes = mesAtual - i;
    let ano = anoAtual;
    while (mes < 0) {
      mes += 12;
      ano -= 1;
    }
    opcoes.push({ mes, ano, label: `${MESES[mes]} ${ano}` });
  }
  return opcoes;
}

const OPCOES_MESES = buildOpcoesMeses();

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { contas, cartoes, saldoContas, categorias, getGastoPorCategoriaNoMes, getReceitasNoMes, cardsDaTelaInicial, cardsOrdem, financiamentos } = useApp();
  const cartoesAtivos = cartoes.filter((c) => c.ativo !== false);
  const cards = cardsDaTelaInicial || {};
  const ordem = Array.isArray(cardsOrdem) && cardsOrdem.length > 0 ? cardsOrdem : [
    'pendenciasAlertas', 'contas', 'cartoes', 'financiamentos', 'despesasPorCategoria', 'planejamentoMensal',
    'economiaMensal', 'frequenciaGastos', 'balancoMensal', 'transacoesFavoritas', 'objetivos',
  ];

  const now = new Date();
  const [selectedMes, setSelectedMes] = useState(now.getMonth());
  const [selectedAno, setSelectedAno] = useState(now.getFullYear());
  const [monthModalVisible, setMonthModalVisible] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);

  const saldo = saldoContas;
  const entradas = getReceitasNoMes(selectedMes, selectedAno);
  const gastosNoMes = getGastoPorCategoriaNoMes(selectedMes, selectedAno);
  const saidas = Object.values(gastosNoMes).reduce((a, b) => a + b, 0);

  const nomeMes = MESES[selectedMes];
  const gastosPorCategoria = getGastoPorCategoriaNoMes(selectedMes, selectedAno);
  const categoriasComGasto = Object.entries(gastosPorCategoria)
    .filter(([, value]) => value > 0)
    .map(([categoriaId, value]) => {
      const cat = categorias.find((c) => c.id === categoriaId);
      return {
        id: categoriaId,
        label: cat?.nome || categoriaId || 'Outros',
        value,
      };
    })
    .sort((a, b) => b.value - a.value)
    .map((item, i) => ({
      ...item,
      color: categoryChartColors[i % categoryChartColors.length],
    }));

  const renderSection = (key) => {
    if (!cards[key]) return null;
    switch (key) {
      case 'pendenciasAlertas':
        return (
          <React.Fragment key={key}>
            <Text style={styles.sectionTitle}>Pendências e alertas</Text>
            <View style={styles.card}>
              <Text style={styles.placeholderCardText}>Nenhuma pendência no momento.</Text>
            </View>
          </React.Fragment>
        );
      case 'contas':
        return (
          <React.Fragment key={key}>
            <Text style={styles.sectionTitle}>Contas</Text>
            <View style={styles.card}>
              {contas.filter((c) => !c.arquivada).map((c) => (
                <View key={c.id} style={styles.contaRow}>
                  <TouchableOpacity
                    style={styles.contaRowTouch}
                    onPress={() => navigation.navigate('ContaDetalhes', { conta: c })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.contaIconWrap}>
                      <Ionicons name="wallet-outline" size={22} color={colors.primary} />
                    </View>
                    <View style={styles.contaInfo}>
                      <View style={styles.contaNomeRow}>
                        <Text style={styles.contaNome}>{c.nome}</Text>
                        <TouchableOpacity
                          style={styles.contaAddDespesaBtn}
                          onPress={() => navigation.navigate('AddTransaction', { tipo: 'saida', contaId: c.id })}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="add-circle" size={22} color={colors.secondary} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.contaSaldo}>
                        R$ {(c.saldo ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addContaButton} onPress={() => navigation.navigate('AddAccount')}>
                <Ionicons name="add" size={20} color={colors.secondary} />
                <Text style={styles.addContaButtonText}>ADICIONAR UMA CONTA</Text>
              </TouchableOpacity>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
              </View>
            </View>
          </React.Fragment>
        );
      case 'cartoes':
        return (
          <React.Fragment key={key}>
            <Text style={styles.sectionTitle}>Cartões de crédito</Text>
            <View style={styles.card}>
              {cartoesAtivos.length === 0 ? (
                <>
                  <View style={styles.emptyCartaoIcon}>
                    <Ionicons name="card-outline" size={40} color={colors.textMuted} />
                  </View>
                  <Text style={styles.emptyCartaoText}>Ops! Você ainda não tem nenhum cartão de crédito cadastrado.</Text>
                  <Text style={styles.emptyCartaoSub}>Melhore seu controle financeiro agora!</Text>
                  <TouchableOpacity style={styles.addCartaoButton} onPress={() => navigation.navigate('AddCard')}>
                    <Text style={styles.addCartaoButtonText}>ADICIONAR NOVO CARTÃO</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {cartoesAtivos.map((c) => (
                    <View key={c.id} style={styles.contaRow}>
                      <View style={styles.contaRowTouch}>
                        <View style={[styles.contaIconWrap, { backgroundColor: colors.secondary + '30' }]}>
                          <Ionicons name="card-outline" size={22} color={colors.secondary} />
                        </View>
                        <View style={styles.contaInfo}>
                          <View style={styles.contaNomeRow}>
                            <Text style={styles.contaNome}>{c.nome}</Text>
                            <TouchableOpacity
                              style={styles.contaAddDespesaBtn}
                              onPress={() => navigation.navigate('AddTransaction', { tipo: 'saida', despesaCartao: true, cartaoId: c.id })}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="add-circle" size={22} color={colors.secondary} />
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.contaSaldo}>Limite R$ {(c.limite ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addCartaoButtonSecondary} onPress={() => navigation.navigate('AddCard')}>
                    <Ionicons name="add" size={20} color={colors.secondary} />
                    <Text style={styles.addContaButtonText}>ADICIONAR OUTRO CARTÃO</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </React.Fragment>
        );
      case 'financiamentos':
        return (
          <React.Fragment key={key}>
            <Text style={styles.sectionTitle}>Financiamentos</Text>
            <View style={styles.card}>
              {financiamentos.length === 0 ? (
                <>
                  <View style={styles.emptyCartaoIcon}>
                    <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
                  </View>
                  <Text style={styles.emptyCartaoText}>Nenhum financiamento cadastrado.</Text>
                  <Text style={styles.emptyCartaoSub}>Registre moto, carro ou outras parcelas.</Text>
                  <TouchableOpacity style={styles.addCartaoButton} onPress={() => navigation.navigate('Financiamentos')}>
                    <Text style={styles.addCartaoButtonText}>VER FINANCIAMENTOS</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {financiamentos.map((f) => {
                    const pagas = (f.parcelas || []).filter((p) => p.pago).length;
                    const economias = (f.parcelas || []).reduce((s, p) => {
                      if (!p.pago || p.valorPago == null) return s;
                      const economia = (p.valorPadrao || 0) - p.valorPago;
                      return s + (economia > 0 ? economia : 0);
                    }, 0);
                    return (
                      <TouchableOpacity
                        key={f.id}
                        style={styles.contaRow}
                        onPress={() => navigation.navigate('FinanciamentoDetalhes', { financiamento: f })}
                        activeOpacity={0.7}
                      >
                        <View style={styles.contaRowTouch}>
                          <View style={[styles.contaIconWrap, { backgroundColor: colors.primary + '30' }]}>
                            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                          </View>
                          <View style={styles.contaInfo}>
                            <View style={styles.contaNomeRow}>
                              <Text style={styles.contaNome}>{f.descricao}</Text>
                            </View>
                            <Text style={styles.contaSaldo}>
                              {pagas}/{f.totalParcelas} parcelas
                              {(f.valorPadrao || 0) > 0 && ` · R$ ${(f.valorPadrao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/parcela`}
                              {economias > 0 && ` · Economia R$ ${economias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity style={styles.addCartaoButtonSecondary} onPress={() => navigation.navigate('Financiamentos')}>
                    <Ionicons name="add" size={20} color={colors.secondary} />
                    <Text style={styles.addContaButtonText}>VER TODOS OS FINANCIAMENTOS</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </React.Fragment>
        );
      case 'balancoMensal':
        return null;
      case 'despesasPorCategoria':
        return (
          <React.Fragment key={key}>
            <TouchableOpacity style={styles.categoriasLink} onPress={() => navigation.navigate('Categories')}>
              <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
              <Text style={styles.categoriasLinkText}>Gerenciar categorias</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>Despesas por categoria</Text>
            <View style={styles.card}>
              <DonutChart data={categoriasComGasto} />
            </View>
          </React.Fragment>
        );
      case 'planejamentoMensal':
        return (
          <React.Fragment key={key}>
            <Text style={styles.sectionTitle}>Planejamento mensal</Text>
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Planejamento')} activeOpacity={0.8}>
              <View style={styles.planejamentoRow}>
                <View style={styles.planejamentoIconWrap}>
                  <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.planejamentoInfo}>
                  <Text style={styles.planejamentoLabel}>Planejamento total</Text>
                  <Text style={styles.planejamentoSub}>Toque para ver o planejamento</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </React.Fragment>
        );
      case 'economiaMensal':
        return (
          <React.Fragment key={key}>
            <Text style={styles.sectionTitle}>Economia mensal</Text>
            <View style={styles.card}>
              <View style={styles.economiaRow}>
                <Ionicons name="trending-up-outline" size={32} color={colors.positive} />
                <Text style={styles.placeholderCardText}>Em breve: acompanhe sua economia mensal.</Text>
              </View>
            </View>
          </React.Fragment>
        );
      case 'frequenciaGastos':
        return (
          <React.Fragment key={key}>
            <Text style={styles.sectionTitle}>Frequência de gastos</Text>
            <View style={styles.card}><Text style={styles.placeholderCardText}>Em breve.</Text></View>
          </React.Fragment>
        );
      case 'transacoesFavoritas':
        return (
          <React.Fragment key={key}>
            <Text style={styles.sectionTitle}>Transações favoritas</Text>
            <View style={styles.card}><Text style={styles.placeholderCardText}>Em breve.</Text></View>
          </React.Fragment>
        );
      case 'objetivos':
        return (
          <React.Fragment key={key}>
            <Text style={styles.sectionTitle}>Objetivos</Text>
            <View style={styles.card}><Text style={styles.placeholderCardText}>Em breve.</Text></View>
          </React.Fragment>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: perfil | mês | presente */}
        <View style={styles.topHeader}>
          {/*<TouchableOpacity style={styles.headerAvatarWrap} activeOpacity={0.8}>
            <View style={styles.headerAvatar}>
              <Ionicons name="person-outline" size={22} color={colors.textPrimary} />
            </View>
            <View style={styles.crownBadge}>
              <Ionicons name="star" size={10} color="#FFD700" />
            </View>
          </TouchableOpacity> 
          */}
          <TouchableOpacity
            style={styles.monthSelector}
            onPress={() => setMonthModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.monthLabel}>{nomeMes}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.textPrimary} style={styles.monthChevron} />
          </TouchableOpacity>
          {/*
          <TouchableOpacity style={styles.giftButton} activeOpacity={0.8}>
            <Ionicons name="gift-outline" size={22} color="#FFF" />
            <View style={styles.giftBadge} />
          </TouchableOpacity>
          */}
        </View>

        <Modal
          visible={monthModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMonthModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.monthModalBackdrop}
            activeOpacity={1}
            onPress={() => setMonthModalVisible(false)}
          >
            <View style={styles.monthModalContent}>
              <Text style={styles.monthModalTitle}>Selecionar mês</Text>
              <FlatList
                data={OPCOES_MESES}
                keyExtractor={(item) => `${item.ano}-${item.mes}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.monthModalItem,
                      item.mes === selectedMes && item.ano === selectedAno && styles.monthModalItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedMes(item.mes);
                      setSelectedAno(item.ano);
                      setMonthModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.monthModalItemText,
                        item.mes === selectedMes && item.ano === selectedAno && styles.monthModalItemTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.mes === selectedMes && item.ano === selectedAno && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Saldo em contas + olho */}
        <View style={styles.balanceBlock}>
          <Text style={styles.balanceLabel}>Saldo em contas</Text>
          <Text style={styles.balanceValue}>
            {balanceVisible ? `R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ •••••••'}
          </Text>
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setBalanceVisible((v) => !v)}
            activeOpacity={0.7}
          >
            <Ionicons name={balanceVisible ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Card Receitas | Despesas */}
        <View style={styles.inOutCard}>
          <View style={styles.inOutItem}>
            <View style={[styles.inOutIconWrap, { backgroundColor: colors.positive + '25' }]}>
              <Ionicons name="arrow-up" size={24} color={colors.positive} />
            </View>
            <Text style={styles.inOutLabel}>Receitas</Text>
            <Text style={[styles.inOutValue, { color: colors.positive }]}>
              {balanceVisible ? `R$ ${entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ •••••••'}
            </Text>
          </View>
          <View style={styles.inOutItem}>
            <View style={[styles.inOutIconWrap, { backgroundColor: colors.spending + '25' }]}>
              <Ionicons name="arrow-down" size={24} color={colors.spending} />
            </View>
            <Text style={styles.inOutLabel}>Despesas</Text>
            <Text style={[styles.inOutValue, { color: colors.spending }]}>
              {balanceVisible ? `R$ ${saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ •••••••'}
            </Text>
          </View>
        </View>

        {ordem.map((key) => renderSection(key))}
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  headerAvatarWrap: {
    position: 'relative',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 4,
  },
  monthChevron: { marginLeft: 2 },
  giftButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  giftBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.positive,
  },
  monthModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  monthModalContent: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    maxHeight: 400,
    paddingVertical: spacing.sm,
  },
  monthModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  monthModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  monthModalItemSelected: {
    backgroundColor: colors.primary + '20',
  },
  monthModalItemText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  monthModalItemTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  balanceBlock: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  eyeButton: {
    padding: spacing.xs,
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
    alignItems: 'center',
  },
  inOutIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  inOutLabel: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  inOutValue: { fontSize: 17, fontWeight: '700' },
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
  contaRowTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contaNomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  contaAddDespesaBtn: {
    padding: spacing.xs,
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
  contaNome: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, flex: 1 },
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
  placeholderCardText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  planejamentoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planejamentoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  planejamentoInfo: { flex: 1 },
  planejamentoLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  planejamentoSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  economiaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
