import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Rect, Polyline, Circle as SvgCircle } from 'react-native-svg';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius, categoryChartColors } from '../constants/theme';
import DonutChart from '../components/DonutChart';
import { useApp } from '../context/AppContext';

const MESES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function monthKey(ano, mes) {
  return `${ano}-${mes}`;
}

function getMonthRef(t) {
  return t.tipo === 'despesa_cartao' && t.mesVencimento != null ? t.mesVencimento : t.mes;
}
function getYearRef(t) {
  return t.tipo === 'despesa_cartao' && t.anoVencimento != null ? t.anoVencimento : t.ano;
}

function parseDay(t) {
  const parts = String(t.data || '').split('/');
  const day = parseInt(parts[0], 10);
  return isNaN(day) ? 1 : Math.min(31, Math.max(1, day));
}

function getDateObj(t) {
  const ano = getYearRef(t);
  const mes = getMonthRef(t);
  const day = parseDay(t);
  return new Date(ano, mes, day);
}

function SimpleLineChart({ data, color = colors.primary, showXTicks = false }) {
  const W = Math.min(360, Math.floor(Dimensions.get('window').width - spacing.lg * 2));
  const H = 190;
  const P = 16;
  const max = Math.max(0, ...data.map((d) => d.value));
  const min = 0;
  const range = Math.max(1, max - min);

  const pts = data
    .map((d, i) => {
      const x = P + (i * (W - P * 2)) / Math.max(1, data.length - 1);
      const y = P + ((max - (d.value || 0)) * (H - P * 2)) / range;
      return { x, y };
    });
  const points = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${P},${H - P} ${points} ${W - P},${H - P}`;

  const gridLines = 4;
  const ticks = Array.from({ length: gridLines + 1 }, (_, i) => {
    const y = P + (i * (H - P * 2)) / gridLines;
    const val = Math.round((max - (i * range) / gridLines) / 10) * 10;
    return { y, val: Math.max(0, val) };
  });

  return (
    <Svg width={W} height={H}>
      {/* Grid */}
      {ticks.map((t, i) => (
        <Line
          key={`g-${i}`}
          x1={P}
          y1={t.y}
          x2={W - P}
          y2={t.y}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="1"
        />
      ))}
      <Line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="rgba(255,255,255,0.14)" strokeWidth="1" />

      {/* Area */}
      <Polyline points={areaPoints} fill={color + '33'} stroke="none" />
      {/* Line */}
      <Polyline points={points} fill="none" stroke={color} strokeWidth="3" />
      {/* Dots */}
      {pts.map((p, i) => (
        <SvgCircle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} />
      ))}

      {/* X ticks (opcional, poucos) */}
      {showXTicks && data.length >= 4 && (
        <>
          {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((idx) => (
            <Line
              key={`xt-${idx}`}
              x1={pts[idx].x}
              y1={H - P}
              x2={pts[idx].x}
              y2={H - P + 6}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1"
            />
          ))}
        </>
      )}
    </Svg>
  );
}

function SimpleBarChart({ data, barColor = colors.spending, secondSeries, secondColor = colors.positive }) {
  const W = Math.min(360, Math.floor(Dimensions.get('window').width - spacing.lg * 2));
  const H = 200;
  const P = 16;
  const groupCount = data.length || 1;
  const maxVal = Math.max(1, ...data.map((d) => d.value), ...(secondSeries ? secondSeries.map((d) => d.value) : []));
  const groupWidth = (W - P * 2) / groupCount;
  const barW = secondSeries ? Math.min(18, groupWidth / 3) : Math.min(22, groupWidth / 2.2);

  return (
    <Svg width={W} height={H}>
      <Line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {data.map((d, i) => {
        const x0 = P + i * groupWidth;
        const h = ((d.value || 0) / maxVal) * (H - P * 2);
        const y = H - P - h;
        const x = x0 + (groupWidth - (secondSeries ? barW * 2 + 8 : barW)) / 2;
        return <Rect key={`a-${i}`} x={x} y={y} width={barW} height={h} fill={barColor} rx="4" />;
      })}
      {secondSeries?.map((d, i) => {
        const x0 = P + i * groupWidth;
        const h = ((d.value || 0) / maxVal) * (H - P * 2);
        const y = H - P - h;
        const x = x0 + (groupWidth - (barW * 2 + 8)) / 2 + barW + 8;
        return <Rect key={`b-${i}`} x={x} y={y} width={barW} height={h} fill={secondColor} rx="4" />;
      })}
    </Svg>
  );
}

export default function GraficosScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [mode, setMode] = useState('pie'); // pie | line | bar
  const [barFilter, setBarFilter] = useState('balancoMensal'); // balancoMensal | fluxoAnual | despesaDiaSemana
  const [lineFilter, setLineFilter] = useState('mes'); // semana | mes | ano
  const [mes, setMes] = useState(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());

  const { transacoes, categorias, getValorPartePrincipal } = useApp();

  const transacoesNoMes = useMemo(() => {
    return (transacoes || []).filter((t) => getMonthRef(t) === mes && getYearRef(t) === ano);
  }, [transacoes, mes, ano]);

  const despesasPorCategoria = useMemo(() => {
    const map = {};
    transacoesNoMes.forEach((t) => {
      if (t.tipo !== 'saida' && t.tipo !== 'despesa_cartao') return;
      const catId = t.categoriaId || 'outros';
      map[catId] = (map[catId] || 0) + (getValorPartePrincipal ? getValorPartePrincipal(t) : Math.abs(t.valor || 0));
    });
    const items = Object.keys(map)
      .map((id) => {
        const cat = (categorias || []).find((c) => c.id === id) || { nome: id === 'outros' ? 'Outros' : 'Categoria' };
        return { id, label: cat.nome || 'Outros', value: map[id] };
      })
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
    return items.map((it, idx) => ({ label: it.label, value: it.value, color: categoryChartColors[idx % categoryChartColors.length] }));
  }, [transacoesNoMes, categorias, getValorPartePrincipal]);

  const lineDespesasMes = useMemo(() => {
    // Série diária do mês (somente despesas)
    const daysInMonth = new Date(ano, mes + 1, 0).getDate();
    const byDay = Array.from({ length: daysInMonth }, (_, i) => ({ label: String(i + 1).padStart(2, '0'), value: 0 }));
    transacoesNoMes.forEach((t) => {
      if (t.tipo !== 'saida' && t.tipo !== 'despesa_cartao') return;
      const day = Math.min(daysInMonth, Math.max(1, parseDay(t)));
      const v = getValorPartePrincipal ? getValorPartePrincipal(t) : Math.abs(t.valor || 0);
      byDay[day - 1].value += v;
    });
    return byDay;
  }, [transacoesNoMes, ano, mes, getValorPartePrincipal]);

  const lineDespesasSemana = useMemo(() => {
    // Últimos 7 dias (inclui hoje), somente despesas
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - i);
      days.push({ date: d, label: WEEKDAYS[d.getDay()], value: 0 });
    }
    (transacoes || []).forEach((t) => {
      if (t.tipo !== 'saida' && t.tipo !== 'despesa_cartao') return;
      const dt = getDateObj(t);
      dt.setHours(0, 0, 0, 0);
      const idx = days.findIndex((x) => x.date.getTime() === dt.getTime());
      if (idx >= 0) {
        const v = getValorPartePrincipal ? getValorPartePrincipal(t) : Math.abs(t.valor || 0);
        days[idx].value += v;
      }
    });
    return days.map((d) => ({ label: d.label, value: d.value }));
  }, [transacoes, getValorPartePrincipal]);

  const lineDespesasAno = useMemo(() => {
    // 12 meses do ano selecionado, somente despesas
    const byMonth = MESES_SHORT.map((mLabel, m) => ({ label: mLabel, value: 0 }));
    (transacoes || []).forEach((t) => {
      if (t.tipo !== 'saida' && t.tipo !== 'despesa_cartao') return;
      if (getYearRef(t) !== ano) return;
      const m = getMonthRef(t);
      const v = getValorPartePrincipal ? getValorPartePrincipal(t) : Math.abs(t.valor || 0);
      if (m != null && byMonth[m]) byMonth[m].value += v;
    });
    return byMonth;
  }, [transacoes, ano, getValorPartePrincipal]);

  const barBalancoMensal = useMemo(() => {
    // Últimos 3 meses (inclui mes/ano atual do seletor)
    const months = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(ano, mes - i, 1);
      months.push({ mes: d.getMonth(), ano: d.getFullYear(), label: `${MESES_SHORT[d.getMonth()]}` });
    }
    const receitas = [];
    const despesas = [];
    months.forEach((mItem) => {
      const rs = (transacoes || []).filter((t) => getMonthRef(t) === mItem.mes && getYearRef(t) === mItem.ano && t.tipo === 'entrada')
        .reduce((s, t) => s + (t.valor || 0), 0);
      const ds = (transacoes || []).filter((t) => getMonthRef(t) === mItem.mes && getYearRef(t) === mItem.ano && (t.tipo === 'saida' || t.tipo === 'despesa_cartao'))
        .reduce((s, t) => s + (getValorPartePrincipal ? getValorPartePrincipal(t) : Math.abs(t.valor || 0)), 0);
      receitas.push({ label: mItem.label, value: Math.max(0, rs) });
      despesas.push({ label: mItem.label, value: Math.max(0, ds) });
    });
    return { labels: months.map((m) => m.label), receitas, despesas };
  }, [transacoes, mes, ano, getValorPartePrincipal]);

  const barFluxoAnual = useMemo(() => {
    const labels = MESES_SHORT;
    const receitas = labels.map((_, m) => {
      const total = (transacoes || []).filter((t) => getMonthRef(t) === m && getYearRef(t) === ano && t.tipo === 'entrada')
        .reduce((s, t) => s + (t.valor || 0), 0);
      return { label: labels[m], value: Math.max(0, total) };
    });
    const despesas = labels.map((_, m) => {
      const total = (transacoes || []).filter((t) => getMonthRef(t) === m && getYearRef(t) === ano && (t.tipo === 'saida' || t.tipo === 'despesa_cartao'))
        .reduce((s, t) => s + (getValorPartePrincipal ? getValorPartePrincipal(t) : Math.abs(t.valor || 0)), 0);
      return { label: labels[m], value: Math.max(0, total) };
    });
    return { receitas, despesas };
  }, [transacoes, ano, getValorPartePrincipal]);

  const barDespesaDiaSemana = useMemo(() => {
    const totals = WEEKDAYS.map((w) => ({ label: w, value: 0 }));
    transacoesNoMes.forEach((t) => {
      if (t.tipo !== 'saida' && t.tipo !== 'despesa_cartao') return;
      const d = getDateObj(t);
      const wd = d.getDay(); // 0-6
      const v = getValorPartePrincipal ? getValorPartePrincipal(t) : Math.abs(t.valor || 0);
      totals[wd].value += v;
    });
    return totals;
  }, [transacoesNoMes, getValorPartePrincipal]);

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

  const renderBar = () => {
    const pills = [
      { key: 'balancoMensal', label: 'Balanço mensal' },
      { key: 'fluxoAnual', label: 'Fluxo de caixa anual' },
      { key: 'despesaDiaSemana', label: 'Despesa x dia da semana' },
    ];

    const showDetalhar = barFilter === 'balancoMensal';
    const onDetalhar = () => {
      if (barFilter === 'balancoMensal') navigation.navigate('BalancoMensal');
    };

    let chart = null;
    let footer = null;

    if (barFilter === 'balancoMensal') {
      const total = barBalancoMensal.receitas.reduce((s, d) => s + (d.value || 0), 0)
        + barBalancoMensal.despesas.reduce((s, d) => s + (d.value || 0), 0);
      if (total <= 0) {
        chart = (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyChartTitle}>Sem transações</Text>
            <Text style={styles.emptyChartSub}>Quando você registrar despesas, o gráfico aparecerá aqui.</Text>
          </View>
        );
      } else {
        chart = (
        <>
          <SimpleBarChart data={barBalancoMensal.despesas} barColor={colors.spending} secondSeries={barBalancoMensal.receitas} secondColor={colors.positive} />
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colors.positive }]} />
            <Text style={styles.legendText}>Receitas</Text>
            <View style={[styles.legendDot, { backgroundColor: colors.spending, marginLeft: spacing.md }]} />
            <Text style={styles.legendText}>Despesas</Text>
          </View>
        </>
        );
      }
      footer = (
        <TouchableOpacity style={styles.detalharBtn} onPress={onDetalhar} activeOpacity={0.8}>
          <Text style={styles.detalharText}>Detalhar</Text>
        </TouchableOpacity>
      );
    } else if (barFilter === 'fluxoAnual') {
      const total = barFluxoAnual.receitas.reduce((s, d) => s + (d.value || 0), 0)
        + barFluxoAnual.despesas.reduce((s, d) => s + (d.value || 0), 0);
      if (total <= 0) {
        chart = (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyChartTitle}>Sem transações</Text>
            <Text style={styles.emptyChartSub}>Quando você registrar despesas, o gráfico aparecerá aqui.</Text>
          </View>
        );
      } else {
        chart = (
        <>
          <SimpleBarChart data={barFluxoAnual.despesas} barColor={colors.spending} secondSeries={barFluxoAnual.receitas} secondColor={colors.positive} />
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colors.positive }]} />
            <Text style={styles.legendText}>Receitas</Text>
            <View style={[styles.legendDot, { backgroundColor: colors.spending, marginLeft: spacing.md }]} />
            <Text style={styles.legendText}>Despesas</Text>
          </View>
        </>
        );
      }
    } else {
      const total = barDespesaDiaSemana.reduce((s, d) => s + (d.value || 0), 0);
      chart = total <= 0 ? (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartTitle}>Sem transações</Text>
          <Text style={styles.emptyChartSub}>Quando você registrar despesas, o gráfico aparecerá aqui.</Text>
        </View>
      ) : (
        <SimpleBarChart data={barDespesaDiaSemana} barColor={colors.spending} />
      );
    }

    return (
      <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
          {pills.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.pill, barFilter === p.key && styles.pillActive]}
              onPress={() => setBarFilter(p.key)}
            >
              <Text style={[styles.pillText, barFilter === p.key && styles.pillTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.chartWrap}>{chart}</View>
        {showDetalhar && footer}
      </>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Gráficos</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.8}>
            <Ionicons name="filter" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.modeTabs}>
        <TouchableOpacity style={[styles.modeTab, mode === 'pie' && styles.modeTabActive]} onPress={() => setMode('pie')}>
          <Ionicons name="pie-chart-outline" size={20} color={mode === 'pie' ? colors.background : colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeTab, mode === 'line' && styles.modeTabActive]} onPress={() => setMode('line')}>
          <Ionicons name="pulse-outline" size={20} color={mode === 'line' ? colors.background : colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeTab, mode === 'bar' && styles.modeTabActive]} onPress={() => setMode('bar')}>
          <Ionicons name="stats-chart-outline" size={20} color={mode === 'bar' ? colors.background : colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MESES_SHORT[mes].toUpperCase()} • {ano}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {mode === 'pie' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              <View style={[styles.pill, styles.pillActive]}>
                <Text style={[styles.pillText, styles.pillTextActive]}>Despesas por categoria</Text>
              </View>
            </ScrollView>
            {(() => {
              const total = (despesasPorCategoria || []).reduce((s, d) => s + (d.value || 0), 0);
              if (!despesasPorCategoria || despesasPorCategoria.length === 0 || total <= 0) {
                return (
                  <View style={styles.chartWrap}>
                    <View style={styles.emptyChart}>
                      <Text style={styles.emptyChartTitle}>Sem transações</Text>
                      <Text style={styles.emptyChartSub}>Quando você registrar despesas, o gráfico aparecerá aqui.</Text>
                    </View>
                  </View>
                );
              }
              return <DonutChart data={despesasPorCategoria} />;
            })()}
          </>
        )}

        {mode === 'line' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              <TouchableOpacity
                style={[styles.pill, lineFilter === 'semana' && styles.pillActive]}
                onPress={() => setLineFilter('semana')}
              >
                <Text style={[styles.pillText, lineFilter === 'semana' && styles.pillTextActive]}>Despesas da semana</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, lineFilter === 'mes' && styles.pillActive]}
                onPress={() => setLineFilter('mes')}
              >
                <Text style={[styles.pillText, lineFilter === 'mes' && styles.pillTextActive]}>Despesas do mês</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, lineFilter === 'ano' && styles.pillActive]}
                onPress={() => setLineFilter('ano')}
              >
                <Text style={[styles.pillText, lineFilter === 'ano' && styles.pillTextActive]}>Despesas do ano</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.chartWrap}>
              {(() => {
                const serie = lineFilter === 'semana'
                  ? lineDespesasSemana
                  : lineFilter === 'ano'
                    ? lineDespesasAno
                    : lineDespesasMes;
                const total = serie.reduce((s, d) => s + (d.value || 0), 0);
                if (!serie || serie.length === 0 || total <= 0) {
                  return (
                    <View style={styles.emptyChart}>
                      <Text style={styles.emptyChartTitle}>Sem transações</Text>
                      <Text style={styles.emptyChartSub}>Quando você registrar despesas, o gráfico aparecerá aqui.</Text>
                    </View>
                  );
                }
                return (
                  <>
                    <SimpleLineChart data={serie} color={colors.primary} showXTicks />
                    <Text style={styles.totalText}>
                      Total R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </>
                );
              })()}
            </View>
          </>
        )}

        {mode === 'bar' && renderBar()}
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
    backgroundColor: colors.secondary,
  },
  headerBtn: { padding: spacing.xs },
  headerRight: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' },
  title: { marginLeft: spacing.sm, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  modeTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundCardElevated,
    padding: 6,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  modeTabActive: { backgroundColor: colors.textPrimary },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  navBtn: { padding: spacing.sm },
  monthTitle: { color: colors.textPrimary, fontWeight: '700', marginHorizontal: spacing.md },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 },
  pillsRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  pill: {
    backgroundColor: colors.backgroundCardElevated,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
  },
  pillActive: { backgroundColor: colors.secondary + '55' },
  pillText: { color: colors.textMuted, fontWeight: '700' },
  pillTextActive: { color: colors.textPrimary },
  chartWrap: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  emptyChart: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyChartTitle: { color: colors.textMuted, fontWeight: '800', fontSize: 16, marginBottom: spacing.xs },
  emptyChartSub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 260 },
  totalText: { color: colors.textSecondary, marginTop: spacing.md, fontWeight: '700' },
  detalharBtn: { alignSelf: 'flex-end', marginTop: spacing.md },
  detalharText: { color: colors.secondary, fontWeight: '800' },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { color: colors.textSecondary, fontWeight: '700' },
});

