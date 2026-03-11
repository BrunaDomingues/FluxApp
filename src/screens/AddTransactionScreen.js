import React, { useState, useEffect } from 'react';
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
import { formatBRL, parseToRaw, rawToNumber, numberToRaw } from '../utils/currency';
import { ICONE_PADRAO } from '../constants/categorias';

export default function AddTransactionScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { categorias, contas, cartoes, addTransacao, updateTransacao, transacoes } = useApp();
  const editar = route?.params?.editar;
  const isEditMode = !!editar;

  const tipo = isEditMode
    ? (editar.descricao && editar.descricao.includes('Transferência') ? 'transferencia' : editar.tipo === 'entrada' ? 'entrada' : 'saida')
    : (route?.params?.tipo || 'saida');
  const isCartao = isEditMode ? editar.tipo === 'despesa_cartao' : route?.params?.despesaCartao === true;
  const isTransferencia = tipo === 'transferencia';

  const [valor, setValor] = useState('');
  const [categoriaId, setCategoriaId] = useState(route?.params?.categoriaId ?? null);
  const [contaId, setContaId] = useState(route?.params?.contaId || contas[0]?.id || null);
  const [contaDestinoId, setContaDestinoId] = useState(contas[1]?.id || null);
  const [cartaoId, setCartaoId] = useState(route?.params?.cartaoId || cartoes[0]?.id || null);
  const [descricao, setDescricao] = useState('');
  const [modalCategoriaVisible, setModalCategoriaVisible] = useState(false);

  const contasVisiveis = contas.filter((c) => !c.arquivada);
  const categoriasFiltradas = isTransferencia ? [] : categorias.filter((c) => c.tipo === tipo);
  const valorNum = rawToNumber(valor);

  // Garantir conta válida para receita/despesa quando há contas visíveis
  useEffect(() => {
    if (isCartao || isTransferencia) return;
    if (contasVisiveis.length > 0 && (!contaId || !contasVisiveis.some((c) => c.id === contaId))) {
      setContaId(contasVisiveis[0].id);
    }
  }, [contasVisiveis.length, isCartao, isTransferencia]);

  useEffect(() => {
    if (isTransferencia && contasVisiveis.length >= 2 && contaId === contaDestinoId) {
      const outra = contasVisiveis.find((c) => c.id !== contaId);
      if (outra) setContaDestinoId(outra.id);
    }
  }, [contaId, isTransferencia, contasVisiveis.length]);

  useEffect(() => {
    if (!editar) return;
    setValor(numberToRaw(Math.abs(editar.valor || 0)));
    setDescricao(editar.descricao || '');
    setCategoriaId(editar.categoriaId || null);
    setContaId(editar.contaId || contas[0]?.id || null);
    setCartaoId(editar.cartaoId || cartoes[0]?.id || null);
    if (editar.transferenciaId) {
      const outro = transacoes.find((x) => x.transferenciaId === editar.transferenciaId && x.id !== editar.id);
      if (editar.descricao === 'Transferência enviada') {
        setContaDestinoId(outro?.contaId || contas[1]?.id || null);
      } else {
        setContaId(outro?.contaId || contas[0]?.id || null);
        setContaDestinoId(editar.contaId || null);
      }
    } else {
      setContaDestinoId(contasVisiveis[1]?.id || contas[1]?.id || null);
    }
  }, [editar?.id]);

  const handleSalvar = () => {
    if (valorNum <= 0) {
      Alert.alert('Atenção', 'Informe o valor.');
      return;
    }
    if (!isCartao && !isTransferencia && !contaId) {
      Alert.alert('Atenção', 'Selecione uma conta para abater ou somar o valor.');
      return;
    }
    if (isEditMode) {
      if (isTransferencia) {
        updateTransacao(editar.id, {
          valor: valorNum,
          contaId,
          contaDestinoId: contaDestinoId || contas.find((c) => c.id !== contaId)?.id,
        });
      } else {
        if (!categoriaId) {
          Alert.alert('Atenção', 'Selecione uma categoria.');
          return;
        }
        const cat = categorias.find((c) => c.id === categoriaId);
        updateTransacao(editar.id, {
          valor: tipo === 'entrada' ? valorNum : -valorNum,
          categoriaId: categoriaId || undefined,
          categoriaNome: cat?.nome,
          contaId: isCartao ? undefined : contaId,
          cartaoId: isCartao ? cartaoId : undefined,
          descricao: descricao.trim() || undefined,
        });
      }
      navigation.goBack();
      return;
    }
    if (isTransferencia) {
      if (contasVisiveis.length < 2) {
        Alert.alert('Atenção', 'Cadastre pelo menos duas contas para transferir.');
        return;
      }
      const contaOrigemId = contaId;
      const destId = contaDestinoId || contasVisiveis.find((c) => c.id !== contaOrigemId)?.id;
      if (!destId || destId === contaOrigemId) {
        Alert.alert('Atenção', 'Selecione contas diferentes.');
        return;
      }
      const transferenciaId = Date.now().toString() + '_' + Math.random().toString(36).slice(2);
      addTransacao({ tipo: 'saida', valor: -valorNum, contaId: contaOrigemId, descricao: 'Transferência enviada', transferenciaId });
      addTransacao({ tipo: 'entrada', valor: valorNum, contaId: destId, descricao: 'Transferência recebida', transferenciaId });
      navigation.goBack();
      return;
    }
    if (!categoriaId) {
      Alert.alert('Atenção', 'Selecione uma categoria.');
      return;
    }
    const cat = categorias.find((c) => c.id === categoriaId);
    addTransacao({
      tipo: isCartao ? 'despesa_cartao' : tipo === 'entrada' ? 'entrada' : 'saida',
      valor: tipo === 'entrada' ? valorNum : -valorNum,
      categoriaId,
      categoriaNome: cat?.nome,
      contaId: isCartao ? undefined : contaId,
      cartaoId: isCartao ? cartaoId : undefined,
      descricao: descricao.trim() || undefined,
    });
    navigation.goBack();
  };

  const title = isEditMode
    ? (isTransferencia ? 'Editar transferência' : tipo === 'entrada' ? 'Editar entrada' : isCartao ? 'Editar despesa no cartão' : 'Editar despesa')
    : (isTransferencia ? 'Transferência' : tipo === 'entrada' ? 'Nova entrada' : isCartao ? 'Despesa no cartão' : 'Nova despesa');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Valor (R$)</Text>
        <TextInput
          style={styles.input}
          placeholder="R$ 0,00"
          placeholderTextColor={colors.textMuted}
          value={valor === '' ? '' : formatBRL(valor)}
          onChangeText={(text) => setValor(parseToRaw(text))}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Descrição (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Almoço, Uber"
          placeholderTextColor={colors.textMuted}
          value={descricao}
          onChangeText={setDescricao}
        />
        {isTransferencia && contasVisiveis.length >= 2 && (
          <>
            <Text style={styles.label}>Conta de origem</Text>
            <View style={styles.optionsRow}>
              {contasVisiveis.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.optionChip, contaId === c.id && styles.optionChipActive]}
                  onPress={() => setContaId(c.id)}
                >
                  <Text style={[styles.optionChipText, contaId === c.id && styles.optionChipTextActive]}>{c.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Conta de destino</Text>
            <View style={styles.optionsRow}>
              {contasVisiveis.filter((c) => c.id !== contaId).map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.optionChip, contaDestinoId === c.id && styles.optionChipActive]}
                  onPress={() => setContaDestinoId(c.id)}
                >
                  <Text style={[styles.optionChipText, contaDestinoId === c.id && styles.optionChipTextActive]}>{c.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        {!isCartao && !isTransferencia && contasVisiveis.length > 0 && (
          <>
            <Text style={styles.label}>Conta</Text>
            <View style={styles.optionsRow}>
              {contasVisiveis.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.optionChip, contaId === c.id && styles.optionChipActive]}
                  onPress={() => setContaId(c.id)}
                >
                  <Text style={[styles.optionChipText, contaId === c.id && styles.optionChipTextActive]}>{c.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        {isCartao && cartoes.length > 0 && (
          <>
            <Text style={styles.label}>Cartão</Text>
            <View style={styles.optionsRow}>
              {cartoes.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.optionChip, cartaoId === c.id && styles.optionChipActive]}
                  onPress={() => setCartaoId(c.id)}
                >
                  <Text style={[styles.optionChipText, cartaoId === c.id && styles.optionChipTextActive]}>{c.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        {!isTransferencia && (
        <>
        <Text style={styles.label}>Categoria</Text>
        <TouchableOpacity
          style={styles.selectCategoria}
          onPress={() => setModalCategoriaVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={categoriaId ? (categorias.find((c) => c.id === categoriaId)?.icon || ICONE_PADRAO) : 'pricetag-outline'}
            size={20}
            color={categoriaId ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.selectCategoriaText, !categoriaId && styles.selectCategoriaPlaceholder]}>
            {categoriaId ? categorias.find((c) => c.id === categoriaId)?.nome : 'Selecionar categoria'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <Modal visible={modalCategoriaVisible} transparent animationType="fade">
          <Pressable style={styles.modalBackdrop} onPress={() => setModalCategoriaVisible(false)}>
            <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Selecionar categoria</Text>
              <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent} keyboardShouldPersistTaps="handled">
                {categoriasFiltradas.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.modalOption, categoriaId === c.id && styles.modalOptionActive]}
                    onPress={() => {
                      setCategoriaId(c.id);
                      setModalCategoriaVisible(false);
                    }}
                  >
                    <Ionicons
                      name={c.icon || ICONE_PADRAO}
                      size={20}
                      color={categoriaId === c.id ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.modalOptionText, categoriaId === c.id && styles.modalOptionTextActive]}>
                      {c.nome}
                    </Text>
                    {categoriaId === c.id ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalCategoriaVisible(false)}>
                <Text style={styles.modalCancelText}>Fechar</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
        </>
        )}
        <TouchableOpacity style={styles.button} onPress={handleSalvar}>
          <Text style={styles.buttonText}>Salvar</Text>
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
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  label: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.full,
  },
  optionChipActive: { backgroundColor: colors.primary },
  optionChipText: { fontSize: 14, color: colors.textSecondary },
  optionChipTextActive: { color: colors.textPrimary, fontWeight: '600' },
  selectCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  selectCategoriaText: { flex: 1, fontSize: 16, color: colors.textPrimary },
  selectCategoriaPlaceholder: { color: colors.textMuted },
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
  modalListContent: { paddingBottom: spacing.md },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  modalOptionActive: {
    backgroundColor: colors.primary + '25',
  },
  modalOptionText: { flex: 1, fontSize: 16, color: colors.textPrimary },
  modalOptionTextActive: { fontWeight: '600', color: colors.primary },
  modalCancel: {
    marginTop: spacing.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 16, color: colors.textMuted, fontWeight: '600' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
});
