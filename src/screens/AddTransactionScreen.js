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
  const [categoriaId, setCategoriaId] = useState(null);
  const [contaId, setContaId] = useState(contas[0]?.id || null);
  const [contaDestinoId, setContaDestinoId] = useState(contas[1]?.id || null);
  const [cartaoId, setCartaoId] = useState(cartoes[0]?.id || null);
  const [descricao, setDescricao] = useState('');

  const categoriasFiltradas = isTransferencia ? [] : categorias.filter((c) => c.tipo === tipo);
  const valorNum = rawToNumber(valor);

  useEffect(() => {
    if (isTransferencia && contas.length >= 2 && contaId === contaDestinoId) {
      const outra = contas.find((c) => c.id !== contaId);
      if (outra) setContaDestinoId(outra.id);
    }
  }, [contaId, isTransferencia, contas.length]);

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
      setContaDestinoId(contas[1]?.id || null);
    }
  }, [editar?.id]);

  const handleSalvar = () => {
    if (valorNum <= 0) {
      Alert.alert('Atenção', 'Informe o valor.');
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
      if (contas.length < 2) {
        Alert.alert('Atenção', 'Cadastre pelo menos duas contas para transferir.');
        return;
      }
      const contaOrigemId = contaId;
      const destId = contaDestinoId || contas.find((c) => c.id !== contaOrigemId)?.id;
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
        {isTransferencia && contas.length >= 2 && (
          <>
            <Text style={styles.label}>Conta de origem</Text>
            <View style={styles.optionsRow}>
              {contas.map((c) => (
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
              {contas.filter((c) => c.id !== contaId).map((c) => (
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
        {!isCartao && !isTransferencia && contas.length > 1 && (
          <>
            <Text style={styles.label}>Conta</Text>
            <View style={styles.optionsRow}>
              {contas.map((c) => (
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
        <View style={styles.catList}>
          {categoriasFiltradas.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.catRow, categoriaId === c.id && styles.catRowActive]}
              onPress={() => setCategoriaId(c.id)}
            >
              <Ionicons
                name={c.tipo === 'entrada' ? 'trending-up-outline' : 'trending-down-outline'}
                size={20}
                color={categoriaId === c.id ? colors.textPrimary : colors.textMuted}
              />
              <Text style={[styles.catNome, categoriaId === c.id && styles.catNomeActive]}>{c.nome}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  catList: { marginBottom: spacing.lg },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    gap: spacing.md,
  },
  catRowActive: { backgroundColor: colors.primary + '40', borderWidth: 1, borderColor: colors.primary },
  catNome: { fontSize: 16, color: colors.textSecondary },
  catNomeActive: { color: colors.textPrimary, fontWeight: '600' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
});
