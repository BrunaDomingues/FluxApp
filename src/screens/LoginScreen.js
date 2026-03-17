import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { validateEmail, formatAuthErrorMessage } from '../utils/authValidation';

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { signIn, isSupabaseConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const e = email.trim();
    if (!e) {
      Alert.alert('E-mail obrigatório', 'Digite seu e-mail.');
      return;
    }
    if (!validateEmail(e)) {
      Alert.alert('E-mail inválido', 'Digite um e-mail válido.');
      return;
    }
    if (!password) {
      Alert.alert('Senha obrigatória', 'Digite sua senha.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(e, password);
    setLoading(false);
    if (error) {
      Alert.alert('Erro ao entrar', formatAuthErrorMessage(error.message) || 'Verifique e-mail e senha.');
      return;
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, padding: spacing.lg }]}>
        <Text style={styles.title}>FluxApp</Text>
        <Text style={styles.error}>
          Configure o Supabase para usar login. Crie um projeto em supabase.com e defina no projeto:
          EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY (em .env ou app.config.js).
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.replace('MainTabs')}
        >
          <Text style={styles.btnText}>Entrar sem login (apenas local)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xl * 3 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <Text style={styles.logoTitle}>FluxApp</Text>
        <Text style={styles.subtitle}>Controle financeiro na palma da mão</Text>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          placeholder="seu@email.com"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.label}>Senha</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Sua senha"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword((v) => !v)}
            accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="log-in-outline" size={22} color="#fff" />
              <Text style={styles.btnText}>Entrar</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.linkText}>Esqueci minha senha</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Não tem conta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.linkText}>Criar conta</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingTop: spacing.xl },
  logoTitle: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xl * 2 },
  label: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  inputPassword: {
    flex: 1,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  eyeBtn: { padding: spacing.md },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  link: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { fontSize: 14, color: colors.primary },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl },
  footerText: { fontSize: 14, color: colors.textMuted },
  error: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
});
