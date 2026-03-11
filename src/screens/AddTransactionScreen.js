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
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { formatBRL, parseToRaw, rawToNumber, numberToRaw } from '../utils/currency';
import { maskDateInput, parseDateDDMM } from '../utils/dateMask';
import { ICONE_PADRAO } from '../constants/categorias';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function buildAnos() {
  const anoAtual = new Date().getFullYear();
  const anos = [];
  for (let a = anoAtual - 5; a <= anoAtual + 10; a++) anos.push(a);
  return anos;
}
const ANOS = buildAnos();

export default function AddTransactionScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const bottomSafe = Math.max(insets.bottom, 48);
  const { categorias, contas, cartoes, addTransacao, updateTransacao, removeTransacao, transacoes, usuarios, getPrincipalUserId } = useApp();
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
  const [totalParcelas, setTotalParcelas] = useState('1');
  const [mesPrimeiraParcela, setMesPrimeiraParcela] = useState(new Date().getMonth());
  const [anoPrimeiraParcela, setAnoPrimeiraParcela] = useState(new Date().getFullYear());
  const [modalCategoriaVisible, setModalCategoriaVisible] = useState(false);
  const [modalMesVisible, setModalMesVisible] = useState(false);
  const [modalAnoVisible, setModalAnoVisible] = useState(false);
  const [divisaoAtiva, setDivisaoAtiva] = useState(false);
  const [usuariosDivisao, setUsuariosDivisao] = useState([]);
  const [tipoDivisao, setTipoDivisao] = useState('igual');
  const [porcentagens, setPorcentagens] = useState({});
  const [dataTransacao, setDataTransacao] = useState('');
  const [local, setLocal] = useState('');

  const principalId = getPrincipalUserId();
  const outrosUsuarios = (usuarios || []).filter((u) => !u.principal);
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
    if (editar.parcelaNumero != null) {
      setTotalParcelas(String(editar.totalParcelas || 1));
      setMesPrimeiraParcela(editar.mesVencimento ?? new Date().getMonth());
      setAnoPrimeiraParcela(editar.anoVencimento ?? new Date().getFullYear());
    }
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
    if (editar.divisao && editar.divisao.partes) {
      setDivisaoAtiva(true);
      setTipoDivisao(editar.divisao.tipo || 'igual');
      const outros = (editar.divisao.partes || []).filter((p) => p.userId !== principalId).map((p) => p.userId);
      setUsuariosDivisao(outros);
      const pcts = {};
      (editar.divisao.partes || []).forEach((p) => { pcts[p.userId] = String(p.porcentagem ?? ''); });
      setPorcentagens(pcts);
    }
    if (editar.data) {
      const d = editar.data;
      setDataTransacao(d.length >= 10 ? d : d + '/' + (editar.ano ?? new Date().getFullYear()));
    }
    if (editar.local != null) setLocal(editar.local || '');
  }, [editar?.id]);

  const getDataMesAno = () => {
    const now = new Date();
    if (!dataTransacao || !dataTransacao.trim()) {
      return {
        data: now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        mes: now.getMonth(),
        ano: now.getFullYear(),
      };
    }
    const parsed = parseDateDDMM(dataTransacao.trim());
    if (!parsed) return { data: dataTransacao.trim(), mes: now.getMonth(), ano: now.getFullYear() };
    const dataStr = `${String(parsed.day).padStart(2, '0')}/${String(parsed.month + 1).padStart(2, '0')}/${parsed.year}`;
    return { data: dataStr, mes: parsed.month, ano: parsed.year };
  };

  const buildDivisaoPayload = () => {
    if (!divisaoAtiva || !principalId) return undefined;
    const partesIds = [principalId, ...usuariosDivisao];
    if (partesIds.length < 2) return undefined;
    if (tipoDivisao === 'igual') {
      const pct = 100 / partesIds.length;
      return { tipo: 'igual', partes: partesIds.map((userId) => ({ userId, porcentagem: pct })) };
    }
    const sum = partesIds.reduce((s, id) => s + (parseFloat(porcentagens[id]) || 0), 0);
    if (Math.abs(sum - 100) > 0.01) return undefined;
    return {
      tipo: 'porcentagem',
      partes: partesIds.map((userId) => ({ userId, porcentagem: parseFloat(porcentagens[userId]) || 0 })),
    };
  };

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
        const { data, mes, ano } = getDataMesAno();
        updateTransacao(editar.id, {
          valor: tipo === 'entrada' ? valorNum : -valorNum,
          categoriaId: categoriaId || undefined,
          categoriaNome: cat?.nome,
          contaId: isCartao ? undefined : contaId,
          cartaoId: isCartao ? cartaoId : undefined,
          descricao: descricao.trim() || undefined,
          divisao: buildDivisaoPayload(),
          data,
          mes,
          ano,
          local: local.trim() || undefined,
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
    if (divisaoAtiva && tipoDivisao === 'porcentagem') {
      const partesIds = [principalId, ...usuariosDivisao].filter(Boolean);
      const sum = partesIds.reduce((s, id) => s + (parseFloat(porcentagens[id]) || 0), 0);
      if (partesIds.length >= 2 && Math.abs(sum - 100) > 0.01) {
        Alert.alert('Atenção', 'A soma das porcentagens deve ser 100%.');
        return;
      }
    }
    const cat = categorias.find((c) => c.id === categoriaId);
    const numParcelas = Math.max(1, parseInt(totalParcelas, 10) || 1);
    const isParcelado = isCartao && numParcelas > 1;
    const valorEnvio = isParcelado ? Math.abs(valorNum) / numParcelas : (tipo === 'entrada' ? valorNum : -Math.abs(valorNum));
    const { data, mes, ano } = getDataMesAno();
    addTransacao({
      tipo: isCartao ? 'despesa_cartao' : tipo === 'entrada' ? 'entrada' : 'saida',
      valor: tipo === 'entrada' ? valorNum : (isParcelado ? -valorEnvio : -Math.abs(valorNum)),
      categoriaId,
      categoriaNome: cat?.nome,
      contaId: isCartao ? undefined : contaId,
      cartaoId: isCartao ? cartaoId : undefined,
      descricao: descricao.trim() || undefined,
      ...(isParcelado && {
        totalParcelas: numParcelas,
        mesPrimeiraParcela,
        anoPrimeiraParcela,
      }),
      divisao: buildDivisaoPayload(),
      data,
      mes,
      ano,
      local: local.trim() || undefined,
    });
    navigation.goBack();
  };

  const handleExcluir = () => {
    Alert.alert(
      'Excluir transação',
      isTransferencia
        ? 'Excluir esta transferência? As duas movimentações serão removidas.'
        : `Excluir ${tipo === 'entrada' ? 'esta receita' : 'esta despesa'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => { removeTransacao(editar.id); navigation.goBack(); } },
      ]
    );
  };

  const title = isEditMode
    ? (isTransferencia ? 'Editar transferência' : tipo === 'entrada' ? 'Editar entrada' : isCartao ? 'Editar despesa no cartão' : 'Editar despesa')
    : (isTransferencia ? 'Transferência' : tipo === 'entrada' ? 'Nova entrada' : isCartao ? 'Despesa no cartão' : 'Nova despesa');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 + bottomSafe }]} keyboardShouldPersistTaps="handled">
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
        {!isTransferencia && (
          <>
            <Text style={styles.label}>Data (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="dd/mm/aaaa — vazio = hoje"
              placeholderTextColor={colors.textMuted}
              value={dataTransacao}
              onChangeText={(text) => setDataTransacao(maskDateInput(text))}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Local (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Restaurante X, Posto Shell"
              placeholderTextColor={colors.textMuted}
              value={local}
              onChangeText={setLocal}
            />
          </>
        )}
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
            {(cartoes.find((c) => c.id === cartaoId)?.tipo || 'credito') === 'credito' && !isEditMode && (
              <>
                <Text style={styles.label}>Nº de parcelas (1 = à vista)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor={colors.textMuted}
                  value={totalParcelas}
                  onChangeText={setTotalParcelas}
                  keyboardType="number-pad"
                />
                {(Math.max(1, parseInt(totalParcelas, 10) || 1) > 1) && (
                  <>
                    <Text style={styles.label}>1ª parcela vence em (mês/ano)</Text>
                    <View style={styles.row}>
                      <View style={styles.flex1}>
                        <Text style={styles.labelSmall}>Mês</Text>
                        <TouchableOpacity
                          style={styles.selectCategoria}
                          onPress={() => setModalMesVisible(true)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                          <Text style={styles.selectCategoriaText}>{MESES[mesPrimeiraParcela]}</Text>
                          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.flex1}>
                        <Text style={styles.labelSmall}>Ano</Text>
                        <TouchableOpacity
                          style={styles.selectCategoria}
                          onPress={() => setModalAnoVisible(true)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                          <Text style={styles.selectCategoriaText}>{anoPrimeiraParcela}</Text>
                          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Modal visible={modalMesVisible} transparent animationType="fade">
                      <Pressable style={styles.modalBackdrop} onPress={() => setModalMesVisible(false)}>
                        <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
                          <Text style={styles.modalTitle}>Selecionar mês</Text>
                          <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent} keyboardShouldPersistTaps="handled">
                            {MESES.map((nome, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={[styles.modalOption, mesPrimeiraParcela === idx && styles.modalOptionActive]}
                                onPress={() => {
                                  setMesPrimeiraParcela(idx);
                                  setModalMesVisible(false);
                                }}
                              >
                                <Text style={[styles.modalOptionText, mesPrimeiraParcela === idx && styles.modalOptionTextActive]}>{nome}</Text>
                                {mesPrimeiraParcela === idx ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                          <TouchableOpacity style={styles.modalCancel} onPress={() => setModalMesVisible(false)}>
                            <Text style={styles.modalCancelText}>Fechar</Text>
                          </TouchableOpacity>
                        </Pressable>
                      </Pressable>
                    </Modal>
                    <Modal visible={modalAnoVisible} transparent animationType="fade">
                      <Pressable style={styles.modalBackdrop} onPress={() => setModalAnoVisible(false)}>
                        <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
                          <Text style={styles.modalTitle}>Selecionar ano</Text>
                          <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent} keyboardShouldPersistTaps="handled">
                            {ANOS.map((ano) => (
                              <TouchableOpacity
                                key={ano}
                                style={[styles.modalOption, anoPrimeiraParcela === ano && styles.modalOptionActive]}
                                onPress={() => {
                                  setAnoPrimeiraParcela(ano);
                                  setModalAnoVisible(false);
                                }}
                              >
                                <Text style={[styles.modalOptionText, anoPrimeiraParcela === ano && styles.modalOptionTextActive]}>{ano}</Text>
                                {anoPrimeiraParcela === ano ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                          <TouchableOpacity style={styles.modalCancel} onPress={() => setModalAnoVisible(false)}>
                            <Text style={styles.modalCancelText}>Fechar</Text>
                          </TouchableOpacity>
                        </Pressable>
                      </Pressable>
                    </Modal>
                  </>
                )}
              </>
            )}
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
        {!isTransferencia && outrosUsuarios.length > 0 && (tipo === 'saida' || isCartao) && (
          <>
            <View style={styles.divisaoRow}>
              <Text style={styles.label}>Dividir despesa</Text>
              <TouchableOpacity
                style={[styles.toggleDivisao, divisaoAtiva && styles.toggleDivisaoActive]}
                onPress={() => setDivisaoAtiva(!divisaoAtiva)}
              >
                <Text style={[styles.toggleDivisaoText, divisaoAtiva && styles.toggleDivisaoTextActive]}>
                  {divisaoAtiva ? 'Sim' : 'Não'}
                </Text>
              </TouchableOpacity>
            </View>
            {divisaoAtiva && (
              <>
                <Text style={styles.label}>Com quem dividir (além de você)</Text>
                <View style={styles.optionsRow}>
                  {outrosUsuarios.map((u) => {
                    const selected = usuariosDivisao.includes(u.id);
                    return (
                      <TouchableOpacity
                        key={u.id}
                        style={[styles.optionChip, selected && styles.optionChipActive]}
                        onPress={() => {
                          if (selected) {
                            setUsuariosDivisao((prev) => prev.filter((id) => id !== u.id));
                            setPorcentagens((p) => ({ ...p, [u.id]: '' }));
                          } else {
                            setUsuariosDivisao((prev) => [...prev, u.id]);
                            if (tipoDivisao === 'igual') setPorcentagens((p) => ({ ...p, [u.id]: '' }));
                          }
                        }}
                      >
                        <Text style={[styles.optionChipText, selected && styles.optionChipTextActive]}>{u.nome}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {usuariosDivisao.length > 0 && (
                  <>
                    <Text style={styles.label}>Tipo de divisão</Text>
                    <View style={styles.optionsRow}>
                      <TouchableOpacity
                        style={[styles.optionChip, tipoDivisao === 'igual' && styles.optionChipActive]}
                        onPress={() => { setTipoDivisao('igual'); setPorcentagens({}); }}
                      >
                        <Text style={[styles.optionChipText, tipoDivisao === 'igual' && styles.optionChipTextActive]}>Igual</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.optionChip, tipoDivisao === 'porcentagem' && styles.optionChipActive]}
                        onPress={() => setTipoDivisao('porcentagem')}
                      >
                        <Text style={[styles.optionChipText, tipoDivisao === 'porcentagem' && styles.optionChipTextActive]}>Por %</Text>
                      </TouchableOpacity>
                    </View>
                    {tipoDivisao === 'porcentagem' && (
                      <>
                        <Text style={styles.label}>Porcentagem de cada um (total = 100%)</Text>
                        {principalId && (
                          <View style={styles.porcRow}>
                            <Text style={styles.porcLabel}>Você (principal)</Text>
                            <TextInput
                              style={styles.porcInput}
                              placeholder="%"
                              placeholderTextColor={colors.textMuted}
                              value={porcentagens[principalId] ?? ''}
                              onChangeText={(v) => setPorcentagens((p) => ({ ...p, [principalId]: v.replace(/\D/g, '') }))}
                              keyboardType="number-pad"
                            />
                          </View>
                        )}
                        {usuariosDivisao.map((uid) => {
                          const u = outrosUsuarios.find((x) => x.id === uid);
                          if (!u) return null;
                          return (
                            <View key={u.id} style={styles.porcRow}>
                              <Text style={styles.porcLabel}>{u.nome}</Text>
                              <TextInput
                                style={styles.porcInput}
                                placeholder="%"
                                placeholderTextColor={colors.textMuted}
                                value={porcentagens[u.id] ?? ''}
                                onChangeText={(v) => setPorcentagens((p) => ({ ...p, [u.id]: v.replace(/\D/g, '') }))}
                                keyboardType="number-pad"
                              />
                            </View>
                          );
                        })}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
        <TouchableOpacity style={styles.button} onPress={handleSalvar}>
          <Text style={styles.buttonText}>Salvar</Text>
        </TouchableOpacity>
        {isEditMode && (
          <TouchableOpacity style={styles.excluirBtn} onPress={handleExcluir}>
            <Ionicons name="trash-outline" size={20} color={colors.spending} />
            <Text style={styles.excluirText}>Excluir transação</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
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
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  flex1: { flex: 1 },
  labelSmall: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs },
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
  divisaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  toggleDivisao: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.full,
  },
  toggleDivisaoActive: { backgroundColor: colors.primary },
  toggleDivisaoText: { fontSize: 14, color: colors.textMuted },
  toggleDivisaoTextActive: { color: colors.textPrimary, fontWeight: '600' },
  porcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  porcLabel: { flex: 1, fontSize: 14, color: colors.textSecondary },
  porcInput: {
    width: 70,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
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
  excluirText: { fontSize: 15, color: colors.spending, fontWeight: '600' },
});
