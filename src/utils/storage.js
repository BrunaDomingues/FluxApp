import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_CATEGORIAS = '@fluxapp_categorias';

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
