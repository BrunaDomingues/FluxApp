import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const KEY_SLOT_1 = '@fluxapp_account_slot_1';
const KEY_SLOT_2 = '@fluxapp_account_slot_2';
const KEY_ACTIVE_SLOT = '@fluxapp_active_slot';

async function getStoredSlot(slot) {
  try {
    const raw = await AsyncStorage.getItem(slot === 1 ? KEY_SLOT_1 : KEY_SLOT_2);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.refresh_token ? data : null;
  } catch (_) {
    return null;
  }
}

async function setStoredSlot(slot, data) {
  try {
    const key = slot === 1 ? KEY_SLOT_1 : KEY_SLOT_2;
    if (data) await AsyncStorage.setItem(key, JSON.stringify(data));
    else await AsyncStorage.removeItem(key);
  } catch (_) {}
}

async function getActiveSlot() {
  try {
    const s = await AsyncStorage.getItem(KEY_ACTIVE_SLOT);
    return s === '2' ? 2 : 1;
  } catch (_) {
    return 1;
  }
}

async function setActiveSlot(slot) {
  try {
    await AsyncStorage.setItem(KEY_ACTIVE_SLOT, String(slot));
  } catch (_) {}
}

const PASSWORD_RESET_REDIRECT = 'fluxapp://reset-password';

function parseFragmentParams(fragment) {
  if (!fragment || typeof fragment !== 'string') return {};
  const params = {};
  fragment.split('&').forEach((pair) => {
    const [key, value] = pair.split('=').map((s) => decodeURIComponent(s?.replace(/\+/g, ' ') || ''));
    if (key && value) params[key] = value;
  });
  return params;
}

function handleRecoveryUrl(url) {
  if (!url || !url.includes('#')) return;
  const hashIndex = url.indexOf('#');
  const fragment = url.slice(hashIndex + 1);
  const params = parseFragmentParams(fragment);
  if (params.type !== 'recovery' || !params.access_token || !params.refresh_token) return;
  return { access_token: params.access_token, refresh_token: params.refresh_token };
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requiresNewPassword, setRequiresNewPassword] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (s?.refresh_token) {
        const slot1 = await getStoredSlot(1);
        const slot2 = await getStoredSlot(2);
        const active = await getActiveSlot();
        const email = s.user?.email ?? '';
        const slotData = { refresh_token: s.refresh_token, email };
        if (slot1?.email === email) {
          await setStoredSlot(1, slotData);
          await setActiveSlot(1);
        } else if (slot2?.email === email) {
          await setStoredSlot(2, slotData);
          await setActiveSlot(2);
        } else if (!slot1) {
          await setStoredSlot(1, slotData);
          await setActiveSlot(1);
        } else if (!slot2) {
          await setStoredSlot(2, slotData);
          await setActiveSlot(2);
        } else {
          await setStoredSlot(active, slotData);
        }
        if (mounted) {
          setSession(s);
          setUser(s?.user ?? null);
        }
      } else {
        const active = await getActiveSlot();
        const stored = await getStoredSlot(active);
        if (stored?.refresh_token) {
          const { data: { session: s2 }, error } = await supabase.auth.refreshSession({ refresh_token: stored.refresh_token });
          if (!error && s2 && mounted) {
            setSession(s2);
            setUser(s2.user ?? null);
          }
        }
      }
      setLoading(false);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const processUrl = (url) => {
      const tokens = handleRecoveryUrl(url);
      if (!tokens) return;
      supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      }).then(() => setRequiresNewPassword(true)).catch(() => {});
    };
    Linking.getInitialURL().then((url) => {
      if (url) processUrl(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => processUrl(url));
    return () => sub.remove();
  }, [isSupabaseConfigured]);

  const signIn = useCallback(async (email, password, options = {}) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.' } };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { data, error };
    const { addAccount } = options;
    const s = data?.session;
    if (s?.refresh_token) {
      const slot1 = await getStoredSlot(1);
      const slot2 = await getStoredSlot(2);
      const slotData = { refresh_token: s.refresh_token, email: s.user?.email ?? email.trim() };
      if (addAccount && slot1) {
        await setStoredSlot(2, slotData);
        await setActiveSlot(2);
      } else if (!slot1) {
        await setStoredSlot(1, slotData);
        await setActiveSlot(1);
      } else if (!slot2) {
        await setStoredSlot(2, slotData);
        await setActiveSlot(2);
      } else {
        const active = await getActiveSlot();
        await setStoredSlot(active, slotData);
      }
    }
    setSession(data?.session ?? null);
    setUser(data?.user ?? null);
    return { data, error: null };
  }, []);

  const signUp = useCallback(async (email, password, profile = {}) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Supabase não configurado.' } };
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: undefined,
        data: { nome_completo: profile.nomeCompleto, cpf: profile.cpf },
      },
    });
    if (error) return { data, error };
    if (data?.user && (profile.nomeCompleto != null || profile.cpf != null)) {
      const { error: insertError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email ?? email.trim(),
        nome_completo: profile.nomeCompleto ?? null,
        cpf: profile.cpf ?? null,
      });
      if (insertError) {
        if (insertError.code === '23505') return { data, error: { message: 'Este CPF já está cadastrado.' } };
        if (insertError.code === '42P01' || (insertError.message && insertError.message.includes('does not exist'))) {
          return { data, error: null };
        }
        return { data, error: { message: insertError.message } };
      }
    }
    return { data, error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await setStoredSlot(1, null);
    await setStoredSlot(2, null);
    await setActiveSlot(1);
    await supabase.auth.signOut();
  }, []);

  /** Salva a sessão atual em um slot (usar antes de navegar para "Adicionar outra conta"). */
  const saveCurrentSessionToStorage = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s?.refresh_token) return;
    const slot1 = await getStoredSlot(1);
    const slot2 = await getStoredSlot(2);
    const slotData = { refresh_token: s.refresh_token, email: s.user?.email ?? '' };
    if (!slot1) await setStoredSlot(1, slotData);
    else if (!slot2) await setStoredSlot(2, slotData);
    else await setStoredSlot(await getActiveSlot(), slotData);
  }, []);

  /** Lista as duas contas armazenadas para exibir na UI. Retorna { accounts: [{ slot, email }], activeSlot }. */
  const getStoredAccounts = useCallback(async () => {
    const slot1 = await getStoredSlot(1);
    const slot2 = await getStoredSlot(2);
    const active = await getActiveSlot();
    const accounts = [];
    if (slot1?.email) accounts.push({ slot: 1, email: slot1.email });
    if (slot2?.email) accounts.push({ slot: 2, email: slot2.email });
    return { accounts, activeSlot: active };
  }, []);

  /** Alterna para a outra conta (só faz sentido quando há 2 contas). */
  const switchAccount = useCallback(async () => {
    const active = await getActiveSlot();
    const otherSlot = active === 1 ? 2 : 1;
    return switchToAccount(otherSlot);
  }, []);

  /** Ativa a conta do slot indicado (1 ou 2). Se já for a ativa, não faz nada. */
  const switchToAccount = useCallback(async (targetSlot) => {
    if (!isSupabaseConfigured) return { error: 'Não configurado.' };
    const active = await getActiveSlot();
    if (targetSlot === active) return { error: null };
    const target = await getStoredSlot(targetSlot);
    if (!target?.refresh_token) return { error: 'Conta não encontrada.' };
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.refresh_token) await setStoredSlot(active, { refresh_token: s.refresh_token, email: s.user?.email ?? '' });
    await supabase.auth.signOut();
    const { data: { session: s2 }, error } = await supabase.auth.refreshSession({ refresh_token: target.refresh_token });
    if (error) return { error: error.message };
    await setActiveSlot(targetSlot);
    setSession(s2);
    setUser(s2?.user ?? null);
    return { error: null };
  }, []);

  /** Remove uma conta dos armazenadas. Se for a ativa, alterna para a outra ou encerra todas. */
  const removeStoredAccount = useCallback(async (slot) => {
    const active = await getActiveSlot();
    const slot1 = await getStoredSlot(1);
    const slot2 = await getStoredSlot(2);
    const isActive = slot === active;
    await setStoredSlot(slot, null);
    if (!isActive) return { error: null };
    const otherSlot = slot === 1 ? 2 : 1;
    const other = await getStoredSlot(otherSlot);
    if (other?.refresh_token) {
      await supabase.auth.signOut();
      const { data: { session: s2 }, error } = await supabase.auth.refreshSession({ refresh_token: other.refresh_token });
      if (!error && s2) {
        await setActiveSlot(otherSlot);
        setSession(s2);
        setUser(s2.user ?? null);
      } else {
        await setActiveSlot(1);
        setSession(null);
        setUser(null);
      }
    } else {
      await setActiveSlot(1);
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    }
    return { error: null };
  }, []);

  const resetPasswordForEmail = useCallback(async (email) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Supabase não configurado.' } };
    }
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: PASSWORD_RESET_REDIRECT,
    });
    return { data, error };
  }, []);

  /** Envia um código de 6 dígitos para o e-mail para redefinir a senha (fluxo OTP). */
  const sendPasswordResetCode = useCallback(async (email) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Supabase não configurado.' } };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    return { error: error ? { message: error.message } : null };
  }, []);

  /** Confirma o código recebido por e-mail e marca que o usuário deve definir nova senha. */
  const confirmPasswordResetCode = useCallback(async (email, token) => {
    if (!isSupabaseConfigured || !email?.trim() || !token?.trim()) {
      return { error: { message: 'E-mail e código são obrigatórios.' } };
    }
    const code = String(token).trim().replace(/\D/g, '').slice(0, 8);
    if (code.length !== 8) {
      return { error: { message: 'O código deve ter 8 dígitos.' } };
    }
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'email',
    });
    if (error) return { error: { message: error.message } };
    setRequiresNewPassword(true);
    return { error: null };
  }, []);

  const clearRequiresNewPassword = useCallback(() => {
    setRequiresNewPassword(false);
  }, []);

  /**
   * Verifica se o CPF já existe na tabela profiles (opcional: requer RPC check_cpf_exists no Supabase).
   * Se a função não existir no projeto, retorna { exists: false, error: null } para não bloquear o cadastro.
   */
  const checkCpfExists = useCallback(async (cpfNormalized) => {
    if (!isSupabaseConfigured || !cpfNormalized || cpfNormalized.length !== 11) {
      return { exists: false, error: null };
    }
    const { data, error } = await supabase.rpc('check_cpf_exists', { cpf: cpfNormalized });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('function') && (msg.includes('does not exist') || msg.includes('not found'))) {
        return { exists: false, error: null };
      }
      return { exists: false, error: error.message };
    }
    return { exists: Boolean(data), error: null };
  }, []);

  /** Verifica se existe convite pendente (email+cpf) para completar cadastro só com senha. */
  const checkPendingSignup = useCallback(async (email, cpfNormalized) => {
    if (!isSupabaseConfigured || !email?.trim() || !cpfNormalized || cpfNormalized.length !== 11) {
      return { found: false, nomeCompleto: null, error: null };
    }
    const { data, error } = await supabase.rpc('check_pending_signup', {
      p_email: email.trim(),
      p_cpf: cpfNormalized,
    });
    if (error) return { found: false, nomeCompleto: null, error: error.message };
    const found = data?.found === true;
    return { found, nomeCompleto: data?.nome_completo ?? null, error: null };
  }, []);

  /** Busca nome e e-mail de convite pendente apenas pelo CPF (para preencher o formulário). */
  const getPendingByCpf = useCallback(async (cpfNormalized) => {
    if (!isSupabaseConfigured || !cpfNormalized || cpfNormalized.length !== 11) {
      return { found: false, email: null, nomeCompleto: null, error: null };
    }
    const { data, error } = await supabase.rpc('get_pending_by_cpf', { p_cpf: cpfNormalized });
    if (error) return { found: false, email: null, nomeCompleto: null, error: error.message };
    const found = data?.found === true;
    return {
      found,
      email: found ? (data?.email ?? null) : null,
      nomeCompleto: found ? (data?.nome_completo ?? null) : null,
      error: null,
    };
  }, []);

  /** Cria convite pendente (você convida alguém para o app; eles completam o cadastro depois). */
  const createPendingUser = useCallback(async (email, cpfNormalized, nomeCompleto) => {
    if (!isSupabaseConfigured || !email?.trim() || !cpfNormalized || cpfNormalized.length !== 11 || !nomeCompleto?.trim()) {
      return { error: 'Dados inválidos.' };
    }
    const { error } = await supabase.rpc('create_pending_user', {
      p_email: email.trim(),
      p_cpf: cpfNormalized,
      p_nome_completo: nomeCompleto.trim(),
    });
    return { error: error?.message ?? null };
  }, []);

  /** Marca que o usuário atual completou a senha (convite aceito). Chamar após signUp em modo "completar cadastro". */
  const completePendingSignup = useCallback(async () => {
    if (!isSupabaseConfigured) return { error: null };
    const { error } = await supabase.rpc('complete_pending_signup');
    return { error: error?.message ?? null };
  }, []);

  /** Lista usuários vinculados à conta atual (quem convidou/convidado). */
  const getLinkedUsers = useCallback(async () => {
    if (!isSupabaseConfigured) return { data: [], error: null };
    const { data, error } = await supabase.rpc('get_linked_users');
    if (error) return { data: [], error: error.message };
    const list = (Array.isArray(data) ? data : []).map((row) => ({
      id: row.linked_user_id,
      nome: row.nome ?? '',
      email: row.email ?? '',
    }));
    return { data: list, error: null };
  }, []);

  /** Remove o vínculo entre a conta atual e o outro usuário. Não apaga despesas nem o nome no histórico. */
  const unlinkUser = useCallback(async (linkedUserId) => {
    if (!isSupabaseConfigured || !linkedUserId) return { error: 'Parâmetro inválido.' };
    const { error } = await supabase.rpc('unlink_user', { p_linked_user_id: linkedUserId });
    return { error: error?.message ?? null };
  }, []);

  /** Se o CPF já tem conta no app, apenas vincula (user_connections). Retorna { data: { id, nome, email }, error }. */
  const linkExistingUserByCpf = useCallback(async (cpfNormalized) => {
    if (!isSupabaseConfigured || !cpfNormalized || String(cpfNormalized).replace(/\D/g, '').length !== 11) {
      return { data: null, error: 'CPF inválido.' };
    }
    const cpfClean = String(cpfNormalized).replace(/\D/g, '').slice(0, 11);
    const { data: res, error } = await supabase.rpc('link_existing_user_by_cpf', { p_cpf: cpfClean });
    if (error) return { data: null, error: error.message };
    if (res?.ok === true) {
      return { data: { id: res.id, nome: res.nome ?? '', email: res.email ?? '' }, error: null };
    }
    return { data: null, error: res?.error ?? 'Não foi possível vincular.' };
  }, []);

  /** Registra partes de despesa compartilhada (para o outro usuário ver como pendente). */
  const registerSharedExpenseParts = useCallback(async (ownerId, transacaoId, descricao, parts) => {
    if (!isSupabaseConfigured || !ownerId || !transacaoId || !Array.isArray(parts) || parts.length === 0) {
      return { error: null };
    }
    const payload = parts.map((p) => ({ for_user_id: p.for_user_id, valor: p.valor }));
    const { error } = await supabase.rpc('register_shared_expense_parts', {
      p_owner_user_id: ownerId,
      p_transacao_id: transacaoId,
      p_descricao: descricao || '',
      p_parts: payload,
    });
    return { error: error?.message ?? null };
  }, []);

  /** Lista despesas compartilhadas pendentes (que o usuário atual deve). */
  const getMyPendingSharedExpenses = useCallback(async () => {
    if (!isSupabaseConfigured) return { data: [], error: null };
    const { data, error } = await supabase.rpc('get_my_pending_shared_expenses');
    if (error) return { data: [], error: error.message };
    const list = (Array.isArray(data) ? data : []).map((row) => ({
      id: row.part_id,
      ownerUserId: row.owner_user_id,
      ownerNome: row.owner_nome ?? '',
      transacaoId: row.transacao_id,
      descricao: row.descricao ?? '',
      valor: Number(row.valor) || 0,
      createdAt: row.created_at,
    }));
    return { data: list, error: null };
  }, []);

  /** Marca parte como paga e debita na carteira do usuário atual. opts: { data?, horario?, comprovante? }. */
  const markSharedExpensePartPaid = useCallback(async (partId, opts) => {
    if (!isSupabaseConfigured || !partId) return { error: 'Parâmetro inválido.' };
    const { data, error } = await supabase.rpc('mark_shared_expense_part_paid', {
      p_part_id: partId,
      p_data: opts?.data && String(opts.data).trim() ? String(opts.data).trim() : null,
      p_horario: opts?.horario && String(opts.horario).trim() ? String(opts.horario).trim() : null,
      p_comprovante: opts?.comprovante && String(opts.comprovante).length > 0 ? opts.comprovante : null,
    });
    if (error) return { error: error.message };
    if (data?.ok !== true) return { error: data?.error ?? 'Erro ao marcar como pago.' };
    return { error: null };
  }, []);

  /** Lista pagamentos sinalizados pelos devedores que o credor ainda não confirmou (para dar baixa na conta). */
  const getPaymentSignaledAwaitingConfirmation = useCallback(async () => {
    if (!isSupabaseConfigured) return { data: [], error: null };
    const { data, error } = await supabase.rpc('get_payment_signaled_awaiting_confirmation');
    if (error) return { data: [], error: error.message };
    const list = (Array.isArray(data) ? data : []).map((row) => ({
      id: row.part_id,
      forUserId: row.for_user_id,
      debtorNome: row.debtor_nome ?? '',
      descricao: row.descricao ?? '',
      valor: Number(row.valor) || 0,
      dataPagamentoSinalizada: row.data_pagamento_sinalizada ?? '',
      horarioPagamentoSinalizado: row.horario_pagamento_sinalizado ?? '',
      hasComprovante: !!row.has_comprovante,
      createdAt: row.created_at,
    }));
    return { data: list, error: null };
  }, []);

  /** Credor confirma o recebimento da parte sinalizada: leva valor para sua conta com data/horário/comprovante. */
  const confirmOwnerRecebimentoFromPart = useCallback(async (partId) => {
    if (!isSupabaseConfigured || !partId) return { error: 'Parâmetro inválido.' };
    const { data, error } = await supabase.rpc('confirm_owner_recebimento_from_part', { p_part_id: partId });
    if (error) return { error: error.message };
    if (data?.ok !== true) return { error: data?.error ?? 'Erro ao confirmar recebimento.' };
    return { error: null };
  }, []);

  /** Quando o dono registra recebimento: debita na carteira do devedor (chamado pelo app do dono). */
  const onRecebimentoFromUser = useCallback(async (ownerId, fromUserId, valor) => {
    if (!isSupabaseConfigured || !ownerId || !fromUserId || valor == null || valor <= 0) {
      return { error: null };
    }
    const { data, error } = await supabase.rpc('on_recebimento_from_user', {
      p_owner_user_id: ownerId,
      p_from_user_id: fromUserId,
      p_valor: Number(valor),
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const value = {
    session,
    user,
    loading,
    isAuthenticated: !!session,
    isSupabaseConfigured,
    requiresNewPassword,
    clearRequiresNewPassword,
    signIn,
    signUp,
    signOut,
    saveCurrentSessionToStorage,
    getStoredAccounts,
    switchAccount,
    switchToAccount,
    removeStoredAccount,
    resetPasswordForEmail,
    sendPasswordResetCode,
    confirmPasswordResetCode,
    checkCpfExists,
    checkPendingSignup,
    getPendingByCpf,
    createPendingUser,
    completePendingSignup,
    getLinkedUsers,
    unlinkUser,
    linkExistingUserByCpf,
    registerSharedExpenseParts,
    getMyPendingSharedExpenses,
    markSharedExpensePartPaid,
    getPaymentSignaledAwaitingConfirmation,
    confirmOwnerRecebimentoFromPart,
    onRecebimentoFromUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
