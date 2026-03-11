import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_CATEGORIAS = '@fluxapp_categorias';
const KEY_CARDS_TELA_INICIAL = '@fluxapp_cards_tela_inicial';
const KEY_FINANCIAMENTOS = '@fluxapp_financiamentos';

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
