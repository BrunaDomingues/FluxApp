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
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { bandeirasCartao } from '../constants/bandeiras';
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
  const [tipoCartao, setTipoCartao] = useState('credito');
  const [ativo, setAtivo] = useState(true);
  const [modalBandeiraVisible, setModalBandeiraVisible] = useState(false);
  const [diaFechamento, setDiaFechamento] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('');
  const [modalDiaVisible, setModalDiaVisible] = useState(false);
  const [modalDiaTipo, setModalDiaTipo] = useState(null); // 'fechamento' | 'vencimento'

  const DIAS_OPCOES = Array.from({ length: 31 }, (_, i) => i + 1);

  const parseDia = (v) => {
    const d = parseInt(String(v).replace(/\D/g, ''), 10);
    return d >= 1 && d <= 31 ? d : null;
  };
  const diaFechamentoNum = parseDia(diaFechamento);
  const diaVencimentoNum = parseDia(diaVencimento);

  const limiteNum = rawToNumber(limite);

  useEffect(() => {
    if (editar) {
      setNome(editar.nome || '');
      setLimite(editar.limite != null && editar.limite > 0 ? numberToRaw(editar.limite) : '');
      setBandeira(editar.bandeira || 'Outro Cartão');
      setTipoCartao(editar.tipo === 'debito' ? 'debito' : 'credito');
      setAtivo(editar.ativo !== false);
      setDiaFechamento(editar.diaFechamento != null ? String(editar.diaFechamento) : '');
      setDiaVencimento(editar.diaVencimento != null ? String(editar.diaVencimento) : '');
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
      updateCartao(editar.id, {
        nome: n,
        limite: limiteNum,
        bandeira,
        tipo: tipoCartao,
        ativo,
        diaFechamento: diaFechamentoNum,
        diaVencimento: diaVencimentoNum,
      });
    } else {
      addCartao({
        nome: n,
        limite: limiteNum,
        bandeira,
        tipo: tipoCartao,
        ativo,
        diaFechamento: diaFechamentoNum,
        diaVencimento: diaVencimentoNum,
      });
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
            <TouchableOpacity
              style={styles.bandeiraSelect}
              onPress={() => setModalBandeiraVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="card-outline" size={20} color={colors.textMuted} />
              <Text style={styles.bandeiraText}>{bandeira}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}
        {isEditMode && (
          <>
            <Text style={styles.label}>Bandeira</Text>
            <TouchableOpacity
              style={styles.bandeiraSelect}
              onPress={() => setModalBandeiraVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.bandeiraText}>{bandeira}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}
        <Text style={styles.label}>Tipo do cartão</Text>
        <View style={styles.tipoRow}>
          <TouchableOpacity
            style={[styles.tipoChip, tipoCartao === 'credito' && styles.tipoChipActive]}
            onPress={() => setTipoCartao('credito')}
            activeOpacity={0.7}
          >
            <Ionicons name="card-outline" size={20} color={tipoCartao === 'credito' ? colors.textPrimary : colors.textMuted} />
            <Text style={[styles.tipoChipText, tipoCartao === 'credito' && styles.tipoChipTextActive]}>Crédito</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tipoChip, tipoCartao === 'debito' && styles.tipoChipActive]}
            onPress={() => setTipoCartao('debito')}
            activeOpacity={0.7}
          >
            <Ionicons name="wallet-outline" size={20} color={tipoCartao === 'debito' ? colors.textPrimary : colors.textMuted} />
            <Text style={[styles.tipoChipText, tipoCartao === 'debito' && styles.tipoChipTextActive]}>Débito</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.label}>Limite (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="R$ 0,00"
          placeholderTextColor={colors.textMuted}
          value={limite === '' ? '' : formatBRL(limite)}
          onChangeText={(text) => setLimite(parseToRaw(text))}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Dia de fechamento (opcional)</Text>
        <TouchableOpacity
          style={styles.bandeiraSelect}
          onPress={() => { setModalDiaTipo('fechamento'); setModalDiaVisible(true); }}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
          <Text style={[styles.bandeiraText, !diaFechamento && styles.placeholderText]}>
            {diaFechamento ? `Dia ${diaFechamento}` : 'Selecionar dia'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.label}>Dia de vencimento (opcional)</Text>
        <TouchableOpacity
          style={styles.bandeiraSelect}
          onPress={() => { setModalDiaTipo('vencimento'); setModalDiaVisible(true); }}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
          <Text style={[styles.bandeiraText, !diaVencimento && styles.placeholderText]}>
            {diaVencimento ? `Dia ${diaVencimento}` : 'Selecionar dia'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
        </TouchableOpacity>
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

      <Modal visible={modalBandeiraVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalBandeiraVisible(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Selecionar bandeira</Text>
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {bandeirasCartao.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.modalOption, bandeira === b.nome && styles.modalOptionActive]}
                  onPress={() => {
                    setBandeira(b.nome);
                    setModalBandeiraVisible(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, bandeira === b.nome && styles.modalOptionTextActive]}>
                    {b.nome}
                  </Text>
                  {bandeira === b.nome ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setModalBandeiraVisible(false)}
            >
              <Text style={styles.modalCancelText}>Fechar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={modalDiaVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalDiaVisible(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {modalDiaTipo === 'fechamento' ? 'Dia de fechamento' : 'Dia de vencimento'}
            </Text>
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                style={[styles.modalOption, (modalDiaTipo === 'fechamento' ? !diaFechamento : !diaVencimento) && styles.modalOptionActive]}
                onPress={() => {
                  if (modalDiaTipo === 'fechamento') setDiaFechamento('');
                  else setDiaVencimento('');
                  setModalDiaVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, (modalDiaTipo === 'fechamento' ? !diaFechamento : !diaVencimento) && styles.modalOptionTextActive]}>
                  Nenhum
                </Text>
                {(modalDiaTipo === 'fechamento' ? !diaFechamento : !diaVencimento) ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : null}
              </TouchableOpacity>
              {DIAS_OPCOES.map((d) => {
                const valor = String(d);
                const selecionado = modalDiaTipo === 'fechamento'
                  ? diaFechamento === valor
                  : diaVencimento === valor;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.modalOption, selecionado && styles.modalOptionActive]}
                    onPress={() => {
                      if (modalDiaTipo === 'fechamento') setDiaFechamento(valor);
                      else setDiaVencimento(valor);
                      setModalDiaVisible(false);
                    }}
                  >
                    <Text style={[styles.modalOptionText, selecionado && styles.modalOptionTextActive]}>
                      Dia {d}
                    </Text>
                    {selecionado ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setModalDiaVisible(false)}
            >
              <Text style={styles.modalCancelText}>Fechar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  bandeiraSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bandeiraText: { flex: 1, fontSize: 16, color: colors.textPrimary },
  placeholderText: { color: colors.textMuted },
  tipoRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  tipoChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
  },
  tipoChipActive: { backgroundColor: colors.primary },
  tipoChipText: { fontSize: 15, color: colors.textMuted, fontWeight: '500' },
  tipoChipTextActive: { color: colors.textPrimary, fontWeight: '600' },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.backgroundCard,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  modalList: { maxHeight: 320 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  modalOptionActive: {
    backgroundColor: colors.primary + '25',
  },
  modalOptionText: { fontSize: 16, color: colors.textPrimary },
  modalOptionTextActive: { fontWeight: '600', color: colors.primary },
  modalCancel: {
    marginTop: spacing.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 16, color: colors.textMuted, fontWeight: '600' },
});
