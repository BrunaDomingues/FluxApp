import React, { useState, useEffect } from 'react';
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
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { formatBRL, parseToRaw, rawToNumber, numberToRaw } from '../utils/currency';

export default function AddCardScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { addCartao, updateCartao, removeCartao } = useApp();
  const editar = route?.params?.editar;
  const bandeiraParam = route?.params?.bandeira;
  const isEditMode = !!editar;

  const [nome, setNome] = useState('');
  const [limite, setLimite] = useState('');
  const [bandeira, setBandeira] = useState('Outro Cartão');
  const [ativo, setAtivo] = useState(true);

  const limiteNum = rawToNumber(limite);

  useEffect(() => {
    if (editar) {
      setNome(editar.nome || '');
      setLimite(editar.limite != null && editar.limite > 0 ? numberToRaw(editar.limite) : '');
      setBandeira(editar.bandeira || 'Outro Cartão');
      setAtivo(editar.ativo !== false);
    } else if (bandeiraParam) {
      setBandeira(bandeiraParam);
    }
  }, [editar?.id, bandeiraParam]);

  const handleSalvar = () => {
    const n = (nome || '').trim();
    if (!n) {
      Alert.alert('Atenção', 'Informe o nome do cartão.');
      return;
    }
    if (isEditMode) {
      updateCartao(editar.id, { nome: n, limite: limiteNum, bandeira, ativo });
    } else {
      addCartao({ nome: n, limite: limiteNum, bandeira, ativo });
    }
    navigation.goBack();
  };

  const handleExcluir = () => {
    Alert.alert(
      'Excluir cartão',
      `Excluir "${nome || editar?.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            removeCartao(editar.id);
            navigation.goBack();
          },
        },
      ]
    );
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
        <Text style={styles.title}>{isEditMode ? 'Editar cartão' : 'Novo cartão'}</Text>
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
        {!isEditMode && (
          <>
            <Text style={styles.label}>Bandeira</Text>
            <View style={styles.bandeiraDisplay}>
              <Ionicons name="card-outline" size={20} color={colors.textMuted} />
              <Text style={styles.bandeiraText}>{bandeira}</Text>
            </View>
          </>
        )}
        {isEditMode && (
          <>
            <Text style={styles.label}>Bandeira</Text>
            <View style={styles.bandeiraDisplay}>
              <Text style={styles.bandeiraText}>{bandeira}</Text>
            </View>
          </>
        )}
        <Text style={styles.label}>Limite (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="R$ 0,00"
          placeholderTextColor={colors.textMuted}
          value={limite === '' ? '' : formatBRL(limite)}
          onChangeText={(text) => setLimite(parseToRaw(text))}
          keyboardType="numeric"
        />
        {isEditMode && (
          <View style={styles.ativoRow}>
            <Text style={styles.label}>Cartão ativo</Text>
            <Switch
              value={ativo}
              onValueChange={setAtivo}
              trackColor={{ false: colors.backgroundCardElevated, true: colors.secondary + '99' }}
              thumbColor={ativo ? colors.secondary : colors.textMuted}
            />
          </View>
        )}
        <TouchableOpacity style={styles.button} onPress={handleSalvar}>
          <Text style={styles.buttonText}>{isEditMode ? 'Salvar' : 'Salvar'}</Text>
        </TouchableOpacity>
        {isEditMode && (
          <TouchableOpacity style={styles.excluirBtn} onPress={handleExcluir}>
            <Ionicons name="trash-outline" size={20} color={colors.spending} />
            <Text style={styles.excluirText}>Excluir cartão</Text>
          </TouchableOpacity>
        )}
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
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
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
  bandeiraDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bandeiraText: { fontSize: 16, color: colors.textPrimary },
  ativoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  excluirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  excluirText: { fontSize: 14, color: colors.spending, fontWeight: '600' },
});
