import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_CATEGORIAS = '@fluxapp_categorias';
const KEY_CARDS_TELA_INICIAL = '@fluxapp_cards_tela_inicial';
const KEY_FINANCIAMENTOS = '@fluxapp_financiamentos';
const KEY_OBJETIVOS = '@fluxapp_objetivos';
const KEY_CONTAS = '@fluxapp_contas';
const KEY_CARTOES = '@fluxapp_cartoes';
const KEY_TRANSACOES = '@fluxapp_transacoes';
const KEY_ORCAMENTO_MENSAL = '@fluxapp_orcamento_mensal';
const KEY_USUARIOS = '@fluxapp_usuarios';
const KEY_RECEBIMENTOS_USUARIOS = '@fluxapp_recebimentos_usuarios';
const KEY_COBRANCAS_RECEBIDAS = '@fluxapp_cobrancas_recebidas';
const KEY_PERFIL = '@fluxapp_perfil';
const KEY_OWNER = '@fluxapp_owner';

const ALL_KEYS = [
  KEY_CATEGORIAS,
  KEY_CARDS_TELA_INICIAL,
  KEY_FINANCIAMENTOS,
  KEY_OBJETIVOS,
  KEY_CONTAS,
  KEY_CARTOES,
  KEY_TRANSACOES,
  KEY_ORCAMENTO_MENSAL,
  KEY_USUARIOS,
  KEY_RECEBIMENTOS_USUARIOS,
  KEY_COBRANCAS_RECEBIDAS,
  KEY_PERFIL,
  KEY_OWNER,
];

export async function loadCategorias() {
  try {
    const raw = await AsyncStorage.getItem(KEY_CATEGORIAS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('loadCategorias:', e);
  }
  return null;
}

export async function saveCategorias(categorias) {
  try {
    await AsyncStorage.setItem(KEY_CATEGORIAS, JSON.stringify(categorias));
  } catch (e) {
    console.warn('saveCategorias:', e);
  }
}

export async function loadCardsTelaInicial() {
  try {
    const raw = await AsyncStorage.getItem(KEY_CARDS_TELA_INICIAL);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        if (Array.isArray(data.order)) return { enabled: data.enabled || data, order: data.order };
        return { enabled: data, order: null };
      }
    }
  } catch (e) {
    console.warn('loadCardsTelaInicial:', e);
  }
  return null;
}

export async function saveCardsTelaInicial(data) {
  try {
    await AsyncStorage.setItem(KEY_CARDS_TELA_INICIAL, JSON.stringify(data));
  } catch (e) {
    console.warn('saveCardsTelaInicial:', e);
  }
}

export async function loadFinanciamentos() {
  try {
    const raw = await AsyncStorage.getItem(KEY_FINANCIAMENTOS);
    if (raw) {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.warn('loadFinanciamentos:', e);
  }
  return [];
}

export async function saveFinanciamentos(financiamentos) {
  try {
    await AsyncStorage.setItem(KEY_FINANCIAMENTOS, JSON.stringify(financiamentos));
  } catch (e) {
    console.warn('saveFinanciamentos:', e);
  }
}

export async function loadObjetivos() {
  try {
    const raw = await AsyncStorage.getItem(KEY_OBJETIVOS);
    if (raw) {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.warn('loadObjetivos:', e);
  }
  return [];
}

export async function saveObjetivos(objetivos) {
  try {
    await AsyncStorage.setItem(KEY_OBJETIVOS, JSON.stringify(objetivos));
  } catch (e) {
    console.warn('saveObjetivos:', e);
  }
}

export async function loadContas() {
  try {
    const raw = await AsyncStorage.getItem(KEY_CONTAS);
    if (raw) {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : null;
    }
  } catch (e) {
    console.warn('loadContas:', e);
  }
  return null;
}

export async function saveContas(contas) {
  try {
    await AsyncStorage.setItem(KEY_CONTAS, JSON.stringify(contas));
  } catch (e) {
    console.warn('saveContas:', e);
  }
}

export async function loadCartoes() {
  try {
    const raw = await AsyncStorage.getItem(KEY_CARTOES);
    if (raw) {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.warn('loadCartoes:', e);
  }
  return null;
}

export async function saveCartoes(cartoes) {
  try {
    await AsyncStorage.setItem(KEY_CARTOES, JSON.stringify(cartoes));
  } catch (e) {
    console.warn('saveCartoes:', e);
  }
}

export async function loadTransacoes() {
  try {
    const raw = await AsyncStorage.getItem(KEY_TRANSACOES);
    if (raw) {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.warn('loadTransacoes:', e);
  }
  return null;
}

export async function saveTransacoes(transacoes) {
  try {
    await AsyncStorage.setItem(KEY_TRANSACOES, JSON.stringify(transacoes));
  } catch (e) {
    console.warn('saveTransacoes:', e);
  }
}

export async function loadOrcamentoMensal() {
  try {
    const raw = await AsyncStorage.getItem(KEY_ORCAMENTO_MENSAL);
    if (raw) {
      const data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : {};
    }
  } catch (e) {
    console.warn('loadOrcamentoMensal:', e);
  }
  return null;
}

export async function saveOrcamentoMensal(orcamentoMensal) {
  try {
    await AsyncStorage.setItem(KEY_ORCAMENTO_MENSAL, JSON.stringify(orcamentoMensal || {}));
  } catch (e) {
    console.warn('saveOrcamentoMensal:', e);
  }
}

export async function loadUsuarios() {
  try {
    const raw = await AsyncStorage.getItem(KEY_USUARIOS);
    if (raw) {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.warn('loadUsuarios:', e);
  }
  return null;
}

export async function saveUsuarios(usuarios) {
  try {
    await AsyncStorage.setItem(KEY_USUARIOS, JSON.stringify(usuarios || []));
  } catch (e) {
    console.warn('saveUsuarios:', e);
  }
}

export async function loadRecebimentosUsuarios() {
  try {
    const raw = await AsyncStorage.getItem(KEY_RECEBIMENTOS_USUARIOS);
    if (raw) {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.warn('loadRecebimentosUsuarios:', e);
  }
  return [];
}

export async function saveRecebimentosUsuarios(recebimentos) {
  try {
    await AsyncStorage.setItem(KEY_RECEBIMENTOS_USUARIOS, JSON.stringify(recebimentos || []));
  } catch (e) {
    console.warn('saveRecebimentosUsuarios:', e);
  }
}

export async function loadCobrancasRecebidas() {
  try {
    const raw = await AsyncStorage.getItem(KEY_COBRANCAS_RECEBIDAS);
    if (raw) {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.warn('loadCobrancasRecebidas:', e);
  }
  return [];
}

export async function saveCobrancasRecebidas(cobrancas) {
  try {
    await AsyncStorage.setItem(KEY_COBRANCAS_RECEBIDAS, JSON.stringify(cobrancas || []));
  } catch (e) {
    console.warn('saveCobrancasRecebidas:', e);
  }
}

export async function loadPerfil() {
  try {
    const raw = await AsyncStorage.getItem(KEY_PERFIL);
    if (raw) {
      const data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : null;
    }
  } catch (e) {
    console.warn('loadPerfil:', e);
  }
  return null;
}

export async function savePerfil(perfil) {
  try {
    await AsyncStorage.setItem(KEY_PERFIL, JSON.stringify(perfil || {}));
  } catch (e) {
    console.warn('savePerfil:', e);
  }
}

/**
 * Grava no localStorage o objeto completo dos dados do app (mesmo formato do Supabase/parseAppDataFromObject).
 * Usado após buscar do banco ou após salvar no banco, para manter celular com os mesmos dados e permitir uso offline na sessão.
 */
export async function saveAllAppDataToStorage(data) {
  if (!data || typeof data !== 'object') return;
  try {
    if (Array.isArray(data.contas)) await saveContas(data.contas);
    if (Array.isArray(data.cartoes)) await saveCartoes(data.cartoes);
    if (Array.isArray(data.transacoes)) await saveTransacoes(data.transacoes);
    if (Array.isArray(data.objetivos)) await saveObjetivos(data.objetivos);
    if (Array.isArray(data.financiamentos)) await saveFinanciamentos(data.financiamentos);
    if (data.orcamentoMensal != null && typeof data.orcamentoMensal === 'object') await saveOrcamentoMensal(data.orcamentoMensal);
    if (Array.isArray(data.recebimentosUsuarios)) await saveRecebimentosUsuarios(data.recebimentosUsuarios);
    if (Array.isArray(data.usuarios)) await saveUsuarios(data.usuarios);
    if (Array.isArray(data.cobrancasRecebidas)) await saveCobrancasRecebidas(data.cobrancasRecebidas);
    if (data.perfil != null && typeof data.perfil === 'object') await savePerfil(data.perfil);
    if (Array.isArray(data.categorias)) await saveCategorias(data.categorias);
    if (data.cardsTelaInicial != null && typeof data.cardsTelaInicial === 'object') {
      await saveCardsTelaInicial(data.cardsTelaInicial);
    }
  } catch (e) {
    console.warn('saveAllAppDataToStorage:', e);
  }
}

export async function clearAllFluxAppData() {
  try {
    await AsyncStorage.multiRemove(ALL_KEYS);
  } catch (e) {
    console.warn('clearAllFluxAppData:', e);
  }
}

/** Dono dos dados no storage: { userId, cpf }. Usado para verificar se o local é do usuário logado. */
export async function getStorageOwner() {
  try {
    const raw = await AsyncStorage.getItem(KEY_OWNER);
    if (raw) {
      const data = JSON.parse(raw);
      return data && typeof data === 'object' && data.userId ? data : null;
    }
  } catch (e) {
    console.warn('getStorageOwner:', e);
  }
  return null;
}

export async function setStorageOwner(owner) {
  try {
    if (owner && owner.userId) {
      await AsyncStorage.setItem(KEY_OWNER, JSON.stringify({ userId: owner.userId, cpf: owner.cpf ?? null }));
    } else {
      await AsyncStorage.removeItem(KEY_OWNER);
    }
  } catch (e) {
    console.warn('setStorageOwner:', e);
  }
}

export async function removeStorageOwner() {
  try {
    await AsyncStorage.removeItem(KEY_OWNER);
  } catch (e) {
    console.warn('removeStorageOwner:', e);
  }
}
