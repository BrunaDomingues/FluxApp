import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { AppAlert } from '../components/AppAlert';
import { validateEmail, validatePassword, validateCpf, formatAuthErrorMessage } from '../utils/authValidation';
import { maskCpfInput, normalizeCpf } from '../utils/dateMask';

export default function SignUpScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { signUp, signOut, checkCpfExists, checkPendingSignup, completePendingSignup, getPendingByCpf } = useAuth();
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpfDisplay, setCpfDisplay] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordRepeat, setShowPasswordRepeat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const cpfNormalized = normalizeCpf(cpfDisplay);
  const passwordsDontMatch = passwordRepeat.length > 0 && password !== passwordRepeat;

  // Ao digitar um CPF com convite pendente, preenche nome e e-mail automaticamente
  useEffect(() => {
    if (cpfNormalized.length !== 11) return;
    let cancelled = false;
    getPendingByCpf(cpfNormalized).then(({ found, email: pendingEmail, nomeCompleto: pendingNome }) => {
      if (cancelled || !found) return;
      if (pendingNome) setNomeCompleto(pendingNome);
      if (pendingEmail) setEmail(pendingEmail);
    });
    return () => { cancelled = true; };
  }, [cpfNormalized, getPendingByCpf]);

  const setFieldError = (field, message) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };
  const clearFieldError = (field) => setFieldError(field, null);

  const handleSignUp = async () => {
    const nome = nomeCompleto.trim();
    const e = email.trim();

    const newErrors = {};
    const cpfResult = validateCpf(cpfDisplay);
    if (!cpfResult.ok) newErrors.cpf = cpfResult.error;
    if (!e) newErrors.email = 'Digite seu e-mail.';
    else if (!validateEmail(e)) newErrors.email = 'Digite um e-mail válido.';
    const pwd = validatePassword(password, passwordRepeat);
    if (!pwd.ok) {
      newErrors.password = pwd.error;
      if (password !== passwordRepeat) newErrors.passwordRepeat = 'As senhas são diferentes.';
    } else if (passwordsDontMatch) newErrors.passwordRepeat = 'As senhas são diferentes.';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    const { found: pendingFound, nomeCompleto: pendingNome, error: pendingError } = await checkPendingSignup(e, cpfNormalized);
    if (pendingError) {
      setLoading(false);
      setErrors({ email: 'Não foi possível verificar. Tente novamente.' });
      return;
    }

    if (pendingFound) {
      const { data, error } = await signUp(e, password, {
        nomeCompleto: nome || pendingNome || '',
        cpf: cpfNormalized,
      });
      if (error) {
        setLoading(false);
        setErrors({ password: formatAuthErrorMessage(error.message) || 'Erro ao criar senha.' });
        return;
      }
      if (data?.user && !data.user.identities?.length) {
        setLoading(false);
        setErrors({ email: 'Este e-mail já está cadastrado. Faça login.' });
        return;
      }
      await completePendingSignup();
      await signOut();
      setLoading(false);
      AppAlert.alert(
        'Cadastro concluído',
        'Conta criada. Agora é só entrar com este e-mail e senha.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!nome) {
      setLoading(false);
      setErrors({ nomeCompleto: 'Digite seu nome completo.' });
      return;
    }

    const { exists: cpfExists, error: cpfCheckError } = await checkCpfExists(cpfNormalized);
    if (cpfCheckError) {
      setLoading(false);
      setErrors({ cpf: 'Não foi possível verificar o CPF. Confira se a função check_cpf_exists existe no Supabase.' });
      return;
    }
    if (cpfExists) {
      setLoading(false);
      setErrors({ cpf: 'Este CPF já está cadastrado.' });
      return;
    }
    const { data, error } = await signUp(e, password, { nomeCompleto: nome, cpf: cpfNormalized });
    if (error) {
      setLoading(false);
      setErrors({ email: formatAuthErrorMessage(error.message) || 'Erro ao criar conta. Tente outro e-mail.' });
      return;
    }
    if (data?.user && !data.user.identities?.length) {
      setLoading(false);
      setErrors({ email: 'Este e-mail já está cadastrado. Faça login.' });
      return;
    }
    await signOut();
    setLoading(false);
    AppAlert.alert(
      'Conta criada',
      'Conta criada com sucesso. Agora é só entrar com o e-mail e a senha que você acabou de definir.',
      [{ text: 'OK' }]
    );
  };

  const handleCpfChange = (text) => setCpfDisplay(maskCpfInput(text));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Criar conta</Text>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xl * 3 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.hint}>
            Preencha CPF, e-mail e nome. Senha: mais de 6 caracteres, maiúscula e caractere especial. Se você foi convidado, os dados podem ser preenchidos ao digitar o CPF.
          </Text>
          <Text style={styles.label}>CPF</Text>
              <TextInput
                style={[styles.input, errors.cpf && styles.inputError]}
                placeholder="000.000.000-00"
                placeholderTextColor={colors.textMuted}
                value={cpfDisplay}
                onChangeText={(t) => { handleCpfChange(t); clearFieldError('cpf'); }}
                keyboardType="numeric"
                maxLength={14}
              />
              {errors.cpf ? <Text style={styles.errorText}>{errors.cpf}</Text> : null}

              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="seu@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(t) => { setEmail(t); clearFieldError('email'); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

          <Text style={styles.label}>Nome completo</Text>
          <TextInput
            style={[styles.input, errors.nomeCompleto && styles.inputError]}
            placeholder="Ex: Maria Silva Santos"
            placeholderTextColor={colors.textMuted}
            value={nomeCompleto}
            onChangeText={(t) => { setNomeCompleto(t); clearFieldError('nomeCompleto'); }}
          />
          {errors.nomeCompleto ? <Text style={styles.errorText}>{errors.nomeCompleto}</Text> : null}

          <Text style={styles.label}>Senha</Text>
          <View style={[styles.passwordWrap, (errors.password || passwordsDontMatch) && styles.passwordWrapError]}>
            <TextInput
              style={styles.inputPassword}
              placeholder="Digite a senha"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={(t) => { setPassword(t); clearFieldError('password'); clearFieldError('passwordRepeat'); }}
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
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

          <Text style={styles.label}>Repetir senha</Text>
          <View style={[styles.passwordWrap, (errors.passwordRepeat || passwordsDontMatch) && styles.passwordWrapError]}>
            <TextInput
              style={styles.inputPassword}
              placeholder="Repita a mesma senha"
              placeholderTextColor={colors.textMuted}
              value={passwordRepeat}
              onChangeText={(t) => { setPasswordRepeat(t); clearFieldError('passwordRepeat'); clearFieldError('password'); }}
              secureTextEntry={!showPasswordRepeat}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPasswordRepeat((v) => !v)}
              accessibilityLabel={showPasswordRepeat ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <Ionicons
                name={showPasswordRepeat ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
          {(errors.passwordRepeat || passwordsDontMatch) ? (
            <Text style={styles.errorText}>{errors.passwordRepeat || 'As senhas são diferentes.'}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={22} color="#fff" />
                <Text style={styles.btnText}>Criar conta</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Já tem conta?</Text>
            <TouchableOpacity onPress={() => navigation.replace('Login')}>
              <Text style={styles.linkText}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  hint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg },
  label: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  inputError: {
    borderColor: colors.spending,
    borderWidth: 2,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  passwordWrapError: {
    borderColor: colors.spending,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    color: colors.spending,
    marginBottom: spacing.lg,
    marginLeft: spacing.xs,
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
  footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl },
  footerText: { fontSize: 14, color: colors.textMuted },
  link: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { fontSize: 14, color: colors.primary },
});
