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

export async function clearAllFluxAppData() {
  try {
    await AsyncStorage.multiRemove(ALL_KEYS);
  } catch (e) {
    console.warn('clearAllFluxAppData:', e);
  }
}
