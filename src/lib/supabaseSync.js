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
 * Salva os dados do app no Supabase para o usuário logado.
 * @param {string} userId - auth.users.id
 * @param {object} appData - Objeto retornado por buildAppDataPayload (contas, cartoes, etc.)
 * @returns {Promise<{ error: Error | null }>}
 */
export async function saveUserData(userId, appData) {
  if (!userId || !appData) return { error: null };
  try {
    const payload = buildAppDataPayload(appData);
    const { error } = await supabase
      .from('user_data')
      .upsert(
        { user_id: userId, data: payload, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    return { error: error || null };
  } catch (e) {
    return { error: e };
  }
}
