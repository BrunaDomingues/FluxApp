import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { maskCpfInput, normalizeCpf } from '../utils/dateMask';
import { AppAlert } from '../components/AppAlert';
import { validateEmail, validateCpf } from '../utils/authValidation';

export default function UsuariosScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { usuarios, addUser, updateUser, removeUser, refreshLinkedUsers } = useApp();
  const { user, createPendingUser, unlinkUser, checkCpfExists, linkExistingUserByCpf } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [editarId, setEditarId] = useState(null);
  const [nomeInput, setNomeInput] = useState('');
  const [cpfInput, setCpfInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [conviteEnviado, setConviteEnviado] = useState(false);

  const listaParaDividir = (usuarios || []).filter(
    (u) => !u.principal && u.id !== user?.id
  );
  const usuariosOrdenados = [...listaParaDividir].sort((a, b) =>
    (a.nome || '').localeCompare(b.nome || '')
  );

  const editarUsuario = editarId ? listaParaDividir.find((u) => u.id === editarId) : null;

  const handleAbrirAdd = () => {
    setEditarId(null);
    setNomeInput('');
    setCpfInput('');
    setEmailInput('');
    setConviteEnviado(false);
    setModalVisible(true);
  };

  const handleAbrirEdit = (u) => {
    setEditarId(u.id);
    setNomeInput(u.nome || '');
    setCpfInput(u.cpf ? maskCpfInput(u.cpf) : '');
    setEmailInput(u.email || '');
    setConviteEnviado(false);
    setModalVisible(true);
  };

  const handleSalvar = async () => {
    const nome = nomeInput.trim();
    if (!nome) {
      AppAlert.alert('Atenção', 'Informe o nome.');
      return;
    }
    const cpfDigits = (cpfInput || '').replace(/\D/g, '').slice(0, 11);
    const email = emailInput.trim() || undefined;
    if (editarId) {
      updateUser(editarId, { nome, cpf: cpfDigits || undefined, email });
      setModalVisible(false);
      return;
    }
    if (cpfDigits.length === 11) {
      const cpfResult = validateCpf(cpfInput);
      if (!cpfResult.ok) {
        AppAlert.alert('CPF inválido', cpfResult.error);
        return;
      }
      const { exists } = await checkCpfExists(cpfDigits);
      if (exists) {
        const { data, error } = await linkExistingUserByCpf(cpfDigits);
        if (error) {
          AppAlert.alert('Erro ao vincular', error);
          return;
        }
        refreshLinkedUsers?.();
        setModalVisible(false);
        AppAlert.alert(
          'Conta vinculada',
          `${data?.nome || 'A pessoa'} já tem conta no app e foi vinculado(a) para dividir despesas.`
        );
        return;
      }
    }
    addUser(nome, cpfDigits || undefined, email);
    setModalVisible(false);
  };

  const handleEnviarConvite = async () => {
    const nome = nomeInput.trim();
    const cpfDigits = normalizeCpf(cpfInput);
    const e = emailInput.trim();
    if (!nome) {
      AppAlert.alert('Atenção', 'Informe o nome.');
      return;
    }
    const cpfResult = validateCpf(cpfInput);
    if (!cpfResult.ok) {
      AppAlert.alert('CPF inválido', cpfResult.error);
      return;
    }
    if (!e) {
      AppAlert.alert('Atenção', 'Informe o e-mail para enviar o convite.');
      return;
    }
    if (!validateEmail(e)) {
      AppAlert.alert('E-mail inválido', 'Digite um e-mail válido.');
      return;
    }
    const { error } = await createPendingUser(e, cpfDigits, nome);
    if (error) {
      AppAlert.alert('Erro', error);
      return;
    }
    setConviteEnviado(true);
    AppAlert.alert('Convite enviado', 'A pessoa pode abrir o app, ir em Criar conta e informar este e-mail e CPF. Em seguida só precisará criar a senha.');
  };

  const handleDesvincular = (u) => {
    AppAlert.alert(
      'Desvincular conta',
      `Desvincular de "${u.nome}"? A pessoa deixa de aparecer como conta vinculada, mas continua na lista para dividir despesas e o histórico de despesas entre vocês é mantido (com o nome dela).`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desvincular', onPress: async () => {
          const { error } = await unlinkUser(u.id);
          if (error) AppAlert.alert('Erro', error);
          else refreshLinkedUsers?.();
        } },
      ]
    );
  };

  const handleExcluir = (u) => {
    AppAlert.alert(
      'Excluir usuário',
      u.linked
        ? `Para remover "${u.nome}" da lista, primeiro desvincule. Depois pode excluir. O histórico de despesas mantém o nome.`
        : `Excluir "${u.nome}" da lista? As despesas já divididas continuam; o nome dessa pessoa segue aparecendo nelas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        ...(u.linked ? [] : [{ text: 'Excluir', style: 'destructive', onPress: () => removeUser(u.id) }]),
      ]
    );
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
          Você é sempre o principal (Meu perfil). Adicione aqui só as pessoas com quem divide despesas.
        </Text>
        {usuariosOrdenados.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Ninguém na lista ainda</Text>
            <Text style={styles.emptySub}>Toque em Adicionar usuário para incluir quem divide despesas com você.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {usuariosOrdenados.map((u) => (
              <View key={u.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={22} color={colors.textMuted} />
                  </View>
                  <View style={styles.rowLeftText}>
                    <Text style={styles.nome}>{u.nome || 'Sem nome'}</Text>
                    {u.linked ? (
                      <Text style={styles.vinculadoBadge}>Conta vinculada</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.rowActions}>
                  {u.linked ? (
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleDesvincular(u)}>
                      <Ionicons name="link-outline" size={20} color={colors.secondary} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleAbrirEdit(u)}>
                      <Ionicons name="pencil-outline" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleExcluir(u)}>
                    <Ionicons name="trash-outline" size={20} color={colors.spending} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity style={styles.addBtn} onPress={handleAbrirAdd}>
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          <Text style={styles.addBtnText}>Adicionar usuário</Text>
        </TouchableOpacity>
        {listaParaDividir.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.cobrancaBtn}
              onPress={() => navigation.navigate('CobrancaUsuario')}
            >
              <Ionicons name="image-outline" size={24} color={colors.secondary} />
              <Text style={styles.cobrancaBtnText}>Gerar imagem de cobrança</Text>
              <Text style={styles.cobrancaBtnSub}>Enviar resumo para alguém cobrar a parte dele</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.recebimentoBtn}
              onPress={() => navigation.navigate('CobrancaUsuario', { openRecebimento: true })}
            >
              <Ionicons name="cash-outline" size={24} color={colors.positive} />
              <Text style={[styles.cobrancaBtnText, { color: colors.positive }]}>Registrar recebimento</Text>
              <Text style={styles.cobrancaBtnSub}>Dar baixa quando alguém pagar (gera receita)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.despesasQueDevoBtn}
              onPress={() => navigation.navigate('DespesasCompartilhadasPendentes')}
            >
              <Ionicons name="card-outline" size={24} color={colors.spending} />
              <Text style={[styles.cobrancaBtnText, { color: colors.spending }]}>Despesas que devo</Text>
              <Text style={styles.cobrancaBtnSub}>Sua parte de despesas compartilhadas e marcar como pago</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pagamentosSinalizadosBtn}
              onPress={() => navigation.navigate('PagamentosSinalizados')}
            >
              <Ionicons name="checkmark-done-outline" size={24} color={colors.positive} />
              <Text style={[styles.cobrancaBtnText, { color: colors.positive }]}>Pagamentos sinalizados</Text>
              <Text style={styles.cobrancaBtnSub}>Alguém marcou que te pagou — confirmar e levar para sua conta</Text>
            </TouchableOpacity>
          </>
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
            <Text style={styles.label}>CPF (para validar cobrança no app dessa pessoa)</Text>
            <TextInput
              style={styles.input}
              placeholder="000.000.000-00"
              placeholderTextColor={colors.textMuted}
              value={cpfInput}
              onChangeText={(t) => setCpfInput(maskCpfInput(t))}
              keyboardType="numeric"
              maxLength={14}
            />
            <Text style={styles.label}>E-mail (opcional – para convidar a criar conta no app)</Text>
            <TextInput
              style={styles.input}
              placeholder="email@exemplo.com"
              placeholderTextColor={colors.textMuted}
              value={emailInput}
              onChangeText={setEmailInput}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {emailInput.trim() ? (
              <TouchableOpacity
                style={[styles.conviteBtn, conviteEnviado && styles.conviteBtnDone]}
                onPress={handleEnviarConvite}
                disabled={conviteEnviado}
              >
                <Ionicons name={conviteEnviado ? 'checkmark-circle' : 'mail-outline'} size={20} color="#fff" />
                <Text style={styles.conviteBtnText}>{conviteEnviado ? 'Convite enviado' : 'Enviar convite'}</Text>
              </TouchableOpacity>
            ) : null}
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
  vinculadoBadge: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
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
  recebimentoBtn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: spacing.sm,
  },
  despesasQueDevoBtn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: spacing.sm,
  },
  pagamentosSinalizadosBtn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: spacing.sm,
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
  perfilHint: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end' },
  conviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  conviteBtnDone: { opacity: 0.8 },
  conviteBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
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
