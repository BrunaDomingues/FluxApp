import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius, categoryChartColors } from '../constants/theme';
import DonutChart from '../components/DonutChart';
import { useApp } from '../context/AppContext';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function buildAnos() {
  const anoAtual = new Date().getFullYear();
  const anos = [];
  for (let a = anoAtual - 5; a <= anoAtual + 10; a++) anos.push(a);
  return anos;
}
const ANOS = buildAnos();

const PLANEJAMENTO_CARD_WIDTH = Dimensions.get('window').width * 0.78;
const iconPorCategoria = { Alimentação: 'restaurant-outline', Moradia: 'home-outline', Transporte: 'car-outline', Lazer: 'happy-outline', Casa: 'home-outline', Saúde: 'medkit-outline', Educação: 'school-outline' };
function getCatIcon(cat) {
  if (cat && cat.icon) return cat.icon;
  return iconPorCategoria[cat?.nome] || 'pricetag-outline';
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { contas, cartoes, saldoContas, categorias, transacoes, getGastoPorCategoriaNoMes, getReceitasNoMes, getOrcamento, cardsDaTelaInicial, cardsOrdem, financiamentos, getProximasParcelasCartao, updateTransacao, objetivos } = useApp();
  const cartoesAtivos = cartoes.filter((c) => c.ativo !== false);
  const cards = cardsDaTelaInicial || {};
  const ordemBase = Array.isArray(cardsOrdem) && cardsOrdem.length > 0 ? cardsOrdem : [
    'pendenciasAlertas', 'contas', 'cartoes', 'financiamentos', 'despesasPorCategoria', 'planejamentoMensal',
    'economiaMensal', 'frequenciaGastos', 'balancoMensal', 'transacoesFavoritas', 'objetivos',
  ];
  const ordem = [...ordemBase];
  [
    'pendenciasAlertas', 'contas', 'cartoes', 'financiamentos', 'despesasPorCategoria', 'planejamentoMensal',
    'economiaMensal', 'frequenciaGastos', 'balancoMensal', 'transacoesFavoritas', 'objetivos',
  ].forEach((k) => { if (!ordem.includes(k)) ordem.push(k); });

  const now = new Date();
  const [selectedMes, setSelectedMes] = useState(now.getMonth());
  const [selectedAno, setSelectedAno] = useState(now.getFullYear());
  const [monthModalVisible, setMonthModalVisible] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [filtroFrequencia, setFiltroFrequencia] = useState('7'); // '7' | '30' | '365'

  const getGastoNoDia = (ano, mes, dia) => {
    return transacoes
      .filter((t) => (t.tipo === 'saida' || t.tipo === 'despesa_cartao') && t.ano === ano && t.mes === mes)
      .filter((t) => {
        const parts = (t.data || '').split('/');
        const d = parseInt(parts[0], 10);
        return !isNaN(d) && d === dia;
      })
      .reduce((s, t) => s + Math.abs(t.valor || 0), 0);
  };

  const dadosFrequenciaGastos = (() => {
    if (filtroFrequencia === '365') {
      const result = [];
      const hoje = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const gastoMes = getGastoPorCategoriaNoMes(d.getMonth(), d.getFullYear());
        const total = Object.values(gastoMes).reduce((a, b) => a + b, 0);
        result.push({ label: MESES_SHORT[d.getMonth()], value: total });
      }
      return result;
    }
    const n = filtroFrequencia === '30' ? 30 : 7;
    const hoje = new Date();
    const result = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      const valor = getGastoNoDia(d.getFullYear(), d.getMonth(), d.getDate());
      result.push({
        label: `${String(d.getDate()).padStart(2, '0')}/${MESES_SHORT[d.getMonth()].toLowerCase()}.`,
        value: valor,
      });
    }
    return result;
  })();
  const maxFrequencia = Math.max(1, ...dadosFrequenciaGastos.map((x) => x.value));

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
              {(() => {
                const proximasParcelas = getProximasParcelasCartao();
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const diasAlerta = 7;
                const formatBRLShort = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                const parcelasComAlerta = proximasParcelas.map((p) => {
                  const cartao = cartoes.find((c) => c.id === p.cartaoId);
                  const diaVen = cartao?.diaVencimento ?? 10;
                  const dataVen = new Date(p.anoVencimento, p.mesVencimento, Math.min(diaVen, 28));
                  dataVen.setHours(0, 0, 0, 0);
                  const diffDias = Math.ceil((dataVen - hoje) / (1000 * 60 * 60 * 24));
                  const pertoVencimento = diffDias >= 0 && diffDias <= diasAlerta;
                  const vencida = diffDias < 0;
                  return { ...p, dataVen, diffDias, pertoVencimento, vencida, cartaoNome: cartao?.nome || 'Cartão' };
                });
                if (parcelasComAlerta.length === 0) {
                  return <Text style={styles.placeholderCardText}>Nenhuma pendência no momento.</Text>;
                }
                const emAlerta = parcelasComAlerta.filter((p) => p.vencida || p.pertoVencimento);
                const outras = parcelasComAlerta.filter((p) => !p.vencida && !p.pertoVencimento);
                return (
                  <>
                    {emAlerta.length > 0 && (
                      <>
                        {emAlerta.map((p) => (
                          <View key={p.id} style={[styles.parcelaRow, p.vencida && styles.parcelaRowVencida]}>
                            <View style={styles.parcelaInfo}>
                              <Text style={styles.parcelaDesc}>{p.descricao}</Text>
                              <Text style={styles.parcelaCartao}>{p.cartaoNome}</Text>
                              <Text style={[styles.parcelaVenc, p.vencida && styles.parcelaVencVencida]}>
                                {p.vencida ? `Venceu em ${formatBRLShort(p.dataVen)}` : p.diffDias === 0 ? 'Vence hoje' : `Vence em ${formatBRLShort(p.dataVen)} (${p.diffDias} dias)`}
                              </Text>
                            </View>
                            <Text style={styles.parcelaValor}>R$ {Math.abs(p.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                            <TouchableOpacity
                              style={styles.parcelaPagoBtn}
                              onPress={() => updateTransacao(p.id, { pago: true })}
                            >
                              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </>
                    )}
                    {outras.length > 0 && (
                      <>
                        <Text style={[styles.labelSmall, { marginTop: emAlerta.length > 0 ? 8 : 0 }]}>Próximas parcelas a pagar</Text>
                        {outras.slice(0, 10).map((p) => (
                          <View key={p.id} style={styles.parcelaRow}>
                            <View style={styles.parcelaInfo}>
                              <Text style={styles.parcelaDesc}>{p.descricao}</Text>
                              <Text style={styles.parcelaCartao}>{p.cartaoNome} • Venc. {formatBRLShort(p.dataVen)}</Text>
                            </View>
                            <Text style={styles.parcelaValor}>R$ {Math.abs(p.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                            <TouchableOpacity
                              style={styles.parcelaPagoBtn}
                              onPress={() => updateTransacao(p.id, { pago: true })}
                            >
                              <Ionicons name="checkmark-circle-outline" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </>
                    )}
                  </>
                );
              })()}
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
            <Text style={styles.sectionTitle}>Cartões</Text>
            <View style={styles.card}>
              {cartoesAtivos.length === 0 ? (
                <>
                  <View style={styles.emptyCartaoIcon}>
                    <Ionicons name="card-outline" size={40} color={colors.textMuted} />
                  </View>
                  <Text style={styles.emptyCartaoText}>Ops! Você ainda não tem nenhum cartão de cadastrado.</Text>
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
                    const parcelas = f.parcelas || [];
                    const pagas = parcelas.filter((p) => p.pago).length;
                    const totalFinanciamento = (f.totalParcelas || 0) * (f.valorPadrao || 0);
                    const totalPago = parcelas.reduce((s, p) => s + (p.pago ? (p.valorPago ?? p.valorPadrao ?? 0) : 0), 0);
                    const economias = parcelas.reduce((s, p) => {
                      if (!p.pago || p.valorPago == null) return s;
                      const economia = (p.valorPadrao || 0) - p.valorPago;
                      return s + (economia > 0 ? economia : 0);
                    }, 0);
                    return (
                      <TouchableOpacity
                        key={f.id}
                        style={[styles.contaRow, styles.finItemRow]}
                        onPress={() => navigation.navigate('FinanciamentoDetalhes', { financiamento: f })}
                        activeOpacity={0.7}
                      >
                        <View style={styles.finRowTouch}>
                          {/* Row 1: ícone + nome */}
                          <View style={styles.finNomeRow}>
                            <View style={[styles.contaIconWrap, { backgroundColor: colors.primary + '30' }]}>
                              <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                            </View>
                            <Text style={styles.contaNome} numberOfLines={1}>{f.descricao}</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                          </View>
                          {/* Row 2: dados */}
                          <View style={styles.finDadosWrap}>
                            <View style={styles.finDadoRow}>
                              <Text style={styles.finDadoLabel}>Parcelas</Text>
                              <Text style={styles.finDadoValor}>{pagas}/{f.totalParcelas}</Text>
                            </View>
                            {(f.valorPadrao || 0) > 0 && (
                              <View style={styles.finDadoRow}>
                                <Text style={styles.finDadoLabel}>Valor/parcela</Text>
                                <Text style={styles.finDadoValor}>
                                  R$ {(f.valorPadrao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </Text>
                              </View>
                            )}
                            {totalFinanciamento > 0 && (
                              <View style={styles.finDadoRow}>
                                <Text style={styles.finDadoLabel}>Total do financiamento</Text>
                                <Text style={styles.finDadoValor}>
                                  R$ {totalFinanciamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </Text>
                              </View>
                            )}
                            {(pagas > 0 || totalPago > 0) && (
                              <View style={styles.finDadoRow}>
                                <Text style={styles.finDadoLabel}>Total pago</Text>
                                <Text style={styles.finDadoValor}>
                                  R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </Text>
                              </View>
                            )}
                            {economias > 0 && (
                              <View style={styles.finDadoRow}>
                                <Text style={styles.finDadoLabel}>Economia</Text>
                                <Text style={styles.finEconomiaValor}>
                                  R$ {economias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </Text>
                              </View>
                            )}
                          </View>
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
      case 'balancoMensal': {
        const balancoValor = entradas - saidas;
        return (
          <React.Fragment key={key}>
            <Text style={styles.sectionTitle}>Balanço mensal</Text>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('BalancoMensal')}
              activeOpacity={0.8}
            >
              <View style={styles.balancoCardContent}>
                <View style={styles.balancoBarrasWrap}>
                  <View style={styles.balancoBarCol}>
                    <View style={[styles.balancoBar, styles.balancoBarReceita, { height: entradas > 0 || saidas > 0 ? Math.max(8, (entradas / Math.max(entradas, saidas, 1)) * 56) : 8 }]} />
                    <Text style={styles.balancoBarLabel}>Receitas</Text>
                  </View>
                  <View style={styles.balancoBarCol}>
                    <View style={[styles.balancoBar, styles.balancoBarDespesa, { height: saidas > 0 || entradas > 0 ? Math.max(8, (saidas / Math.max(entradas, saidas, 1)) * 56) : 8 }]} />
                    <Text style={styles.balancoBarLabel}>Despesas</Text>
                  </View>
                </View>
                <View style={styles.balancoValoresWrap}>
                  <View style={styles.balancoValorItem}>
                    <Text style={styles.balancoValorLabel}>Receitas</Text>
                    <Text style={[styles.balancoValorNum, { color: colors.positive }]}>
                      R$ {entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={styles.balancoValorItem}>
                    <Text style={styles.balancoValorLabel}>Despesas</Text>
                    <Text style={[styles.balancoValorNum, { color: colors.spending }]}>
                      R$ {saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                  <View style={styles.balancoValorItem}>
                    <Text style={styles.balancoValorLabel}>Balanço</Text>
                    <Text style={[styles.balancoValorNum, { color: balancoValor >= 0 ? colors.positive : colors.spending }]}>
                      R$ {balancoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.detalhesLink} onPress={() => navigation.navigate('BalancoMensal')}>
                <Text style={styles.detalhesLinkText}>DETALHES</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </React.Fragment>
        );
      }
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
      case 'planejamentoMensal': {
        const orc = getOrcamento(selectedMes, selectedAno);
        const orcamentoPorCategoria = orc.categorias || {};
        const totalOrcamento = orc.total || 0;
        const gastoPorCatPlanejamento = getGastoPorCategoriaNoMes(selectedMes, selectedAno);
        const totalGastoPlanejamento = Object.values(gastoPorCatPlanejamento).reduce((s, v) => s + v, 0);
        const categoriasSaida = categorias.filter((c) => c.tipo === 'saida');
        const totalOrcamentoCategorias = Object.values(orcamentoPorCategoria).reduce((s, v) => s + (v || 0), 0);
        const restantesCategorias = Math.max(0, totalOrcamento - totalOrcamentoCategorias);

        if (totalOrcamento <= 0) {
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
        }

        const restamTotal = Math.max(0, totalOrcamento - totalGastoPlanejamento);
        const pctTotal = totalOrcamento ? Math.min(100, (totalGastoPlanejamento / totalOrcamento) * 100) : 0;

        const planejamentoCards = [
          {
            id: 'total',
            label: 'Planejamento total',
            icon: 'document-text-outline',
            restam: restamTotal,
            gasto: totalGastoPlanejamento,
            limite: totalOrcamento,
            pct: pctTotal,
            color: colors.secondary,
          },
          ...categoriasSaida
            .filter((cat) => (orcamentoPorCategoria[cat.id] || 0) > 0)
            .map((cat) => {
              const limite = orcamentoPorCategoria[cat.id] || 0;
              const gasto = gastoPorCatPlanejamento[cat.id] || 0;
              const restam = Math.max(0, limite - gasto);
              const pct = limite ? (gasto / limite) * 100 : 0;
              return {
                id: cat.id,
                label: cat.nome,
                icon: getCatIcon(cat),
                restam,
                gasto,
                limite,
                pct: Math.min(100, pct),
                color: colors.spending,
              };
            }),
        ];
        if (restantesCategorias > 0) {
          planejamentoCards.push({
            id: 'restantes',
            label: 'Categorias restantes',
            icon: 'wallet-outline',
            restam: restantesCategorias,
            gasto: 0,
            limite: restantesCategorias,
            pct: 0,
            color: colors.secondary,
          });
        }

        return (
          <React.Fragment key={key}>
            <Text style={styles.sectionTitle}>Planejamento mensal</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.planejamentoScrollContent}
            >
              {planejamentoCards.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.planejamentoCard, { width: PLANEJAMENTO_CARD_WIDTH }]}
                  onPress={() => navigation.navigate('Planejamento')}
                  activeOpacity={0.8}
                >
                  <View style={styles.planejamentoCardRow}>
                    <View style={[styles.planejamentoCardIcon, { backgroundColor: item.color + '40' }]}>
                      <Ionicons name={item.icon} size={22} color={item.color} />
                    </View>
                    <View style={styles.planejamentoCardInfo}>
                      <Text style={styles.planejamentoCardLabel} numberOfLines={1}>{item.label}</Text>
                      <Text style={styles.planejamentoCardRestam}>
                        Restam R$ {item.restam.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>
                  <View style={styles.planejamentoProgressWrap}>
                    <View style={styles.planejamentoProgressTrack}>
                      <View style={[styles.planejamentoProgressFill, { width: `${item.pct}%`, backgroundColor: item.color }]} />
                    </View>
                    <Text style={styles.planejamentoProgressText}>
                      R$ {item.gasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R$ {item.limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </React.Fragment>
        );
      }
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
            <View style={styles.card}>
              <View style={styles.frequenciaFiltrosRow}>
                {[
                  { id: '7', label: '7 dias' },
                  { id: '30', label: '30 dias' },
                  { id: '365', label: 'Último ano' },
                ].map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.frequenciaFiltroBtn, filtroFrequencia === f.id && styles.frequenciaFiltroBtnActive]}
                    onPress={() => setFiltroFrequencia(f.id)}
                  >
                    <Text style={[styles.frequenciaFiltroText, filtroFrequencia === f.id && styles.frequenciaFiltroTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.frequenciaChartWrap}>
                {dadosFrequenciaGastos.map((item, i) => (
                  <View key={i} style={styles.frequenciaBarWrap}>
                    <View
                      style={[
                        styles.frequenciaBar,
                        { height: Math.max(4, (item.value / maxFrequencia) * 80) },
                      ]}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.frequenciaLabelsRow}>
                {dadosFrequenciaGastos.map((item, i) => (
                  <Text key={i} style={styles.frequenciaLabel} numberOfLines={1}>{item.label}</Text>
                ))}
              </View>
              <TouchableOpacity style={styles.detalhesLink} onPress={() => navigation.navigate('BalancoMensal')}>
                <Text style={styles.detalhesLinkText}>DETALHES</Text>
              </TouchableOpacity>
            </View>
          </React.Fragment>
        );
      case 'transacoesFavoritas':
        return (
          <React.Fragment key={key}>
            <Text style={styles.sectionTitle}>Transações favoritas</Text>
            <View style={styles.card}><Text style={styles.placeholderCardText}>Em breve.</Text></View>
          </React.Fragment>
        );
      case 'objetivos': {
        const emAndamento = (objetivos || []).filter((o) => !o.concluido);
        return (
          <React.Fragment key={key}>
            <Text style={styles.sectionTitle}>Objetivos</Text>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Objetivos')}
              activeOpacity={0.8}
            >
              {emAndamento.length === 0 ? (
                <>
                  <Text style={styles.placeholderCardText}>Definindo objetivos você alcança seus sonhos mais rápido.</Text>
                  <Text style={styles.objetivosSub}>Que tal criar um pra te ajudar?</Text>
                  <Text style={styles.objetivosLink}>VER OBJETIVOS</Text>
                </>
              ) : (
                <>
                  {emAndamento.slice(0, 2).map((obj) => {
                    const totalGuardado = (obj.depositos || []).reduce((s, d) => s + (d.valor || 0), 0);
                    const meta = obj.valorMeta || 1;
                    const pct = Math.min(100, Math.round((totalGuardado / meta) * 100));
                    return (
                      <View key={obj.id} style={styles.objetivoPreviewRow}>
                        <View style={styles.objetivoPreviewInfo}>
                          <Text style={styles.objetivoPreviewNome}>{obj.nome}</Text>
                          <Text style={styles.objetivoPreviewGuardado}>
                            R$ {totalGuardado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} guardados · {pct}%
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                      </View>
                    );
                  })}
                  <Text style={styles.objetivosLink}>VER TODOS OS OBJETIVOS</Text>
                </>
              )}
            </TouchableOpacity>
          </React.Fragment>
        );
      }
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: (spacing.xl * 2) + insets.bottom }]}
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
            <Text style={styles.monthLabel}>{nomeMes} {selectedAno}</Text>
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
              <Text style={styles.monthModalTitle}>Mês e ano</Text>
              <Text style={styles.monthModalLabel}>Ano</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.monthModalAnosRow}
                style={styles.monthModalAnosScroll}
              >
                {ANOS.map((ano) => (
                  <TouchableOpacity
                    key={ano}
                    style={[styles.monthModalAnoPill, selectedAno === ano && styles.monthModalAnoPillSelected]}
                    onPress={() => setSelectedAno(ano)}
                  >
                    <Text style={[styles.monthModalAnoText, selectedAno === ano && styles.monthModalAnoTextSelected]}>{ano}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.monthModalLabel}>Mês</Text>
              <View style={styles.monthGrid}>
                {MESES_SHORT.map((nome, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.monthGridItem,
                      selectedMes === idx && styles.monthGridItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedMes(idx);
                      setMonthModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.monthGridItemText,
                        selectedMes === idx && styles.monthGridItemTextSelected,
                      ]}
                    >
                      {nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.monthModalFechar} onPress={() => setMonthModalVisible(false)}>
                <Text style={styles.monthModalFecharText}>Fechar</Text>
              </TouchableOpacity>
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
  monthModalLabel: {
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  monthModalAnosScroll: { maxHeight: 44, marginBottom: spacing.sm },
  monthModalAnosRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  monthModalAnoPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundCardElevated || 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.full,
  },
  monthModalAnoPillSelected: {
    backgroundColor: colors.primary,
  },
  monthModalAnoText: { fontSize: 15, color: colors.textSecondary },
  monthModalAnoTextSelected: { color: colors.textPrimary, fontWeight: '600' },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  monthGridItem: {
    width: '23%',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundCardElevated || 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.md,
  },
  monthGridItemSelected: {
    backgroundColor: colors.primary + '30',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  monthGridItemText: { fontSize: 14, color: colors.textPrimary },
  monthGridItemTextSelected: { fontWeight: '600', color: colors.primary },
  monthModalFechar: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  monthModalFecharText: { fontSize: 15, fontWeight: '600', color: colors.primary },
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
  finSubline: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  finEconomiaLine: { fontSize: 13, color: colors.positive, marginTop: 2 },
  finHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  finNomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  finRowTouch: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flex: 1,
  },
  finDadosWrap: {
    marginTop: spacing.sm,
    width: '100%',
  },
  finDadoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  finDadoLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  finDadoValor: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  finEconomiaValor: {
    fontSize: 13,
    color: colors.positive,
    fontWeight: '600',
  },
  finItemRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
  },
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
  objetivosSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  objetivosLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    marginTop: spacing.sm,
  },
  objetivoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  objetivoPreviewInfo: { flex: 1 },
  objetivoPreviewNome: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  objetivoPreviewGuardado: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  parcelaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  parcelaRowVencida: {
    backgroundColor: 'rgba(255, 80, 80, 0.12)',
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  parcelaInfo: { flex: 1 },
  parcelaDesc: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  parcelaCartao: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  parcelaVenc: { fontSize: 12, color: colors.warning || '#f0b429', marginTop: 2 },
  parcelaVencVencida: { color: colors.error || '#e57373' },
  parcelaValor: { fontSize: 14, color: colors.textSecondary, marginRight: spacing.sm },
  parcelaPagoBtn: { padding: spacing.xs },
  labelSmall: { fontSize: 12, color: colors.textMuted },
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
  planejamentoScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    paddingRight: spacing.lg * 2,
  },
  planejamentoCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginRight: spacing.md,
  },
  planejamentoCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  planejamentoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  planejamentoCardInfo: { flex: 1 },
  planejamentoCardLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  planejamentoCardRestam: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  planejamentoProgressWrap: { marginTop: spacing.xs },
  planejamentoProgressTrack: {
    height: 8,
    backgroundColor: colors.backgroundCardElevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  planejamentoProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  planejamentoProgressText: { fontSize: 12, color: colors.textMuted },
  balancoCardContent: { marginBottom: spacing.sm },
  balancoBarrasWrap: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: spacing.xl, marginBottom: spacing.md, height: 64 },
  balancoBarCol: { alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  balancoBar: { width: 24, borderRadius: 4 },
  balancoBarReceita: { backgroundColor: colors.positive },
  balancoBarDespesa: { backgroundColor: colors.spending },
  balancoBarLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  balancoValoresWrap: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  balancoValorItem: { minWidth: '30%' },
  balancoValorLabel: { fontSize: 12, color: colors.textMuted },
  balancoValorNum: { fontSize: 16, fontWeight: '700' },
  detalhesLink: { alignSelf: 'flex-end', marginTop: spacing.sm },
  detalhesLinkText: { fontSize: 13, fontWeight: '700', color: colors.secondary, letterSpacing: 0.5 },
  frequenciaFiltrosRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  frequenciaFiltroBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.full, backgroundColor: colors.backgroundCardElevated },
  frequenciaFiltroBtnActive: { backgroundColor: colors.secondary },
  frequenciaFiltroText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  frequenciaFiltroTextActive: { color: colors.textPrimary },
  frequenciaChartWrap: { flexDirection: 'row', alignItems: 'flex-end', height: 88, gap: 2, marginBottom: spacing.xs },
  frequenciaBarWrap: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  frequenciaBar: { width: '100%', maxWidth: 12, borderRadius: 3, backgroundColor: colors.positive + '99' },
  frequenciaLabelsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  frequenciaLabel: { fontSize: 9, color: colors.textMuted, flex: 1, textAlign: 'center' },
  economiaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
