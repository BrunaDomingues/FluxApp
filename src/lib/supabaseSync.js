import { supabase } from './supabase';
import { buildAppDataPayload, parseAppDataFromObject } from '../utils/exportImport';

/**
 * Carrega os dados do app do Supabase para o usuário logado.
 * @param {string} userId - auth.users.id
 * @returns {Promise<object | null>} Objeto com contas, cartoes, transacoes, etc. ou null
 */
export async function loadUserData(userId) {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data || !data.data) return null;
    return parseAppDataFromObject(data.data);
  } catch (_) {
    return null;
  }
}

/**
 * Mescla dados locais no que está no banco: banco é fonte da verdade.
 * Só insere itens que faltam no banco; não sobrescreve nem remove do banco.
 * @param {object} serverData - Dados atuais do Supabase (parseAppDataFromObject)
 * @param {object} localData - Dados atuais do app (contas, transacoes, etc.)
 * @returns {object} Objeto mesclado para salvar no banco
 */
function mergeServerWithLocal(serverData, localData) {
  if (!serverData || !localData) return localData || serverData || {};

  const mergeArray = (serverArr, localArr, idKey = 'id') => {
    const server = Array.isArray(serverArr) ? serverArr : [];
    const local = Array.isArray(localArr) ? localArr : [];
    const serverIds = new Set(server.map((x) => String(x[idKey] ?? '')));
    const localOnly = local.filter((x) => !serverIds.has(String(x[idKey] ?? '')));
    return [...server, ...localOnly];
  };

  const mergeObject = (serverObj, localObj) => {
    if (!serverObj || typeof serverObj !== 'object') return localObj && typeof localObj === 'object' ? localObj : {};
    const out = { ...serverObj };
    if (localObj && typeof localObj === 'object') {
      for (const k of Object.keys(localObj)) {
        if (out[k] === undefined || out[k] === null) out[k] = localObj[k];
      }
    }
    return out;
  };

  const mergeCardsTelaInicial = (serverC, localC) => {
    const s = serverC && typeof serverC === 'object' ? serverC : {};
    const l = localC && typeof localC === 'object' ? localC : {};
    return {
      enabled: mergeObject(s.enabled, l.enabled),
      order: Array.isArray(s.order) && s.order.length > 0 ? s.order : (Array.isArray(l.order) ? l.order : []),
    };
  };

  return {
    contas: mergeArray(serverData.contas, localData.contas),
    cartoes: mergeArray(serverData.cartoes, localData.cartoes),
    transacoes: mergeArray(serverData.transacoes, localData.transacoes),
    objetivos: mergeArray(serverData.objetivos, localData.objetivos),
    financiamentos: mergeArray(serverData.financiamentos, localData.financiamentos),
    orcamentoMensal: mergeObject(serverData.orcamentoMensal, localData.orcamentoMensal),
    recebimentosUsuarios: mergeArray(serverData.recebimentosUsuarios, localData.recebimentosUsuarios),
    usuarios: mergeArray(serverData.usuarios, localData.usuarios),
    cobrancasRecebidas: mergeArray(serverData.cobrancasRecebidas, localData.cobrancasRecebidas),
    perfil: mergeObject(serverData.perfil, localData.perfil),
    categorias: Array.isArray(serverData.categorias) && serverData.categorias.length > 0
      ? serverData.categorias
      : (Array.isArray(localData.categorias) ? localData.categorias : []),
    cardsTelaInicial: mergeCardsTelaInicial(serverData.cardsTelaInicial, localData.cardsTelaInicial),
  };
}

/**
 * Salva os dados do app no Supabase para o usuário logado.
 * Por padrão faz merge: banco não é sobrescrito; só são inseridos dados que faltam no banco.
 * Use { overwrite: true } apenas em "zerar dados" para limpar o banco.
 * @param {string} userId - auth.users.id
 * @param {object} appData - Objeto com contas, cartoes, transacoes, etc.
 * @param {{ overwrite?: boolean }} options - overwrite: true para substituir tudo (zerar dados)
 * @returns {Promise<{ error: Error | null }>}
 */
export async function saveUserData(userId, appData, options = {}) {
  if (!userId || !appData) return { error: null };
  try {
    let toSave = buildAppDataPayload(appData);
    if (!options.overwrite) {
      const serverData = await loadUserData(userId);
      toSave = buildAppDataPayload(mergeServerWithLocal(serverData || {}, appData));
    }
    const { error } = await supabase
      .from('user_data')
      .upsert(
        { user_id: userId, data: toSave, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    return { error: error || null };
  } catch (e) {
    return { error: e };
  }
}
