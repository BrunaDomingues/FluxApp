import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { AppAlert } from '../components/AppAlert';
import { ICONE_PADRAO } from '../constants/categorias';

export default function CategoriesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const bottomSafe = insets.bottom || 12;
  const { categorias, addCategoria } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('saida');
  const [aba, setAba] = useState('saida'); // 'saida' = DESPESAS, 'entrada' = RECEITAS

  const handleSalvarCategoria = () => {
    const n = (nome || '').trim();
    if (!n) {
      AppAlert.alert('Atenção', 'Informe o nome da categoria.');
      return;
    }
    addCategoria({ nome: n, tipo });
    setNome('');
    setTipo('saida');
    setModalVisible(false);
  };

  const categoriasFiltradas = categorias.filter((c) => c.tipo === aba);
  const corAba = aba === 'entrada' ? colors.positive : colors.spending;

  const getIcon = (c) => c.icon || ICONE_PADRAO;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: bottomSafe }]}>
      <View style={[styles.header, { backgroundColor: corAba }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Categorias</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="folder-open-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabs, { backgroundColor: corAba }]}>
        <TouchableOpacity
          style={[styles.tab, aba === 'saida' && styles.tabActive]}
          onPress={() => setAba('saida')}
        >
          <Text style={[styles.tabText, aba === 'saida' && styles.tabTextActive]}>DESPESAS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, aba === 'entrada' && styles.tabActiveEntrada]}
          onPress={() => setAba('entrada')}
        >
          <Text style={[styles.tabTextEntrada, aba === 'entrada' && styles.tabTextActiveEntrada]}>RECEITAS</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 80 + bottomSafe }]}
        showsVerticalScrollIndicator={false}
      >
        {categoriasFiltradas.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="pricetag-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              Nenhuma categoria de {aba === 'entrada' ? 'receita' : 'despesa'}.
            </Text>
            <Text style={styles.emptySub}>Toque no + para criar.</Text>
          </View>
        ) : (
          categoriasFiltradas.map((c) => (
            <View key={c.id} style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: corAba + '35' }]}>
                <Ionicons name={getIcon(c)} size={22} color={corAba} />
              </View>
              <Text style={styles.nome}>{c.nome}</Text>
              <TouchableOpacity
                style={styles.addIconBtn}
                onPress={() => navigation.navigate('AddTransaction', { tipo: aba, categoriaId: c.id })}
              >
                <Ionicons name="add" size={22} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreBtn}>
                <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: corAba, bottom: bottomSafe + spacing.xl }]}
        onPress={() => { setTipo(aba); setModalVisible(true); }}
      >
        <Ionicons name="add" size={28} color={colors.textPrimary} />
      </TouchableOpacity>

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
                <Text style={[styles.tipoBtnText, tipo === 'entrada' && styles.tipoBtnTextActive]}>Receitas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tipoBtn, tipo === 'saida' && styles.tipoBtnActiveSaida]}
                onPress={() => setTipo('saida')}
              >
                <Ionicons name="trending-down-outline" size={18} color={tipo === 'saida' ? colors.textPrimary : colors.textMuted} />
                <Text style={[styles.tipoBtnText, tipo === 'saida' && styles.tipoBtnTextActive]}>Despesas</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.button, { backgroundColor: corAba }]} onPress={handleSalvarCategoria}>
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
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  headerIcon: { padding: spacing.xs, marginLeft: spacing.xs },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.textPrimary,
  },
  tabActiveEntrada: {
    backgroundColor: colors.textPrimary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tabTextEntrada: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tabTextActive: {
    color: colors.spending,
  },
  tabTextActiveEntrada: {
    color: colors.positive,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 80,
  },
  scroll: { flex: 1 },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: { fontSize: 16, color: colors.textMuted, marginTop: spacing.md },
  emptySub: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  nome: { flex: 1, fontSize: 16, color: colors.textPrimary, fontWeight: '500' },
  addIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundCardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  moreBtn: { padding: spacing.xs },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl + 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
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
  tipoBtnActive: { backgroundColor: colors.positive },
  tipoBtnActiveSaida: { backgroundColor: colors.spending },
  tipoBtnText: { fontSize: 14, color: colors.textMuted },
  tipoBtnTextActive: { color: colors.textPrimary, fontWeight: '600' },
  button: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
});
