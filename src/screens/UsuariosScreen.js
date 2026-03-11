import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';

export default function UsuariosScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { usuarios, addUser, updateUser, removeUser, setPrincipalUser, getPrincipalUserId } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [editarId, setEditarId] = useState(null);
  const [nomeInput, setNomeInput] = useState('');

  const principalId = getPrincipalUserId();
  const usuariosOrdenados = [...(usuarios || [])].sort((a, b) => {
    if (a.principal) return -1;
    if (b.principal) return 1;
    return (a.nome || '').localeCompare(b.nome || '');
  });

  const handleAbrirAdd = () => {
    setEditarId(null);
    setNomeInput('');
    setModalVisible(true);
  };

  const handleAbrirEdit = (u) => {
    setEditarId(u.id);
    setNomeInput(u.nome || '');
    setModalVisible(true);
  };

  const handleSalvar = () => {
    const nome = nomeInput.trim();
    if (!nome) {
      Alert.alert('Atenção', 'Informe o nome.');
      return;
    }
    if (editarId) {
      updateUser(editarId, { nome });
    } else {
      addUser(nome);
    }
    setModalVisible(false);
  };

  const handleExcluir = (u) => {
    if (u.principal) {
      Alert.alert('Atenção', 'Não é possível excluir o usuário principal.');
      return;
    }
    Alert.alert(
      'Excluir usuário',
      `Excluir "${u.nome}"? As divisões de despesas que incluíam essa pessoa continuarão com os outros participantes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => removeUser(u.id) },
      ]
    );
  };

  const handleDefinirPrincipal = (u) => {
    if (u.principal) return;
    setPrincipalUser(u.id);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Usuários</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl * 2 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Use para dividir despesas em grupo. O usuário principal é você; os outros podem receber um resumo de cobrança.
        </Text>
        {(usuarios || []).length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhum usuário cadastrado.</Text>
            <Text style={styles.emptySub}>Adicione você como principal e depois as pessoas com quem divide despesas.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {usuariosOrdenados.map((u) => (
              <View key={u.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.avatar, u.principal && styles.avatarPrincipal]}>
                    <Ionicons name="person" size={22} color={u.principal ? colors.primary : colors.textMuted} />
                  </View>
                  <View style={styles.rowLeftText}>
                    <Text style={styles.nome}>{u.nome || 'Sem nome'}</Text>
                    {u.principal && (
                      <Text style={styles.badgePrincipal}>Principal (você)</Text>
                    )}
                    {!u.principal && (
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleDefinirPrincipal(u)}
                      >
                        <Ionicons name="star-outline" size={16} color={colors.textMuted} />
                        <Text style={styles.actionBtnText}>Definir como principal</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={styles.rowActions}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleAbrirEdit(u)}>
                    <Ionicons name="pencil-outline" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                  {!u.principal && (
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleExcluir(u)}>
                      <Ionicons name="trash-outline" size={20} color={colors.spending} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity style={styles.addBtn} onPress={handleAbrirAdd}>
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          <Text style={styles.addBtnText}>Adicionar usuário</Text>
        </TouchableOpacity>
        {(usuarios || []).length > 0 && (
          <TouchableOpacity
            style={styles.cobrancaBtn}
            onPress={() => navigation.navigate('CobrancaUsuario')}
          >
            <Ionicons name="image-outline" size={24} color={colors.secondary} />
            <Text style={styles.cobrancaBtnText}>Gerar imagem de cobrança</Text>
            <Text style={styles.cobrancaBtnSub}>Enviar resumo para alguém cobrar a parte dele</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{editarId ? 'Editar usuário' : 'Novo usuário'}</Text>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Maria, Colega de república"
              placeholderTextColor={colors.textMuted}
              value={nomeInput}
              onChangeText={setNomeInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalOkBtn} onPress={handleSalvar}>
                <Text style={styles.modalOkText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: { fontSize: 16, color: colors.textMuted, marginTop: spacing.md },
  emptySub: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowLeftText: { flex: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundCardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarPrincipal: { backgroundColor: colors.primary + '30' },
  nome: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  badgePrincipal: { fontSize: 12, color: colors.primary, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  actionBtnText: { fontSize: 12, color: colors.textMuted },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { padding: spacing.xs },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  addBtnText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  cobrancaBtn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cobrancaBtnText: { fontSize: 16, fontWeight: '600', color: colors.secondary, flex: 1 },
  cobrancaBtnSub: { fontSize: 12, color: colors.textMuted, width: '100%', marginLeft: 32 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  label: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end' },
  modalCancelBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  modalCancelText: { fontSize: 16, color: colors.textMuted },
  modalOkBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  modalOkText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
});
