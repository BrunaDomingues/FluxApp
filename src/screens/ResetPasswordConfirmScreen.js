import React, { useState } from 'react';
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
import { validatePassword } from '../utils/authValidation';
import { supabase } from '../lib/supabase';

export default function ResetPasswordConfirmScreen({ onDone }) {
  const insets = useSafeAreaInsets();
  const { clearRequiresNewPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordRepeat, setShowPasswordRepeat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async () => {
    const result = validatePassword(password, passwordRepeat);
    if (!result.ok) {
      setErrors({
        password: result.error,
        passwordRepeat: password !== passwordRepeat ? 'As senhas são diferentes.' : undefined,
      });
      return;
    }
    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      AppAlert.alert('Erro', error.message || 'Não foi possível atualizar a senha. Tente novamente.');
      return;
    }
    clearRequiresNewPassword?.();
    if (typeof onDone === 'function') onDone();
    AppAlert.alert('Senha atualizada', 'Sua senha foi alterada. Você já pode entrar com ela na próxima vez.');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Nova senha</Text>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xl * 3 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.hint}>
            Você abriu o link de redefinição de senha. Defina uma nova senha abaixo. Ela deve ter mais de 6 caracteres, uma letra maiúscula e um caractere especial.
          </Text>
          <Text style={styles.label}>Nova senha</Text>
          <View style={[styles.passwordWrap, errors.password && styles.passwordWrapError]}>
            <TextInput
              style={styles.inputPassword}
              placeholder="Digite a nova senha"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: null })); }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          <Text style={styles.label}>Repetir senha</Text>
          <View style={[styles.passwordWrap, (errors.passwordRepeat || (passwordRepeat && password !== passwordRepeat)) && styles.passwordWrapError]}>
            <TextInput
              style={styles.inputPassword}
              placeholder="Repita a nova senha"
              placeholderTextColor={colors.textMuted}
              value={passwordRepeat}
              onChangeText={(t) => { setPasswordRepeat(t); setErrors((e) => ({ ...e, passwordRepeat: null })); }}
              secureTextEntry={!showPasswordRepeat}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPasswordRepeat((v) => !v)}
              accessibilityLabel={showPasswordRepeat ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <Ionicons name={showPasswordRepeat ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {(errors.passwordRepeat || (passwordRepeat && password !== passwordRepeat)) ? (
            <Text style={styles.errorText}>{errors.passwordRepeat || 'As senhas são diferentes.'}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                <Text style={styles.btnText}>Definir nova senha</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  hint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg },
  label: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  passwordWrapError: { borderColor: colors.spending, borderWidth: 2 },
  errorText: { fontSize: 12, color: colors.spending, marginBottom: spacing.lg, marginLeft: spacing.xs },
  inputPassword: { flex: 1, padding: spacing.md, fontSize: 16, color: colors.textPrimary },
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
});
