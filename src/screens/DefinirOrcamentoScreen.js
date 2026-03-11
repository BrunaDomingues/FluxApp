import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { formatBRL, parseToRaw, rawToNumber, numberToRaw } from '../utils/currency';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const SUGESTAO_PCT = 0.8;
const SLIDER_MAX = 50000;

const iconPorCat = { Alimentação: 'restaurant-outline', Moradia: 'home-outline', Transporte: 'car-outline', Lazer: 'happy-outline', Saúde: 'medkit-outline', Educação: 'school-outline', Casa: 'home-outline' };
function getIcon(cat) {
  if (cat && cat.icon) return cat.icon;
  return iconPorCat[cat?.nome] || 'pricetag-outline';
}

export default function DefinirOrcamentoScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { categorias, setOrcamentoMensal, getOrcamento, getReceitasNoMes } = useApp();
  const mes = route?.params?.mes ?? new Date().getMonth();
  const ano = route?.params?.ano ?? new Date().getFullYear();
  const orcAtual = getOrcamento(mes, ano);
  const mesAnterior = mes === 0 ? 11 : mes - 1;
  const anoAnterior = mes === 0 ? ano - 1 : ano;
  const receitaMesAnterior = getReceitasNoMes(mesAnterior, anoAnterior);

  const [step, setStep] = useState(1);
  const [receitaMensal, setReceitaMensal] = useState(() => {
    const r = receitaMesAnterior || orcAtual.total;
    return r > 0 ? numberToRaw(r) : '';
  });
  const [total, setTotal] = useState('');
  const [totalSlider, setTotalSlider] = useState(0);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState({});
  const [porCategoria, setPorCategoria] = useState({});
  const [modalMeta, setModalMeta] = useState(null);

  const receitaNum = useMemo(() => rawToNumber(receitaMensal), [receitaMensal]);
  const totalNum = useMemo(() => rawToNumber(total), [total]);
  const totalAlocado = useMemo(
    () => Object.keys(categoriasSelecionadas).filter((id) => categoriasSelecionadas[id]).reduce((s, id) => s + (porCategoria[id] || 0), 0),
    [categoriasSelecionadas, porCategoria]
  );
  const valorRestante = Math.max(0, totalNum - totalAlocado);
  const categoriasSaida = categorias.filter((c) => c.tipo === 'saida');

  const sliderMin = 0;
  const sliderMax = step === 2
    ? Math.max(receitaNum > 0 ? receitaNum : SLIDER_MAX, totalNum, 100)
    : SLIDER_MAX;
  const sliderValue = Math.min(sliderMax, Math.max(sliderMin, totalNum));

  useEffect(() => {
    if (step === 2 && receitaNum > 0 && total === '') {
      const sugerido = Math.round(receitaNum * SUGESTAO_PCT * 100) / 100;
      setTotal(numberToRaw(sugerido));
      setTotalSlider(sugerido);
    }
  }, [step, receitaNum]);

  const avancarStep1 = () => {
    if (receitaNum > 0) {
      const sugerido = Math.round(receitaNum * SUGESTAO_PCT * 100) / 100;
      setTotal(numberToRaw(sugerido));
      setTotalSlider(sugerido);
    }
    setStep(2);
  };

  const avancarStep2 = () => {
    if (totalNum <= 0) {
      Alert.alert('Atenção', 'Informe o valor máximo de gastos.');
      return;
    }
    setStep(3);
  };

  const toggleCategoria = (id) => {
    setCategoriasSelecionadas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const abrirMeta = (cat) => {
    setModalMeta({ cat, valor: numberToRaw(porCategoria[cat.id] || 0) });
  };

  const salvarMeta = () => {
    if (!modalMeta) return;
    const v = rawToNumber(modalMeta.valor);
    setPorCategoria((prev) => ({ ...prev, [modalMeta.cat.id]: v }));
    setCategoriasSelecionadas((prev) => ({ ...prev, [modalMeta.cat.id]: true }));
    setModalMeta(null);
  };

  const handleSalvar = () => {
    if (totalNum <= 0) {
      Alert.alert('Atenção', 'Orçamento inválido.');
      return;
    }
    const categoriasObj = {};
    Object.keys(categoriasSelecionadas).forEach((id) => {
      if (categoriasSelecionadas[id]) {
        const val = porCategoria[id] || 0;
        if (val > 0) categoriasObj[id] = val;
      }
    });
    setOrcamentoMensal(mes, ano, totalNum, categoriasObj);
    navigation.goBack();
  };

  const handleSliderChange = (v) => {
    const valor = Math.round(v * 100) / 100;
    setTotal(numberToRaw(valor));
    setTotalSlider(valor);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (step > 1 ? setStep(step - 1) : navigation.goBack())} style={styles.backBtn}>
          <Text style={styles.headerBtnText}>{step > 1 ? '←' : '✕'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Novo Planejamento Mensal</Text>
      </View>

      {/* Etapa 1: Receita mensal */}
      {step === 1 && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepTitle}>Planejamento inicial</Text>
          <Text style={styles.stepSub}>Vamos orçar! Comece nos dizendo qual é sua receita mensal total.</Text>
          <TextInput
            style={styles.inputGrande}
            placeholder="R$ 0,00"
            placeholderTextColor={colors.textMuted}
            value={receitaMensal === '' ? '' : formatBRL(receitaMensal)}
            onChangeText={(text) => setReceitaMensal(parseToRaw(text))}
            keyboardType="numeric"
          />
          <Text style={styles.nota}>
            *Valor referente às receitas recebidas no mês anterior, esse valor também pode ser editado.
          </Text>
          <TouchableOpacity style={styles.linkPorque}>
            <Text style={styles.linkPorqueText}>POR QUE PRECISAMOS SABER DISSO?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.proximoBtn} onPress={avancarStep1}>
            <Ionicons name="arrow-forward" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Etapa 2: Valor máximo de gastos (80% padrão) */}
      {step === 2 && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepTitle}>Valor máximo de gastos</Text>
          <Text style={styles.stepSub}>
            {receitaNum > 0
              ? `Sua meta total de gastos para este mês. Sugerimos 80% da sua receita (R$ ${(Math.round(receitaNum * SUGESTAO_PCT * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}), mas você pode alterar.`
              : 'Sua meta total de gastos para este mês. Digite o valor ou use a barra.'}
          </Text>
          <Text style={styles.valorGrande}>R$ {totalNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          <View style={styles.sliderWrap}>
            <Slider
              style={styles.slider}
              minimumValue={sliderMin}
              maximumValue={sliderMax}
              value={sliderValue}
              onValueChange={handleSliderChange}
              minimumTrackTintColor={colors.secondary}
              maximumTrackTintColor={colors.backgroundCardElevated}
              thumbTintColor={colors.secondary}
              step={sliderMax > 1000 ? 10 : 1}
            />
            <Text style={styles.sliderLabels}>
              R$ {sliderMin.toLocaleString('pt-BR')} — R$ {sliderMax.toLocaleString('pt-BR')}
            </Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Ou digite o valor"
            placeholderTextColor={colors.textMuted}
            value={total === '' ? '' : formatBRL(total)}
            onChangeText={(text) => {
              const raw = parseToRaw(text);
              setTotal(raw);
              setTotalSlider(rawToNumber(raw));
            }}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.proximoBtn} onPress={avancarStep2}>
            <Ionicons name="arrow-forward" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Etapa 3: Escolher categorias */}
      {step === 3 && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepTitle}>Categorias e subcategorias</Text>
          <Text style={styles.stepSub}>Escolha para quais categorias você gostaria de definir orçamento.</Text>
          {categoriasSaida.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.catRowSelect}
              onPress={() => toggleCategoria(cat.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.catIconCircle, { backgroundColor: colors.secondary + '40' }]}>
                <Ionicons name={getIcon(cat)} size={22} color={colors.secondary} />
              </View>
              <Text style={styles.catNome}>{cat.nome}</Text>
              <View style={[styles.radio, categoriasSelecionadas[cat.id] && styles.radioChecked]}>
                {categoriasSelecionadas[cat.id] ? <Ionicons name="checkmark" size={16} color={colors.textPrimary} /> : null}
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.proximoBtn} onPress={() => setStep(4)}>
            <Ionicons name="arrow-forward" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Etapa 4: Metas e valor restante */}
      {step === 4 && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepTitle}>Metas e Orçamentos</Text>
          <View style={styles.totalCard}>
            <Text style={styles.totalCardValor}>R$ {totalNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.totalCardLabel}>Total</Text>
          </View>
          <View style={styles.resumoRow}>
            <Ionicons name="diamond-outline" size={20} color={colors.secondary} />
            <Text style={styles.resumoLabel}>Valor restante</Text>
            <Text style={styles.resumoValor}>R$ {valorRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          </View>
          <Text style={styles.metasIntro}>
            Está na hora de definir suas metas. Atribua o valor que desejar a cada categoria selecionada. O valor é descontado do restante.
          </Text>

          {categoriasSaida.filter((c) => categoriasSelecionadas[c.id]).map((cat) => (
            <TouchableOpacity key={cat.id} style={styles.metaRow} onPress={() => abrirMeta(cat)}>
              <View style={[styles.catIconCircle, { backgroundColor: colors.secondary + '40' }]}>
                <Ionicons name={getIcon(cat)} size={22} color={colors.secondary} />
              </View>
              <Text style={styles.catNome}>{cat.nome}</Text>
              <Text style={styles.metaValor}>R$ {(porCategoria[cat.id] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.addCatBtn} onPress={() => setStep(3)}>
            <Ionicons name="add-circle-outline" size={22} color={colors.secondary} />
            <Text style={styles.addCatBtnText}>ADICIONAR CATEGORIA</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.salvarBtn} onPress={handleSalvar}>
            <Text style={styles.salvarBtnText}>SALVAR PLANEJAMENTO</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={!!modalMeta} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalMeta(null)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Meta</Text>
            {modalMeta && (
              <>
                <View style={styles.modalCatRow}>
                  <View style={[styles.catIconCircle, { backgroundColor: colors.secondary + '40' }]}>
                    <Ionicons name={getIcon(modalMeta.cat)} size={20} color={colors.secondary} />
                  </View>
                  <Text style={styles.catNome}>{modalMeta.cat.nome}</Text>
                </View>
                <Text style={styles.modalLabel}>Valor de gasto para esta categoria</Text>
                <TextInput
                  style={styles.modalInput}
                  value={modalMeta.valor === '' ? '' : formatBRL(modalMeta.valor)}
                  onChangeText={(text) => setModalMeta((m) => m ? { ...m, valor: parseToRaw(text) } : null)}
                  keyboardType="numeric"
                  placeholder="R$ 0,00"
                  placeholderTextColor={colors.textMuted}
                />
                {totalNum > 0 && (
                  <Text style={styles.modalPct}>
                    {((rawToNumber(modalMeta.valor) / totalNum) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do orçamento total
                  </Text>
                )}
                <Text style={styles.modalRestante}>
                  Valor restante após: R$ {Math.max(0, valorRestante + (porCategoria[modalMeta.cat.id] || 0) - rawToNumber(modalMeta.valor)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalMeta(null)}>
                <Text style={styles.modalBtnCancelText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={salvarMeta}>
                <Text style={styles.modalBtnSaveText}>SALVAR</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
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
  headerBtnText: { fontSize: 22, color: colors.textPrimary },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: colors.secondary, marginBottom: spacing.sm },
  stepSub: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 20 },
  inputGrande: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  nota: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md, fontStyle: 'italic' },
  linkPorque: { marginBottom: spacing.xl },
  linkPorqueText: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  valorGrande: { fontSize: 32, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  sliderWrap: { marginBottom: spacing.md },
  slider: { width: '100%', height: 40 },
  sliderTrack: {
    height: 8,
    backgroundColor: colors.backgroundCardElevated,
    borderRadius: 4,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  sliderFill: { height: '100%', backgroundColor: colors.secondary, borderRadius: 4 },
  sliderLabels: { fontSize: 12, color: colors.textMuted },
  proximoBtn: {
    alignSelf: 'flex-end',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catRowSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  catIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  catNome: { fontSize: 16, color: colors.textPrimary, flex: 1 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioChecked: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  totalCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalCardValor: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  totalCardLabel: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  resumoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  resumoLabel: { fontSize: 16, color: colors.textMuted, flex: 1 },
  resumoValor: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  metasIntro: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  metaValor: { fontSize: 16, fontWeight: '600', color: colors.secondary },
  addCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  addCatBtnText: { fontSize: 14, fontWeight: '700', color: colors.secondary, letterSpacing: 0.5 },
  salvarBtn: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  salvarBtnText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, letterSpacing: 0.5 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  modalBox: { backgroundColor: colors.backgroundCard, borderRadius: borderRadius.lg, padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg },
  modalCatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  modalLabel: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  modalRestante: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.lg },
  modalPct: { fontSize: 12, color: colors.secondary, marginBottom: spacing.xs },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.lg },
  modalBtnCancel: { padding: spacing.sm },
  modalBtnCancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  modalBtnSave: { padding: spacing.sm },
  modalBtnSaveText: { fontSize: 14, fontWeight: '600', color: colors.secondary },
});
