import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';

export default function AddCardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { addCartao } = useApp();
  const [nome, setNome] = useState('');
  const [limite, setLimite] = useState('');

  const limiteNum = parseFloat((limite || '0').replace(',', '.')) || 0;

  const handleSalvar = () => {
    const n = (nome || '').trim();
    if (!n) {
      Alert.alert('Atenção', 'Informe o nome do cartão.');
      return;
    }
    addCartao({ nome: n, limite: limiteNum });
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Novo cartão</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nome do cartão</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Nubank, Itaú"
          placeholderTextColor={colors.textMuted}
          value={nome}
          onChangeText={setNome}
        />
        <Text style={styles.label}>Limite (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="0,00"
          placeholderTextColor={colors.textMuted}
          value={limite}
          onChangeText={setLimite}
          keyboardType="decimal-pad"
        />
        <TouchableOpacity style={styles.button} onPress={handleSalvar}>
          <Text style={styles.buttonText}>Salvar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.lg,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
