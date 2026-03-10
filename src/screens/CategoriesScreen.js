import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';

export default function CategoriesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { categorias, addCategoria } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('saida');

  const handleSalvarCategoria = () => {
    const n = (nome || '').trim();
    if (!n) {
      Alert.alert('Atenção', 'Informe o nome da categoria.');
      return;
    }
    addCategoria({ nome: n, tipo });
    setNome('');
    setTipo('saida');
    setModalVisible(false);
  };

  const categoriasEntrada = categorias.filter((c) => c.tipo === 'entrada');
  const categoriasSaida = categorias.filter((c) => c.tipo === 'saida');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Categorias</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Entrada</Text>
        {categoriasEntrada.length === 0 ? (
          <Text style={styles.empty}>Nenhuma categoria de entrada.</Text>
        ) : (
          categoriasEntrada.map((c) => (
            <View key={c.id} style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: colors.positive + '30' }]}>
                <Ionicons name="trending-up-outline" size={20} color={colors.positive} />
              </View>
              <Text style={styles.nome}>{c.nome}</Text>
            </View>
          ))
        )}
        <Text style={styles.sectionTitle}>Saída</Text>
        {categoriasSaida.length === 0 ? (
          <Text style={styles.empty}>Nenhuma categoria de saída.</Text>
        ) : (
          categoriasSaida.map((c) => (
            <View key={c.id} style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: colors.spending + '30' }]}>
                <Ionicons name="trending-down-outline" size={20} color={colors.spending} />
              </View>
              <Text style={styles.nome}>{c.nome}</Text>
            </View>
          ))
        )}
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={() => navigation.navigate('AddTransaction', { tipo: 'entrada' })}
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.buttonSecondaryText}>Cadastrar entrada</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={() => navigation.navigate('AddTransaction', { tipo: 'saida' })}
        >
          <Ionicons name="remove-circle-outline" size={22} color={colors.spending} />
          <Text style={styles.buttonSecondaryText}>Cadastrar despesa</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Nova categoria</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome da categoria"
              placeholderTextColor={colors.textMuted}
              value={nome}
              onChangeText={setNome}
            />
            <Text style={styles.label}>Tipo</Text>
            <View style={styles.tipoRow}>
              <TouchableOpacity
                style={[styles.tipoBtn, tipo === 'entrada' && styles.tipoBtnActive]}
                onPress={() => setTipo('entrada')}
              >
                <Ionicons name="trending-up-outline" size={18} color={tipo === 'entrada' ? colors.textPrimary : colors.textMuted} />
                <Text style={[styles.tipoBtnText, tipo === 'entrada' && styles.tipoBtnTextActive]}>Entrada</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tipoBtn, tipo === 'saida' && styles.tipoBtnActive]}
                onPress={() => setTipo('saida')}
              >
                <Ionicons name="trending-down-outline" size={18} color={tipo === 'saida' ? colors.textPrimary : colors.textMuted} />
                <Text style={[styles.tipoBtnText, tipo === 'saida' && styles.tipoBtnTextActive]}>Saída</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleSalvarCategoria}>
              <Text style={styles.buttonText}>Salvar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  addBtn: { padding: spacing.xs },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  empty: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  nome: { fontSize: 16, color: colors.textPrimary, fontWeight: '500' },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  buttonSecondaryText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg },
  label: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  tipoRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  tipoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  tipoBtnActive: { backgroundColor: colors.primary },
  tipoBtnText: { fontSize: 14, color: colors.textMuted },
  tipoBtnTextActive: { color: colors.textPrimary, fontWeight: '600' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
});
