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
import { AppAlert } from '../components/AppAlert';
import { formatBRL, parseToRaw, rawToNumber } from '../utils/currency';

export default function AddFinanciamentoScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const bottomSafe = insets.bottom || 12;
  const { contas, addFinanciamento } = useApp();
  const contasVisiveis = contas.filter((c) => !c.arquivada);

  const [descricao, setDescricao] = useState('');
  const [contaId, setContaId] = useState(null);
  const [totalParcelas, setTotalParcelas] = useState('12');
  const [valorPadrao, setValorPadrao] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [modalConta, setModalConta] = useState(false);

  const valorNum = rawToNumber(valorPadrao);
  const parcelasNum = Math.max(1, parseInt(totalParcelas, 10) || 1);
  const diaNum = Math.min(31, Math.max(1, parseInt(diaVencimento, 10) || 1));

  const handleSalvar = () => {
    const desc = (descricao || '').trim();
    if (!desc) {
      AppAlert.alert('Atenção', 'Informe a descrição do financiamento (ex.: Moto, Carro).');
      return;
    }
    if (valorNum <= 0) {
      AppAlert.alert('Atenção', 'Informe o valor da parcela.');
      return;
    }
    addFinanciamento({
      descricao: desc,
      contaId,
      totalParcelas: parcelasNum,
      valorPadrao: valorNum,
      diaVencimento: diaNum,
    });
    navigation.goBack();
  };

  const contaNome = contaId ? contasVisiveis.find((c) => c.id === contaId)?.nome : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: bottomSafe }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo financiamento</Text>
        <View style={styles.headerRight} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 100 + (insets.bottom || 12) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Moto, Carro, Consórcio"
            placeholderTextColor={colors.textMuted}
            value={descricao}
            onChangeText={setDescricao}
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Conta (opcional)</Text>
          <TouchableOpacity
            style={styles.selectRow}
            onPress={() => setModalConta(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectText, !contaNome && styles.selectPlaceholder]}>
              {contaNome || 'Nenhuma'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Número de parcelas</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: 12"
            placeholderTextColor={colors.textMuted}
            value={totalParcelas}
            onChangeText={setTotalParcelas}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Valor da parcela (padrão)</Text>
          <TextInput
            style={styles.input}
            placeholder="R$ 0,00"
            placeholderTextColor={colors.textMuted}
            value={valorPadrao === '' ? '' : formatBRL(valorPadrao)}
            onChangeText={(t) => setValorPadrao(parseToRaw(t))}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Dia do vencimento (1-31)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: 10"
            placeholderTextColor={colors.textMuted}
            value={diaVencimento}
            onChangeText={setDiaVencimento}
            keyboardType="number-pad"
          />
        </View>
        <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar} activeOpacity={0.8}>
          <Text style={styles.btnSalvarText}>Salvar</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalConta} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalConta(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Selecionar conta</Text>
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => { setContaId(null); setModalConta(false); }}
            >
              <Text style={styles.modalItemText}>Nenhuma</Text>
              {!contaId ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
            </TouchableOpacity>
            {contasVisiveis.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.modalItem}
                onPress={() => { setContaId(c.id); setModalConta(false); }}
              >
                <Text style={styles.modalItemText}>{c.nome}</Text>
                {contaId === c.id ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </TouchableOpacity>
            ))}
          </View>
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
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  headerRight: { width: 40 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  card: { marginBottom: spacing.lg },
  label: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  selectText: { fontSize: 16, color: colors.textPrimary },
  selectPlaceholder: { color: colors.textMuted },
  btnSalvar: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  btnSalvarText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    maxHeight: 400,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, padding: spacing.sm, marginBottom: spacing.xs },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  modalItemText: { fontSize: 16, color: colors.textPrimary },
});
