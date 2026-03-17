import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => subscription.unsubscribe();
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

  const signIn = useCallback(async (email, password) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.' } };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { data, error };
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
    await supabase.auth.signOut();
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
    resetPasswordForEmail,
    sendPasswordResetCode,
    confirmPasswordResetCode,
    checkCpfExists,
    checkPendingSignup,
    createPendingUser,
    completePendingSignup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
