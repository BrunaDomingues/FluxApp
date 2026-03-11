import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius, categoryChartColors } from '../constants/theme';
import DonutChart from '../components/DonutChart';
import { useApp } from '../context/AppContext';
import { maskDateInput } from '../utils/dateMask';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const iconPorCategoria = { Alimentação: 'restaurant-outline', Moradia: 'home-outline', Transporte: 'car-outline', Lazer: 'happy-outline', Casa: 'home-outline', Saúde: 'medkit-outline', Educação: 'school-outline' };
function getCatIcon(cat) {
  if (cat && cat.icon) return cat.icon;
  return iconPorCategoria[cat?.nome] || 'pricetag-outline';
}

function getTransactionDate(t) {
  const parts = (t.data || '').split('/');
  const day = Math.min(31, Math.max(1, parseInt(parts[0], 10) || 1));
  const mesRef = t.tipo === 'despesa_cartao' && t.mesVencimento != null ? t.mesVencimento : t.mes;
  const anoRef = t.tipo === 'despesa_cartao' && t.anoVencimento != null ? t.anoVencimento : t.ano;
  return new Date(anoRef, mesRef, day);
}

function parseDateStr(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split('/');
  if (parts.length < 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return null;
  return d;
}

function formatDateInput(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

export default function BalancoMensalScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());
  const [tab, setTab] = useState('categoria'); // 'categoria' | 'conta'
  const [dataDe, setDataDe] = useState(null);
  const [dataPara, setDataPara] = useState(null);
  const [dataDeStr, setDataDeStr] = useState('');
  const [dataParaStr, setDataParaStr] = useState('');
  const [situacao, setSituacao] = useState('todos'); // 'todos' | 'efetuadas' | 'pendentes'
  const [contaId, setContaId] = useState(null); // null = todos
  const [graficoTipo, setGraficoTipo] = useState(null); // null | 'despesas' | 'receitas'
  const [modalFiltroVisible, setModalFiltroVisible] = useState(false);
  const [modalGraficoVisible, setModalGraficoVisible] = useState(false);
  const [menuGraficoPosition, setMenuGraficoPosition] = useState({ top: 0, right: 0 });
  const menuGraficoButtonRef = useRef(null);

  const { contas, transacoes, categorias, getValorPartePrincipal } = useApp();
  const contasVisiveis = contas.filter((c) => !c.arquivada);

  const transacoesNoMes = useMemo(() => {
    return transacoes.filter((t) => {
      const mesRef = t.tipo === 'despesa_cartao' && t.mesVencimento != null ? t.mesVencimento : t.mes;
      const anoRef = t.tipo === 'despesa_cartao' && t.anoVencimento != null ? t.anoVencimento : t.ano;
      return mesRef === mes && anoRef === ano;
    });
  }, [transacoes, mes, ano]);

  const transacoesFiltradas = useMemo(() => {
    return transacoesNoMes.filter((t) => {
      const dt = getTransactionDate(t);
      if (dataDe && dt < dataDe) return false;
      if (dataPara) {
        const fim = new Date(dataPara);
        fim.setHours(23, 59, 59, 999);
        if (dt > fim) return false;
      }
      if (situacao === 'efetuadas') {
        if (t.tipo === 'despesa_cartao' && t.pago !== true) return false;
      }
      if (situacao === 'pendentes') {
        if (t.tipo !== 'despesa_cartao') return false;
        if (t.pago === true) return false;
      }
      if (contaId != null && t.contaId !== contaId) return false;
      return true;
    });
  }, [transacoesNoMes, dataDe, dataPara, situacao, contaId]);

  const receitasTotal = useMemo(
    () => transacoesFiltradas.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + (t.valor || 0), 0),
    [transacoesFiltradas]
  );
  const gastoPorCat = useMemo(() => {
    const map = {};
    transacoesFiltradas.forEach((t) => {
      if (t.tipo !== 'saida' && t.tipo !== 'despesa_cartao') return;
      const id = t.categoriaId || 'outros';
      map[id] = (map[id] || 0) + getValorPartePrincipal(t);
    });
    return map;
  }, [transacoesFiltradas, getValorPartePrincipal]);
  const despesasTotal = Object.values(gastoPorCat).reduce((s, v) => s + v, 0);
  const balancoTotal = receitasTotal - despesasTotal;

  const receitasPorCategoria = useMemo(() => {
    const map = {};
    transacoesFiltradas
      .filter((t) => t.tipo === 'entrada')
      .forEach((t) => {
        const id = t.categoriaId || 'outros';
        map[id] = (map[id] || 0) + (t.valor || 0);
      });
    return map;
  }, [transacoesFiltradas]);

  const porCategoria = useMemo(() => {
    const ids = new Set([...Object.keys(gastoPorCat), ...Object.keys(receitasPorCategoria)]);
    return Array.from(ids)
      .map((id) => {
        const cat = categorias.find((c) => c.id === id);
        const receita = receitasPorCategoria[id] || 0;
        const despesa = gastoPorCat[id] || 0;
        const saldo = receita - despesa;
        return { id, cat, receita, despesa, saldo };
      })
      .filter((x) => x.receita !== 0 || x.despesa !== 0)
      .sort((a, b) => b.receita - b.despesa - (a.receita - a.despesa));
  }, [gastoPorCat, receitasPorCategoria, categorias]);

  const porConta = useMemo(() => {
    return contasVisiveis
      .map((conta) => {
        let receita = 0;
        let despesa = 0;
        transacoesFiltradas.forEach((t) => {
          if (t.contaId !== conta.id) return;
          if (t.tipo === 'entrada') receita += t.valor || 0;
          if (t.tipo === 'saida' || t.tipo === 'despesa_cartao') despesa += getValorPartePrincipal(t);
        });
        return { conta, receita, despesa, saldo: receita - despesa };
      })
      .filter((x) => x.receita !== 0 || x.despesa !== 0);
  }, [contasVisiveis, transacoesFiltradas, getValorPartePrincipal]);

  const dadosGraficoDespesas = useMemo(() => {
    return Object.entries(gastoPorCat)
      .filter(([, v]) => v > 0)
      .map(([id, value]) => {
        const cat = categorias.find((c) => c.id === id);
        return {
          label: cat?.nome || 'Outros',
          value,
          color: categoryChartColors[Object.keys(gastoPorCat).indexOf(id) % categoryChartColors.length],
        };
      });
  }, [gastoPorCat, categorias]);

  const dadosGraficoReceitas = useMemo(() => {
    return Object.entries(receitasPorCategoria)
      .filter(([, v]) => v > 0)
      .map(([id, value]) => {
        const cat = categorias.find((c) => c.id === id);
        return {
          label: cat?.nome || 'Outros',
          value,
          color: categoryChartColors[Object.keys(receitasPorCategoria).indexOf(id) % categoryChartColors.length],
        };
      });
  }, [receitasPorCategoria, categorias]);

  const aplicarFiltroData = () => {
    const de = parseDateStr(dataDeStr);
    const para = parseDateStr(dataParaStr);
    setDataDe(de || null);
    setDataPara(para || null);
    setModalFiltroVisible(false);
  };

  const abrirModalFiltro = () => {
    setDataDeStr(dataDe ? formatDateInput(dataDe) : '');
    setDataParaStr(dataPara ? formatDateInput(dataPara) : '');
    setModalFiltroVisible(true);
  };

  const abrirMenuGrafico = () => {
    menuGraficoButtonRef.current?.measureInWindow((x, y, w, h) => {
      const windowWidth = Dimensions.get('window').width;
      setMenuGraficoPosition({
        top: y + h + 4,
        right: windowWidth - (x + w),
      });
      setModalGraficoVisible(true);
    });
  };

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
        <TouchableOpacity onPress={abrirModalFiltro} style={styles.headerIconBtn}>
          <Ionicons name="filter" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View ref={menuGraficoButtonRef} collapsable={false}>
          <TouchableOpacity onPress={abrirMenuGrafico} style={styles.headerIconBtn}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
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

        {graficoTipo === 'despesas' && (
          <View style={styles.graficoSection}>
            <Text style={styles.graficoSectionTitle}>Gráfico Despesas</Text>
            <DonutChart data={dadosGraficoDespesas} />
          </View>
        )}
        {graficoTipo === 'receitas' && (
          <View style={styles.graficoSection}>
            <Text style={styles.graficoSectionTitle}>Gráfico Receitas</Text>
            <DonutChart data={dadosGraficoReceitas} />
          </View>
        )}

        {!graficoTipo && tab === 'categoria' && (
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

        {!graficoTipo && tab === 'conta' && (
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

      <Modal visible={modalFiltroVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalFiltroVisible(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Filtrar</Text>
            <Text style={styles.modalLabel}>De</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="dd/mm/aaaa"
              placeholderTextColor={colors.textMuted}
              value={dataDeStr}
              onChangeText={(t) => setDataDeStr(maskDateInput(t))}
              keyboardType="number-pad"
            />
            <Text style={[styles.modalLabel, { marginTop: spacing.sm }]}>Para</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="dd/mm/aaaa"
              placeholderTextColor={colors.textMuted}
              value={dataParaStr}
              onChangeText={(t) => setDataParaStr(maskDateInput(t))}
              keyboardType="number-pad"
            />
            <Text style={[styles.modalLabel, { marginTop: spacing.md }]}>Situação</Text>
            <View style={styles.radioRow}>
              <TouchableOpacity style={styles.radioOption} onPress={() => setSituacao('todos')}>
                <View style={[styles.radioCircle, situacao === 'todos' && styles.radioCircleChecked]} />
                <Text style={styles.radioLabel}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.radioOption} onPress={() => setSituacao('efetuadas')}>
                <View style={[styles.radioCircle, situacao === 'efetuadas' && styles.radioCircleChecked]} />
                <Text style={styles.radioLabel}>Efetuadas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.radioOption} onPress={() => setSituacao('pendentes')}>
                <View style={[styles.radioCircle, situacao === 'pendentes' && styles.radioCircleChecked]} />
                <Text style={styles.radioLabel}>Pendentes</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalLabel, { marginTop: spacing.md }]}>Contas</Text>
            <View style={styles.radioRow}>
              <TouchableOpacity style={styles.radioOption} onPress={() => setContaId(null)}>
                <View style={[styles.radioCircle, contaId === null && styles.radioCircleChecked]} />
                <Text style={styles.radioLabel}>Todos</Text>
              </TouchableOpacity>
              {contasVisiveis.map((c) => (
                <TouchableOpacity key={c.id} style={styles.radioOption} onPress={() => setContaId(c.id)}>
                  <View style={[styles.radioCircle, contaId === c.id && styles.radioCircleChecked]} />
                  <Text style={styles.radioLabel}>{c.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalFiltroVisible(false)}>
                <Text style={styles.modalBtnCancelText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnApply} onPress={aplicarFiltroData}>
                <Text style={styles.modalBtnApplyText}>FILTRAR</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={modalGraficoVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalGraficoVisible(false)}>
          <View style={[styles.menuGraficoBox, { top: menuGraficoPosition.top, right: menuGraficoPosition.right }]}>
            <TouchableOpacity
              style={styles.menuGraficoItem}
              onPress={() => { setGraficoTipo('despesas'); setModalGraficoVisible(false); }}
            >
              <Text style={styles.menuGraficoText}>Gráfico Despesas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuGraficoItem}
              onPress={() => { setGraficoTipo('receitas'); setModalGraficoVisible(false); }}
            >
              <Text style={styles.menuGraficoText}>Gráfico Receitas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuGraficoItem}
              onPress={() => { setGraficoTipo(null); setModalGraficoVisible(false); }}
            >
              <Text style={styles.menuGraficoText}>Lista</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
  headerIconBtn: { padding: spacing.xs, marginLeft: spacing.xs },
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
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.secondary + '40' },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
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
  graficoSection: { marginBottom: spacing.lg },
  graficoSectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  modalBox: { backgroundColor: colors.backgroundCard, borderRadius: borderRadius.lg, padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg },
  modalLabel: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.lg, marginTop: spacing.xl },
  modalBtnCancel: { padding: spacing.sm },
  modalBtnCancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  modalBtnApply: { padding: spacing.sm },
  modalBtnApplyText: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  radioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  radioOption: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.md, marginTop: spacing.xs },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    marginRight: spacing.xs,
  },
  radioCircleChecked: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  radioLabel: { fontSize: 14, color: colors.textPrimary },
  menuGraficoBox: {
    position: 'absolute',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  menuGraficoItem: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  menuGraficoText: { fontSize: 15, color: colors.textPrimary },
});
