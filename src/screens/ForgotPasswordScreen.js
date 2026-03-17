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

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { sendPasswordResetCode } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    const e = email.trim();
    if (!e) {
      Alert.alert('E-mail obrigatório', 'Digite seu e-mail para receber o código de recuperação.');
      return;
    }
    if (!validateEmail(e)) {
      Alert.alert('E-mail inválido', 'Digite um e-mail válido.');
      return;
    }
    setLoading(true);
    setSent(false);
    const { error } = await sendPasswordResetCode(e);
    setLoading(false);
    if (error) {
      Alert.alert('Erro', formatAuthErrorMessage(error.message) || 'Não foi possível enviar o código. Tente de novo.');
      return;
    }
    setSent(true);
    navigation.navigate('ResetPasswordCode', { email: e });
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
          <Text style={styles.title}>Recuperar senha</Text>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xl * 3 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.hint}>
            Digite o e-mail da sua conta. Enviaremos um código de 8 dígitos para você confirmar e redefinir a senha.
          </Text>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={(t) => { setEmail(t); setSent(false); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSend}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="mail-outline" size={22} color="#fff" />
                <Text style={styles.btnText}>Enviar código</Text>
              </>
            )}
          </TouchableOpacity>
          {sent && (
            <Text style={styles.sentMsg}>Verifique sua caixa de entrada e o spam.</Text>
          )}
          <TouchableOpacity style={styles.link} onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Voltar ao login</Text>
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
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
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
  sentMsg: { fontSize: 13, color: colors.positive, marginTop: spacing.lg, textAlign: 'center' },
  link: { marginTop: spacing.xl, alignItems: 'center' },
  linkText: { fontSize: 14, color: colors.primary },
});
