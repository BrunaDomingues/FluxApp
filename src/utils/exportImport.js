/**
 * Exportação e importação de dados em CSV.
 * Formato: seções [Contas], [Cartões], [Transações], [Objetivos], [Financiamentos], [Orçamento].
 */

const SEP = ';';
const NL = '\r\n';

function escapeCSV(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(SEP) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function buildCSVFromData(data) {
  const lines = [];

  lines.push('[Contas]');
  lines.push(['id', 'nome', 'saldo', 'instituicao', 'descricao', 'tipoConta', 'cor', 'incluirNaSomaTelaInicial', 'arquivada'].join(SEP));
  (data.contas || []).forEach((c) => {
    lines.push([
      escapeCSV(c.id),
      escapeCSV(c.nome),
      escapeCSV(c.saldo),
      escapeCSV(c.instituicao),
      escapeCSV(c.descricao),
      escapeCSV(c.tipoConta),
      escapeCSV(c.cor),
      escapeCSV(c.incluirNaSomaTelaInicial),
      escapeCSV(c.arquivada),
    ].join(SEP));
  });
  lines.push('');

  lines.push('[Cartões]');
  lines.push(['id', 'nome', 'limite', 'bandeira', 'tipo', 'ativo', 'diaFechamento', 'diaVencimento'].join(SEP));
  (data.cartoes || []).forEach((c) => {
    lines.push([
      escapeCSV(c.id),
      escapeCSV(c.nome),
      escapeCSV(c.limite),
      escapeCSV(c.bandeira),
      escapeCSV(c.tipo),
      escapeCSV(c.ativo),
      escapeCSV(c.diaFechamento),
      escapeCSV(c.diaVencimento),
    ].join(SEP));
  });
  lines.push('');

  lines.push('[Transações]');
  lines.push([
    'id', 'tipo', 'data', 'valor', 'descricao', 'categoriaId', 'contaId', 'mes', 'ano',
    'parcelaNumero', 'totalParcelas', 'parcelaGroupId', 'mesVencimento', 'anoVencimento', 'pago',
    'transferenciaId', 'contaDestinoId', 'local',
  ].join(SEP));
  (data.transacoes || []).forEach((t) => {
    lines.push([
      escapeCSV(t.id),
      escapeCSV(t.tipo),
      escapeCSV(t.data),
      escapeCSV(t.valor),
      escapeCSV(t.descricao),
      escapeCSV(t.categoriaId),
      escapeCSV(t.contaId),
      escapeCSV(t.mes),
      escapeCSV(t.ano),
      escapeCSV(t.parcelaNumero),
      escapeCSV(t.totalParcelas),
      escapeCSV(t.parcelaGroupId),
      escapeCSV(t.mesVencimento),
      escapeCSV(t.anoVencimento),
      escapeCSV(t.pago),
      escapeCSV(t.transferenciaId),
      escapeCSV(t.contaDestinoId),
      escapeCSV(t.local),
    ].join(SEP));
  });
  lines.push('');

  lines.push('[Objetivos]');
  lines.push(['id', 'nome', 'valorMeta', 'valorInicial', 'dataLimite', 'concluido', 'pausado', 'icon', 'color', 'depositos'].join(SEP));
  (data.objetivos || []).forEach((o) => {
    const depositosStr = (o.depositos && o.depositos.length) ? JSON.stringify(o.depositos) : '';
    lines.push([
      escapeCSV(o.id),
      escapeCSV(o.nome),
      escapeCSV(o.valorMeta),
      escapeCSV(o.valorInicial),
      escapeCSV(o.dataLimite),
      escapeCSV(o.concluido),
      escapeCSV(o.pausado),
      escapeCSV(o.icon),
      escapeCSV(o.color),
      escapeCSV(depositosStr),
    ].join(SEP));
  });
  lines.push('');

  lines.push('[Financiamentos]');
  lines.push(['id', 'descricao', 'contaId', 'totalParcelas', 'valorPadrao', 'diaVencimento', 'parcelas'].join(SEP));
  (data.financiamentos || []).forEach((f) => {
    const parcelasStr = (f.parcelas && f.parcelas.length) ? JSON.stringify(f.parcelas) : '';
    lines.push([
      escapeCSV(f.id),
      escapeCSV(f.descricao),
      escapeCSV(f.contaId),
      escapeCSV(f.totalParcelas),
      escapeCSV(f.valorPadrao),
      escapeCSV(f.diaVencimento),
      escapeCSV(parcelasStr),
    ].join(SEP));
  });
  lines.push('');

  lines.push('[Orçamento]');
  lines.push(['chave', 'total', 'categorias'].join(SEP));
  const orc = data.orcamentoMensal || {};
  Object.entries(orc).forEach(([chave, v]) => {
    const catStr = v.categorias && Object.keys(v.categorias).length ? JSON.stringify(v.categorias) : '{}';
    lines.push([escapeCSV(chave), escapeCSV(v.total), escapeCSV(catStr)].join(SEP));
  });

  return lines.join(NL);
}

function unescapeCSV(val) {
  if (val == null || val === '') return null;
  const s = String(val).trim();
  if (s === '') return null;
  if (s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1).replace(/""/g, '"');
  }
  return s;
}

function parseCSVLine(line) {
  const row = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let cell = '';
      i += 1;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          cell += '"';
          i += 2;
        } else if (line[i] === '"') {
          i += 1;
          break;
        } else {
          cell += line[i];
          i += 1;
        }
      }
      row.push(unescapeCSV(cell) ?? '');
    } else {
      let end = line.indexOf(SEP, i);
      if (end === -1) end = line.length;
      row.push(unescapeCSV(line.slice(i, end).trim()) ?? '');
      i = end + (line[end] === SEP ? 1 : 0);
    }
  }
  return row;
}

export function parseCSVToData(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const result = {
    contas: [],
    cartoes: [],
    transacoes: [],
    objetivos: [],
    financiamentos: [],
    orcamentoMensal: {},
  };
  let section = null;
  let headers = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('[') && line.endsWith(']')) {
      section = line.slice(1, -1).trim();
      headers = [];
      continue;
    }
    const row = parseCSVLine(line);
    if (row.length === 0) continue;

    if (section === 'Contas' && row[0] !== 'id') {
      result.contas.push({
        id: row[0] || `import_${Date.now()}_${i}`,
        nome: row[1] || '',
        saldo: parseFloat(row[2]) || 0,
        instituicao: row[3] || null,
        descricao: row[4] || '',
        tipoConta: row[5] || 'corrente',
        cor: row[6] || null,
        incluirNaSomaTelaInicial: row[7] !== 'false' && row[7] !== false,
        arquivada: row[8] === 'true' || row[8] === true,
      });
    } else if (section === 'Cartões' && row[0] !== 'id') {
      result.cartoes.push({
        id: row[0] || `import_${Date.now()}_${i}`,
        nome: row[1] || '',
        limite: parseFloat(row[2]) || 0,
        bandeira: row[3] || 'Outro',
        tipo: row[4] === 'debito' ? 'debito' : 'credito',
        ativo: row[5] !== 'false' && row[5] !== false,
        diaFechamento: row[6] ? parseInt(row[6], 10) : null,
        diaVencimento: row[7] ? parseInt(row[7], 10) : null,
      });
    } else if (section === 'Transações' && row[0] !== 'id') {
      result.transacoes.push({
        id: row[0] || `import_${Date.now()}_${i}`,
        tipo: row[1] || 'saida',
        data: row[2] || '',
        valor: parseFloat(row[3]) || 0,
        descricao: row[4] || '',
        categoriaId: row[5] || null,
        contaId: row[6] || null,
        mes: row[7] != null && row[7] !== '' ? parseInt(row[7], 10) : new Date().getMonth(),
        ano: row[8] != null && row[8] !== '' ? parseInt(row[8], 10) : new Date().getFullYear(),
        parcelaNumero: row[9] ? parseInt(row[9], 10) : undefined,
        totalParcelas: row[10] ? parseInt(row[10], 10) : undefined,
        parcelaGroupId: row[11] || undefined,
        mesVencimento: row[12] != null && row[12] !== '' ? parseInt(row[12], 10) : undefined,
        anoVencimento: row[13] != null && row[13] !== '' ? parseInt(row[13], 10) : undefined,
        pago: row[14] === 'true' || row[14] === true,
        transferenciaId: row[15] || undefined,
        contaDestinoId: row[16] || undefined,
        local: row[17] || undefined,
      });
    } else if (section === 'Objetivos' && row[0] !== 'id') {
      let depositos = [];
      try {
        if (row[9]) depositos = JSON.parse(row[9]);
      } catch (_) {}
      result.objetivos.push({
        id: row[0] || `import_${Date.now()}_${i}`,
        nome: row[1] || 'Objetivo',
        valorMeta: parseFloat(row[2]) || 0,
        valorInicial: parseFloat(row[3]) || 0,
        dataLimite: row[4] || null,
        concluido: row[5] === 'true' || row[5] === true,
        pausado: row[6] === 'true' || row[6] === true,
        icon: row[7] || null,
        color: row[8] || null,
        depositos: Array.isArray(depositos) ? depositos : [],
      });
    } else if (section === 'Financiamentos' && row[0] !== 'id') {
      let parcelas = [];
      try {
        if (row[6]) parcelas = JSON.parse(row[6]);
      } catch (_) {}
      result.financiamentos.push({
        id: row[0] || `import_${Date.now()}_${i}`,
        descricao: row[1] || 'Financiamento',
        contaId: row[2] || null,
        totalParcelas: parseInt(row[3], 10) || 1,
        valorPadrao: parseFloat(row[4]) || 0,
        diaVencimento: parseInt(row[5], 10) || 1,
        parcelas: Array.isArray(parcelas) ? parcelas : [],
      });
    } else if (section === 'Orçamento' && row[0] !== 'chave') {
      let categorias = {};
      try {
        if (row[2]) categorias = JSON.parse(row[2]);
      } catch (_) {}
      result.orcamentoMensal[row[0]] = {
        total: parseFloat(row[1]) || 0,
        categorias: categorias && typeof categorias === 'object' ? categorias : {},
      };
    }
  }
  return result;
}

/** Pacote para compartilhar cobrança com outro usuário que tem o app. */
export const COBRANCA_PAYLOAD_TYPE = 'fluxapp_cobranca';
export const COBRANCA_PAYLOAD_VERSION = 1;

/**
 * Monta o objeto de cobrança para exportar (compartilhar).
 * @param {{ fromUser: { id: string, nome: string }, toUser: { id: string, nome: string }, despesas: Array<{ transacao: object, valorParte: number, porcentagem: number }>, recebimentos: Array<{ valor: number, data: string, ... }>, totalAReceber: number }} data
 */
export function buildCobrancaPayload(data) {
  const fromUser = data.fromUser || { id: '', nome: '' };
  const toUser = data.toUser || { id: '', nome: '' };
  const payload = {
    type: COBRANCA_PAYLOAD_TYPE,
    version: COBRANCA_PAYLOAD_VERSION,
    fromUser: { ...fromUser, cpf: fromUser.cpf != null ? String(fromUser.cpf).replace(/\D/g, '').slice(0, 11) : undefined },
    toUser: { ...toUser, cpf: toUser.cpf != null ? String(toUser.cpf).replace(/\D/g, '').slice(0, 11) : undefined },
    despesas: (data.despesas || []).map((d) => ({
      transacao: d.transacao,
      valorParte: d.valorParte,
      porcentagem: d.porcentagem,
    })),
    recebimentos: data.recebimentos || [],
    totalAReceber: data.totalAReceber ?? 0,
    generatedAt: new Date().toISOString(),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Valida e parseia um JSON de cobrança recebida.
 * @returns { { fromUser: { id: string, nome: string }, toUser: { id: string, nome: string }, despesas: Array, recebimentos: Array, totalAReceber: number, generatedAt: string } | null }
 */
export function parseCobrancaPayload(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (data.type !== COBRANCA_PAYLOAD_TYPE || !data.fromUser || !data.fromUser.nome) return null;
    return {
      fromUser: data.fromUser,
      toUser: data.toUser || { id: '', nome: '' },
      despesas: Array.isArray(data.despesas) ? data.despesas : [],
      recebimentos: Array.isArray(data.recebimentos) ? data.recebimentos : [],
      totalAReceber: typeof data.totalAReceber === 'number' ? data.totalAReceber : 0,
      generatedAt: data.generatedAt || new Date().toISOString(),
    };
  } catch (_) {
    return null;
  }
}

/** Backup completo para sincronizar por Bluetooth ou restaurar em outro aparelho. */
export const BACKUP_PAYLOAD_TYPE = 'fluxapp_backup';
export const BACKUP_PAYLOAD_VERSION = 1;

export function buildBackupPayload(data) {
  const payload = {
    type: BACKUP_PAYLOAD_TYPE,
    version: BACKUP_PAYLOAD_VERSION,
    ...buildAppDataPayload(data),
    generatedAt: new Date().toISOString(),
  };
  return JSON.stringify(payload, null, 0);
}

export function parseBackupPayload(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (data.type !== BACKUP_PAYLOAD_TYPE) return null;
    return parseAppDataFromObject(data);
  } catch (_) {
    return null;
  }
}

/** Monta o objeto completo dos dados do app para salvar no Supabase (user_data.data). */
export function buildAppDataPayload(data) {
  return {
    contas: data.contas || [],
    cartoes: data.cartoes || [],
    transacoes: data.transacoes || [],
    objetivos: data.objetivos || [],
    financiamentos: data.financiamentos || [],
    orcamentoMensal: data.orcamentoMensal || {},
    recebimentosUsuarios: data.recebimentosUsuarios || [],
    usuarios: data.usuarios || [],
    cobrancasRecebidas: data.cobrancasRecebidas || [],
    perfil: data.perfil || null,
    categorias: data.categorias || null,
    cardsTelaInicial: data.cardsTelaInicial || null,
  };
}

/** Parseia um objeto (do backup ou do Supabase) para o formato usado pelo AppContext. */
export function parseAppDataFromObject(data) {
  if (!data || typeof data !== 'object') return null;
  return {
    contas: Array.isArray(data.contas) ? data.contas : [],
    cartoes: Array.isArray(data.cartoes) ? data.cartoes : [],
    transacoes: Array.isArray(data.transacoes) ? data.transacoes : [],
    objetivos: Array.isArray(data.objetivos) ? data.objetivos : [],
    financiamentos: Array.isArray(data.financiamentos) ? data.financiamentos : [],
    orcamentoMensal: data.orcamentoMensal && typeof data.orcamentoMensal === 'object' ? data.orcamentoMensal : {},
    recebimentosUsuarios: Array.isArray(data.recebimentosUsuarios) ? data.recebimentosUsuarios : [],
    usuarios: Array.isArray(data.usuarios) ? data.usuarios : [],
    cobrancasRecebidas: Array.isArray(data.cobrancasRecebidas) ? data.cobrancasRecebidas : [],
    perfil: data.perfil && typeof data.perfil === 'object' ? data.perfil : null,
    categorias: Array.isArray(data.categorias) ? data.categorias : null,
    cardsTelaInicial: data.cardsTelaInicial && typeof data.cardsTelaInicial === 'object' ? data.cardsTelaInicial : null,
  };
}
