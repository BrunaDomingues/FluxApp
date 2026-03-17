import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { maskCpfInput, normalizeCpf } from '../utils/dateMask';

export default function PerfilScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { perfil, setPerfil } = useApp();
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [cpfDisplay, setCpfDisplay] = useState('');

  useEffect(() => {
    if (perfil) {
      setNomeCompleto(perfil.nomeCompleto || '');
      setCpfDisplay(perfil.cpf ? maskCpfInput(perfil.cpf) : '');
    }
  }, [perfil]);

  const handleSalvar = () => {
    const nome = nomeCompleto.trim();
    const cpfDigits = normalizeCpf(cpfDisplay);
    if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
      Alert.alert('CPF inválido', 'O CPF deve ter 11 dígitos.');
      return;
    }
    setPerfil({
      nomeCompleto: nome || undefined,
      cpf: cpfDigits || undefined,
    });
    Alert.alert('Salvo', 'Seu perfil foi atualizado. O CPF será usado para validar cobranças recebidas.');
    navigation.goBack();
  };

  const handleCpfChange = (text) => {
    setCpfDisplay(maskCpfInput(text));
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
          Esses dados identificam você no app. O CPF é usado para garantir que cobranças compartilhadas com você sejam importadas apenas no seu aparelho (quando o CPF do destinatário da cobrança for o mesmo do seu perfil).
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
          style={styles.input}
          placeholder="000.000.000-00"
          placeholderTextColor={colors.textMuted}
          value={cpfDisplay}
          onChangeText={handleCpfChange}
          keyboardType="numeric"
          maxLength={14}
        />
        <TouchableOpacity style={styles.btn} onPress={handleSalvar}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
          <Text style={styles.btnText}>Salvar perfil</Text>
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
  btnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
