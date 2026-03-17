import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { AppAlert } from '../components/AppAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { maskCpfInput, normalizeCpf } from '../utils/dateMask';

export default function PerfilScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { perfil, setPerfil } = useApp();
  const { user, sendPasswordResetCode, isSupabaseConfigured } = useAuth();
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpfDisplay, setCpfDisplay] = useState('');
  const [loadingPerfilBanco, setLoadingPerfilBanco] = useState(false);
  const currentUserIdRef = useRef(user?.id);

  useEffect(() => {
    currentUserIdRef.current = user?.id;
  }, [user?.id]);

  // Limpa o formulário ao trocar de usuário para não mostrar dados de outra conta
  useEffect(() => {
    if (!user?.id) {
      setNomeCompleto('');
      setCpfDisplay('');
      return;
    }
    setNomeCompleto('');
    setCpfDisplay('');
  }, [user?.id]);

  // Carrega dados do perfil apenas da tabela profiles (sempre pela conta logada)
  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return;
    setLoadingPerfilBanco(true);
    const userId = user.id;
    supabase
      .from('profiles')
      .select('nome_completo, cpf, email')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setLoadingPerfilBanco(false);
          return;
        }
        if (currentUserIdRef.current !== userId) {
          setLoadingPerfilBanco(false);
          return;
        }
        const nome = data.nome_completo || '';
        const cpf = data.cpf || '';
        setNomeCompleto(nome);
        setCpfDisplay(cpf ? maskCpfInput(cpf) : '');
        setPerfil({
          nomeCompleto: nome || undefined,
          cpf: cpf || undefined,
        });
        setLoadingPerfilBanco(false);
      });
  }, [user?.id, isSupabaseConfigured, setPerfil]);

  const handleSalvar = () => {
    const nome = nomeCompleto.trim();
    if (!nome) {
      AppAlert.alert('Nome obrigatório', 'Digite seu nome completo.');
      return;
    }

    const salvar = async () => {
      if (isSupabaseConfigured && user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({ nome_completo: nome })
          .eq('id', user.id);
        if (error) {
          AppAlert.alert('Erro ao salvar', 'Não foi possível atualizar seu perfil. Tente novamente.');
          return;
        }
      }
      setPerfil({
        nomeCompleto: nome || undefined,
        cpf: perfil?.cpf || undefined,
      });
      AppAlert.alert('Salvo', 'Seu perfil foi atualizado.');
      navigation.goBack();
    };

    salvar();
  };

  const handleCpfChange = (text) => {
    setCpfDisplay(maskCpfInput(text));
  };

  const handleResetPassword = async () => {
    if (!user?.email) {
      AppAlert.alert('Não foi possível', 'Não encontramos um e-mail vinculado à sua conta.');
      return;
    }
    const { error } = await sendPasswordResetCode(user.email);
    if (error) {
      AppAlert.alert('Erro', error.message || 'Não foi possível enviar o código.');
      return;
    }
    navigation.navigate('ResetPasswordCode', { email: user.email });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Meu perfil</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl * 2 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hint}>
          Esses dados identificam você no app. O CPF vem do cadastro e não pode ser alterado aqui.
        </Text>
        <Text style={styles.label}>Nome completo</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Maria Silva Santos"
          placeholderTextColor={colors.textMuted}
          value={nomeCompleto}
          onChangeText={setNomeCompleto}
        />
        <Text style={styles.label}>CPF</Text>
        <TextInput
          style={[styles.input, styles.inputReadOnly]}
          placeholder="000.000.000-00"
          placeholderTextColor={colors.textMuted}
          value={cpfDisplay}
          editable={false}
          selectTextOnFocus={false}
          keyboardType="numeric"
          maxLength={14}
        />
        <TouchableOpacity style={styles.btn} onPress={handleSalvar}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
          <Text style={styles.btnText}>Salvar perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleResetPassword}>
          <Ionicons name="key-outline" size={22} color="#fff" />
          <Text style={styles.btnText}>Redefinir senha</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
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
  inputReadOnly: {
    opacity: 0.9,
    color: colors.textMuted,
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
  btnSecondary: {
    marginTop: spacing.md,
    backgroundColor: colors.secondary,
  },
  btnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
