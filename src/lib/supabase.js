import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

let supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
let supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
try {
  const extra = require('expo-constants').default?.expoConfig?.extra || {};
  if (extra.supabaseUrl) supabaseUrl = extra.supabaseUrl;
  if (extra.supabaseAnonKey) supabaseAnonKey = extra.supabaseAnonKey;
} catch (_) {}

/** Adapter para Supabase Auth usar AsyncStorage (interface async). */
const asyncStorageAdapter = {
  getItem: async (key) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (_) {}
  },
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (_) {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: asyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
