import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Rect, Polyline, Circle as SvgCircle, Path, Text as SvgText } from 'react-native-svg';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius, categoryChartColors } from '../constants/theme';
import DonutChart from '../components/DonutChart';
import { useApp } from '../context/AppContext';
import { maskDateInput, parseDateDDMM } from '../utils/dateMask';
import DateTimePicker from '@react-native-community/datetimepicker';

const MESES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function monthKey(ano, mes) {
  return `${ano}-${mes}`;
}

function startOfWeekMonday(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Dom..6=Sáb
  const diff = day === 0 ? -6 : 1 - day; // segunda-feira como início
  x.setDate(x.getDate() + diff);
  return x;
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

function SimpleLineChart({ data, color = colors.primary, showXTicks = false, averageValue, showAverage = false }) {
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

  const buildSmoothPath = (pointsArr) => {
    if (!pointsArr || pointsArr.length === 0) return '';
    if (pointsArr.length === 1) return `M ${pointsArr[0].x} ${pointsArr[0].y}`;
    let d = `M ${pointsArr[0].x} ${pointsArr[0].y}`;
    for (let i = 0; i < pointsArr.length - 1; i++) {
      const p0 = pointsArr[i - 1] || pointsArr[i];
      const p1 = pointsArr[i];
      const p2 = pointsArr[i + 1];
      const p3 = pointsArr[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const linePath = buildSmoothPath(pts);
  const areaPath = `${linePath} L ${W - P} ${H - P} L ${P} ${H - P} Z`;

  const gridLines = 4;
  const ticks = Array.from({ length: gridLines + 1 }, (_, i) => {
    const y = P + (i * (H - P * 2)) / gridLines;
    const val = Math.round((max - (i * range) / gridLines) / 10) * 10;
    return { y, val: Math.max(0, val) };
  });

  const avg = typeof averageValue === 'number' && isFinite(averageValue) ? averageValue : null;
  const avgY = avg == null ? null : (P + ((max - avg) * (H - P * 2)) / range);
  const avgRounded = avg == null ? null : Math.round(avg * 100) / 100;
  const avgLabel = avgRounded == null ? '' : `R$ ${avgRounded.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

      {/* Area (suave) */}
      <Path d={areaPath} fill={color + '33'} stroke="none" />
      {/* Line (suave) */}
      <Path d={linePath} fill="none" stroke={color} strokeWidth="3" />
      {/* Dots */}
      {pts.map((p, i) => (
        <SvgCircle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} />
      ))}

      {/* Average line (dashed) */}
      {showAverage && avgY != null && (
        <>
          <Line
            x1={P}
            y1={avgY}
            x2={W - P}
            y2={avgY}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          {/* Label da média (direita) */}
          <Rect
            x={W - P - 96}
            y={Math.max(P, Math.min(H - P - 22, avgY - 11))}
            width={96}
            height={22}
            rx={11}
            fill="rgba(0,0,0,0.35)"
          />
          <SvgText
            x={W - P - 48}
            y={Math.max(P, Math.min(H - P - 22, avgY - 11)) + 15}
            fontSize="11"
            fontWeight="700"
            fill={colors.textPrimary}
            textAnchor="middle"
          >
            {avgLabel}
          </SvgText>
        </>
      )}

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
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(now));
  const [showAvg, setShowAvg] = useState(false);
  const [lineMenuOpen, setLineMenuOpen] = useState(false);
  const [pieType, setPieType] = useState('despesaCategoria'); // despesaCategoria | despesaConta | receitaCategoria | receitaConta | saldoConta | despesaFixaVar | receitaFixaVar
  const [pieSituacao, setPieSituacao] = useState('todos'); // todos | efetuadas | pendentes
  const [pieContaId, setPieContaId] = useState('todos'); // todos | contaId
  const [pieFiltroOpen, setPieFiltroOpen] = useState(false);
  const [pieDataOpen, setPieDataOpen] = useState(false);
  const [dataDeStr, setDataDeStr] = useState('');
  const [dataParaStr, setDataParaStr] = useState('');
  const [dataDe, setDataDe] = useState(null); // Date | null
  const [dataPara, setDataPara] = useState(null); // Date | null
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerField, setPickerField] = useState('de'); // 'de' | 'para'
  const [pickerDate, setPickerDate] = useState(() => new Date());

  const { transacoes, categorias, contas, getValorPartePrincipal } = useApp();

  const transacoesNoMes = useMemo(() => {
    return (transacoes || []).filter((t) => getMonthRef(t) === mes && getYearRef(t) === ano);
  }, [transacoes, mes, ano]);

  const transacoesPieFiltradas = useMemo(() => {
    let list = [...(transacoesNoMes || [])];
    // Situação
    if (pieSituacao === 'efetuadas') {
      list = list.filter((t) => !(t.tipo === 'despesa_cartao' && t.pago !== true));
    } else if (pieSituacao === 'pendentes') {
      list = list.filter((t) => t.tipo === 'despesa_cartao' && t.pago !== true);
    }
    // Conta
    if (pieContaId && pieContaId !== 'todos') {
      list = list.filter((t) => t.contaId === pieContaId);
    }
    // Data (de/para)
    if (dataDe || dataPara) {
      list = list.filter((t) => {
        const dt = getDateObj(t);
        if (dataDe && dt < dataDe) return false;
        if (dataPara) {
          const fim = new Date(dataPara);
          fim.setHours(23, 59, 59, 999);
          if (dt > fim) return false;
        }
        return true;
      });
    }
    return list;
  }, [transacoesNoMes, pieSituacao, pieContaId, dataDe, dataPara]);

  const getCategoriaById = useMemo(() => {
    const map = new Map((categorias || []).map((c) => [c.id, c]));
    return (id) => map.get(id) || null;
  }, [categorias]);

  const contasVisiveis = useMemo(() => (contas || []).filter((c) => !c.arquivada), [contas]);

  const pieOptions = useMemo(() => ([
    { key: 'despesaCategoria', label: 'Despesas por categoria' },
    { key: 'despesaConta', label: 'Despesas por conta' },
    { key: 'receitaCategoria', label: 'Receitas por categoria' },
    { key: 'receitaConta', label: 'Receitas por conta' },
    { key: 'saldoConta', label: 'Saldos por conta' },
    { key: 'despesaFixaVar', label: 'Despesas fixas x variáveis' },
    { key: 'receitaFixaVar', label: 'Receitas fixas x variáveis' },
  ]), []);

  const pieDataset = useMemo(() => {
    const addColor = (items) => items.map((it, idx) => ({ ...it, color: categoryChartColors[idx % categoryChartColors.length] }));
    const sumMapToItems = (map, labelGetter) => {
      const items = Object.keys(map)
        .map((k) => ({ key: k, label: labelGetter(k), value: map[k] }))
        .filter((x) => x.value > 0)
        .sort((a, b) => b.value - a.value);
      return addColor(items);
    };

    const despesas = (transacoesPieFiltradas || []).filter((t) => t.tipo === 'saida' || t.tipo === 'despesa_cartao');
    const receitas = (transacoesPieFiltradas || []).filter((t) => t.tipo === 'entrada');

    if (pieType === 'despesaCategoria') {
      const map = {};
      despesas.forEach((t) => {
        const id = t.categoriaId || 'outros';
        const v = getValorPartePrincipal ? getValorPartePrincipal(t) : Math.abs(t.valor || 0);
        map[id] = (map[id] || 0) + v;
      });
      return sumMapToItems(map, (id) => getCategoriaById(id)?.nome || (id === 'outros' ? 'Outros' : 'Categoria'));
    }

    if (pieType === 'despesaConta') {
      const map = {};
      despesas.forEach((t) => {
        const id = t.contaId || 'sem_conta';
        const v = getValorPartePrincipal ? getValorPartePrincipal(t) : Math.abs(t.valor || 0);
        map[id] = (map[id] || 0) + v;
      });
      return sumMapToItems(map, (id) => contasVisiveis.find((c) => c.id === id)?.nome || (id === 'sem_conta' ? 'Sem conta' : 'Conta'));
    }

    if (pieType === 'receitaCategoria') {
      const map = {};
      receitas.forEach((t) => {
        const id = t.categoriaId || 'outros';
        const v = Math.max(0, t.valor || 0);
        map[id] = (map[id] || 0) + v;
      });
      return sumMapToItems(map, (id) => getCategoriaById(id)?.nome || (id === 'outros' ? 'Outros' : 'Categoria'));
    }

    if (pieType === 'receitaConta') {
      const map = {};
      receitas.forEach((t) => {
        const id = t.contaId || 'sem_conta';
        const v = Math.max(0, t.valor || 0);
        map[id] = (map[id] || 0) + v;
      });
      return sumMapToItems(map, (id) => contasVisiveis.find((c) => c.id === id)?.nome || (id === 'sem_conta' ? 'Sem conta' : 'Conta'));
    }

    if (pieType === 'saldoConta') {
      const items = contasVisiveis
        .map((c) => ({ label: c.nome || 'Conta', value: Math.max(0, Number(c.saldo) || 0) }))
        .filter((x) => x.value > 0)
        .sort((a, b) => b.value - a.value);
      return addColor(items);
    }

    const isFixedExpense = (t) => {
      if (t?.fixa === true) return true;
      const cat = getCategoriaById(t.categoriaId || '')?.nome || '';
      const fixedCats = new Set(['Assinatura', 'Serviços', 'Operação bancária', 'Educação', 'Casa']);
      return fixedCats.has(cat);
    };
    const isFixedIncome = (t) => {
      if (t?.fixa === true) return true;
      const cat = getCategoriaById(t.categoriaId || '')?.nome || '';
      const fixedCats = new Set(['Salário']);
      return fixedCats.has(cat);
    };

    if (pieType === 'despesaFixaVar') {
      let fixas = 0;
      let variaveis = 0;
      despesas.forEach((t) => {
        const v = getValorPartePrincipal ? getValorPartePrincipal(t) : Math.abs(t.valor || 0);
        if (isFixedExpense(t)) fixas += v;
        else variaveis += v;
      });
      return addColor([
        { label: 'Fixas', value: fixas },
        { label: 'Variáveis', value: variaveis },
      ].filter((x) => x.value > 0));
    }

    if (pieType === 'receitaFixaVar') {
      let fixas = 0;
      let variaveis = 0;
      receitas.forEach((t) => {
        const v = Math.max(0, t.valor || 0);
        if (isFixedIncome(t)) fixas += v;
        else variaveis += v;
      });
      return addColor([
        { label: 'Fixas', value: fixas },
        { label: 'Variáveis', value: variaveis },
      ].filter((x) => x.value > 0));
    }

    return [];
  }, [pieType, transacoesPieFiltradas, getValorPartePrincipal, contasVisiveis, getCategoriaById]);

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
    // Semana (segunda-domingo) a partir de weekStart, somente despesas
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, label: WEEKDAYS[d.getDay()], value: 0 };
    });
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
  }, [transacoes, getValorPartePrincipal, weekStart]);

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

  const prevPeriod = () => {
    if (mode === 'line') {
      if (lineFilter === 'semana') {
        setWeekStart((d) => {
          const x = new Date(d);
          x.setDate(x.getDate() - 7);
          return x;
        });
        return;
      }
      if (lineFilter === 'ano') {
        setAno((a) => a - 1);
        return;
      }
    }
    prevMonth();
  };

  const nextPeriod = () => {
    if (mode === 'line') {
      if (lineFilter === 'semana') {
        setWeekStart((d) => {
          const x = new Date(d);
          x.setDate(x.getDate() + 7);
          return x;
        });
        return;
      }
      if (lineFilter === 'ano') {
        setAno((a) => a + 1);
        return;
      }
    }
    nextMonth();
  };

  const periodLabel = useMemo(() => {
    if (mode !== 'line') return `${MESES_SHORT[mes].toUpperCase()} • ${ano}`;
    if (lineFilter === 'ano') return `${ano}`;
    if (lineFilter === 'semana') {
      const start = new Date(weekStart);
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      const fmt = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase();
      return `${fmt(start)} - ${fmt(end)}`;
    }
    return `${MESES_SHORT[mes].toUpperCase()} • ${ano}`;
  }, [mode, lineFilter, weekStart, mes, ano]);

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
          {mode === 'pie' && (
            <>
              <TouchableOpacity style={styles.headerBtn} activeOpacity={0.8} onPress={() => setPieFiltroOpen(true)}>
                <Ionicons name="funnel-outline" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerBtn} activeOpacity={0.8} onPress={() => setPieDataOpen(true)}>
                <Ionicons name="calendar-outline" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </>
          )}
          {mode === 'line' && (
            <TouchableOpacity style={styles.headerBtn} activeOpacity={0.8} onPress={() => setLineMenuOpen(true)}>
              <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
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
        <TouchableOpacity onPress={prevPeriod} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{periodLabel}</Text>
        <TouchableOpacity onPress={nextPeriod} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {mode === 'pie' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {pieOptions.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.pill, pieType === p.key && styles.pillActive]}
                  onPress={() => setPieType(p.key)}
                >
                  <Text style={[styles.pillText, pieType === p.key && styles.pillTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {(() => {
              const total = (pieDataset || []).reduce((s, d) => s + (d.value || 0), 0);
              if (!pieDataset || pieDataset.length === 0 || total <= 0) {
                return (
                  <View style={styles.chartWrap}>
                    <View style={styles.emptyChart}>
                      <Text style={styles.emptyChartTitle}>Sem transações</Text>
                      <Text style={styles.emptyChartSub}>Quando você registrar despesas, o gráfico aparecerá aqui.</Text>
                    </View>
                  </View>
                );
              }
              return (
                <View style={styles.chartWrap}>
                  <DonutChart data={pieDataset} />
                </View>
              );
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
                    <SimpleLineChart
                      data={serie}
                      color={colors.primary}
                      showXTicks
                      showAverage={showAvg}
                      averageValue={serie.reduce((s, d) => s + (d.value || 0), 0) / Math.max(1, serie.length)}
                    />
                    <View style={styles.totalBelowSpacer} />
                    <Text style={styles.totalBelowText}>
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

      {/* Menu (3 pontos) - apenas no gráfico de linhas */}
      <Modal visible={lineMenuOpen} transparent animationType="fade" onRequestClose={() => setLineMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setLineMenuOpen(false)}>
          <Pressable style={styles.menuBox} onPress={(e) => e.stopPropagation()}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowAvg((v) => !v)}
              activeOpacity={0.8}
            >
              <Ionicons name={showAvg ? 'checkbox-outline' : 'square-outline'} size={20} color={colors.textPrimary} />
              <Text style={styles.menuItemText}>Mostrar média</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Filtro (situação e conta) - modo pizza */}
      <Modal visible={pieFiltroOpen} transparent animationType="fade" onRequestClose={() => setPieFiltroOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setPieFiltroOpen(false)}>
          <Pressable style={styles.filterBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.filterTitle}>Filtros</Text>
            <Text style={styles.filterLabel}>Situação</Text>
            <View style={styles.filterPillsRow}>
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'efetuadas', label: 'Efetuadas' },
                { key: 'pendentes', label: 'Pendentes' },
              ].map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.filterPill, pieSituacao === s.key && styles.filterPillActive]}
                  onPress={() => setPieSituacao(s.key)}
                >
                  <Text style={[styles.filterPillText, pieSituacao === s.key && styles.filterPillTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.filterLabel, { marginTop: spacing.md }]}>Contas</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
              <TouchableOpacity
                style={[styles.filterPill, pieContaId === 'todos' && styles.filterPillActive]}
                onPress={() => setPieContaId('todos')}
              >
                <Text style={[styles.filterPillText, pieContaId === 'todos' && styles.filterPillTextActive]}>Todos</Text>
              </TouchableOpacity>
              {contasVisiveis.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.filterPill, pieContaId === c.id && styles.filterPillActive]}
                  onPress={() => setPieContaId(c.id)}
                >
                  <Text style={[styles.filterPillText, pieContaId === c.id && styles.filterPillTextActive]}>{c.nome}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.filterCloseBtn} onPress={() => setPieFiltroOpen(false)} activeOpacity={0.8}>
              <Text style={styles.filterCloseText}>Fechar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Filtro de data (de/para) - modo pizza */}
      <Modal visible={pieDataOpen} transparent animationType="fade" onRequestClose={() => setPieDataOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setPieDataOpen(false)}>
          <Pressable style={styles.filterBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.filterTitle}>Filtrar por data</Text>
            <Text style={styles.filterLabel}>De</Text>
            <TouchableOpacity
              style={styles.datePickerRow}
              activeOpacity={0.8}
              onPress={() => {
                setPickerField('de');
                setPickerDate(dataDe ?? new Date());
                setPickerOpen(true);
              }}
            >
              <Text style={styles.datePickerText}>{dataDeStr || 'Selecionar data'}</Text>
              <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={[styles.filterLabel, { marginTop: spacing.sm }]}>Para</Text>
            <TouchableOpacity
              style={styles.datePickerRow}
              activeOpacity={0.8}
              onPress={() => {
                setPickerField('para');
                setPickerDate(dataPara ?? new Date());
                setPickerOpen(true);
              }}
            >
              <Text style={styles.datePickerText}>{dataParaStr || 'Selecionar data'}</Text>
              <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.dateActions}>
              <TouchableOpacity
                style={styles.dateClearBtn}
                onPress={() => {
                  setDataDeStr('');
                  setDataParaStr('');
                  setDataDe(null);
                  setDataPara(null);
                  setPieDataOpen(false);
                }}
              >
                <Text style={styles.dateClearText}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateApplyBtn}
                onPress={() => {
                  setPieDataOpen(false);
                }}
              >
                <Text style={styles.dateApplyText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* DatePicker nativo */}
      {pickerOpen && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="calendar"
          onChange={(_, selected) => {
            // Android: quando cancela, selected vem undefined
            if (!selected) {
              setPickerOpen(false);
              return;
            }
            const d = new Date(selected);
            d.setHours(0, 0, 0, 0);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = String(d.getFullYear());
            const str = `${dd}/${mm}/${yyyy}`;
            if (pickerField === 'de') {
              setDataDe(d);
              setDataDeStr(str);
            } else {
              setDataPara(d);
              setDataParaStr(str);
            }
            setPickerOpen(false);
          }}
        />
      )}
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
  totalBelowSpacer: { height: spacing.md },
  totalBelowText: { color: colors.textSecondary, fontWeight: '800', fontSize: 16, alignSelf: 'flex-start' },
  detalharBtn: { alignSelf: 'flex-end', marginTop: spacing.md },
  detalharText: { color: colors.secondary, fontWeight: '800' },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { color: colors.textSecondary, fontWeight: '700' },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-start' },
  menuBox: {
    marginTop: 70,
    marginRight: spacing.lg,
    marginLeft: 'auto',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    width: 180,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  menuItemText: { color: colors.textPrimary, fontWeight: '700' },
  filterBox: {
    marginTop: 70,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  filterTitle: { color: colors.textPrimary, fontWeight: '800', fontSize: 16, marginBottom: spacing.md },
  filterLabel: { color: colors.textMuted, fontWeight: '700', marginBottom: spacing.sm },
  filterPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterPill: {
    backgroundColor: colors.backgroundCardElevated,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
  },
  filterPillActive: { backgroundColor: colors.secondary + '55' },
  filterPillText: { color: colors.textMuted, fontWeight: '700' },
  filterPillTextActive: { color: colors.textPrimary },
  filterCloseBtn: { marginTop: spacing.lg, alignSelf: 'flex-end' },
  filterCloseText: { color: colors.secondary, fontWeight: '800' },
  dateInputWrap: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: colors.backgroundCardElevated,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  datePickerRow: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: colors.backgroundCardElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerText: { color: colors.textPrimary, fontWeight: '700' },
  dateActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  dateClearBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  dateClearText: { color: colors.textMuted, fontWeight: '800' },
  dateApplyBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  dateApplyText: { color: colors.secondary, fontWeight: '900' },
});

