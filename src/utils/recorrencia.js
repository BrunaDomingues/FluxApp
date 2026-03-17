import { parseDateDDMM } from './dateMask';

function formatDDMMYYYY(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d, n) {
  const x = new Date(d);
  const day = x.getDate();
  x.setDate(1);
  x.setMonth(x.getMonth() + n);
  const lastDay = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(day, lastDay));
  return x;
}

function addYears(d, n) {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() + n);
  return x;
}

/**
 * Gera ocorrências futuras (inclui a base como a ocorrência 1).
 * @param {object} baseTx payload base (sem id)
 * @param {{ frequency: 'daily'|'weekly'|'monthly'|'yearly'|'custom', interval: number, count: number, startDate?: string(dd/mm/yyyy) }} rule
 * @param {{ seriesId?: string }} opts
 */
export function generateOccurrences(baseTx, rule, opts = {}) {
  const count = Math.max(1, parseInt(rule?.count, 10) || 1);
  const interval = Math.max(1, parseInt(rule?.interval, 10) || 1);
  const frequency = rule?.frequency || 'monthly';
  const seriesId = opts.seriesId || (Date.now().toString() + '_' + Math.random().toString(36).slice(2));

  const parsedStart = rule?.startDate ? parseDateDDMM(String(rule.startDate).trim()) : null;
  const start = parsedStart ? new Date(parsedStart.year, parsedStart.month, parsedStart.day) : null;
  const baseDate = start || (() => {
    const p = baseTx?.data ? parseDateDDMM(String(baseTx.data).trim()) : null;
    if (p) return new Date(p.year, p.month, p.day);
    return new Date();
  })();
  baseDate.setHours(0, 0, 0, 0);

  const out = [];
  for (let i = 0; i < count; i++) {
    let d = baseDate;
    const step = i * interval;
    if (frequency === 'daily' || frequency === 'custom') d = addDays(baseDate, step);
    else if (frequency === 'weekly') d = addDays(baseDate, step * 7);
    else if (frequency === 'yearly') d = addYears(baseDate, step);
    else d = addMonths(baseDate, step); // monthly default

    const data = formatDDMMYYYY(d);
    out.push({
      ...baseTx,
      data,
      mes: d.getMonth(),
      ano: d.getFullYear(),
      pago: i === 0 ? (baseTx?.pago ?? true) : false,
      vencimento: data,
      recorrencia: {
        seriesId,
        enabled: true,
        frequency,
        interval,
        count,
        startDate: formatDDMMYYYY(baseDate),
        index: i + 1,
      },
    });
  }
  return { seriesId, items: out };
}

