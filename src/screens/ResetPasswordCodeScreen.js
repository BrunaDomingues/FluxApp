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

const CODE_LENGTH = 8;

export default function ResetPasswordCodeScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const email = (route?.params?.email || '').trim();
  const { confirmPasswordResetCode } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCodeChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setError('');
  };

  const handleSubmit = async () => {
    if (!email) {
      setError('E-mail não informado.');
      return;
    }
    const digits = code.replace(/\D/g, '');
    if (digits.length !== CODE_LENGTH) {
      setError(`Digite o código de ${CODE_LENGTH} dígitos que enviamos para seu e-mail.`);
      return;
    }
    setLoading(true);
    setError('');
    const { error: err } = await confirmPasswordResetCode(email, digits);
    setLoading(false);
    if (err) {
      setError(err.message || 'Código inválido ou expirado. Solicite um novo.');
      return;
    }
    // requiresNewPassword foi setado; RootNavigator vai mostrar ResetPasswordConfirmScreen
  };

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
          <Text style={styles.title}>Código de verificação</Text>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xl * 3 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.hint}>
            Enviamos um código de 8 dígitos para {email || 'seu e-mail'}. Digite-o abaixo para confirmar e redefinir sua senha.
          </Text>
          <Text style={styles.label}>Código</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="00000000"
            placeholderTextColor={colors.textMuted}
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            editable={!loading}
            selectTextOnFocus
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
                <Text style={styles.btnText}>Confirmar e redefinir senha</Text>
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
    fontSize: 24,
    letterSpacing: 8,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    textAlign: 'center',
  },
  inputError: { borderColor: colors.spending, borderWidth: 2 },
  errorText: { fontSize: 12, color: colors.spending, marginBottom: spacing.lg, marginLeft: spacing.xs },
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
