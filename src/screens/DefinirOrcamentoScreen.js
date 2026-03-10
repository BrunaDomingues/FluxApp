import React, { useState, useMemo } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const SLIDER_MAX = 10000;
const SUGESTAO_PCT = 0.8;

const iconPorCat = { Alimentação: 'restaurant-outline', Moradia: 'home-outline', Transporte: 'car-outline', Lazer: 'happy-outline' };
function getIcon(nome) { return iconPorCat[nome] || 'pricetag-outline'; }

export default function DefinirOrcamentoScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { categorias, setOrcamentoMensal, getOrcamento, getReceitasNoMes } = useApp();
  const mes = route?.params?.mes ?? new Date().getMonth();
  const ano = route?.params?.ano ?? new Date().getFullYear();
  const orcAtual = getOrcamento(mes, ano);
  const receitasMes = getReceitasNoMes(mes, ano);
  const sugerido80 = Math.round(receitasMes * SUGESTAO_PCT * 100) / 100;

  const [step, setStep] = useState(1);
  const [ganhosInput, setGanhosInput] = useState(receitasMes > 0 ? String(receitasMes) : '');
  const [total, setTotal] = useState(() => orcAtual.total > 0 ? String(orcAtual.total) : (sugerido80 > 0 ? String(sugerido80) : ''));
  const [totalSlider, setTotalSlider] = useState(() => orcAtual.total || sugerido80 || 4000);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState(() => {
    const ids = {};
    Object.keys(orcAtual.categorias || {}).forEach((id) => { ids[id] = true; });
    return ids;
  });
  const [porCategoria, setPorCategoria] = useState(() => {
    const cat = {};
    categorias.filter((c) => c.tipo === 'saida').forEach((c) => {
      cat[c.id] = orcAtual.categorias[c.id] ?? 0;
    });
    return cat;
  });
  const [modalMeta, setModalMeta] = useState(null);

  const totalNum = useMemo(() => parseFloat((total || '0').replace(',', '.')) || 0, [total]);
  const totalAlocado = useMemo(
    () => Object.keys(categoriasSelecionadas).filter((id) => categoriasSelecionadas[id]).reduce((s, id) => s + (porCategoria[id] || 0), 0),
    [categoriasSelecionadas, porCategoria]
  );
  const valorRestante = Math.max(0, totalNum - totalAlocado);
  const categoriasSaida = categorias.filter((c) => c.tipo === 'saida');

  const aplicar80 = () => {
    const g = parseFloat((ganhosInput || '0').replace(',', '.')) || 0;
    if (g <= 0) {
      Alert.alert('Informe seus ganhos', 'Digite o valor dos ganhos do mês para sugerir 80%.');
      return;
    }
    const v = Math.round(g * SUGESTAO_PCT * 100) / 100;
    setTotal(String(v));
    setTotalSlider(v);
  };

  const toggleCategoria = (id) => {
    setCategoriasSelecionadas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const abrirMeta = (cat) => {
    setModalMeta({ cat, valor: porCategoria[cat.id] || 0 });
  };

  const salvarMeta = () => {
    if (!modalMeta) return;
    const v = parseFloat(String(modalMeta.valor).replace(',', '.')) || 0;
    setPorCategoria((prev) => ({ ...prev, [modalMeta.cat.id]: v }));
    setCategoriasSelecionadas((prev) => ({ ...prev, [modalMeta.cat.id]: true }));
    setModalMeta(null);
  };

  const handleSalvar = () => {
    if (totalNum <= 0) {
      Alert.alert('Atenção', 'Informe o orçamento total.');
      return;
    }
    const categoriasObj = {};
    Object.keys(categoriasSelecionadas).forEach((id) => {
      if (categoriasSelecionadas[id] && (porCategoria[id] || 0) > 0) {
        categoriasObj[id] = porCategoria[id];
      }
    });
    setOrcamentoMensal(mes, ano, totalNum, categoriasObj);
    navigation.goBack();
  };

  const pctSlider = Math.min(100, (totalSlider / SLIDER_MAX) * 100);

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

      {step === 1 && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepTitle}>Planejamento total</Text>
          <Text style={styles.stepSub}>Ótimo! Agora, sua meta total de gastos para este mês é...</Text>
          <Text style={styles.valorGrande}>R$ {totalNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>

          <Text style={styles.label}>Ganhos do mês (R$) – opcional</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 5000"
            placeholderTextColor={colors.textMuted}
            value={ganhosInput}
            onChangeText={setGanhosInput}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity style={styles.btn80} onPress={aplicar80}>
            <Text style={styles.btn80Text}>Sugerir 80% dos ganhos</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Ou defina o total manualmente (R$)</Text>
          <View style={styles.sliderWrap}>
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: `${pctSlider}%` }]} />
              <View style={[styles.sliderThumb, { left: `${pctSlider}%` }]} />
            </View>
            <Text style={styles.sliderLabels}>R$ 0 — R$ {SLIDER_MAX.toLocaleString('pt-BR')}</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Valor total"
            placeholderTextColor={colors.textMuted}
            value={total}
            onChangeText={(v) => { setTotal(v); const n = parseFloat(v.replace(',', '.')) || 0; setTotalSlider(n); }}
            keyboardType="decimal-pad"
          />

          <Text style={styles.sugestaoText}>
            Sugerimos que seus gastos mensais não ultrapassem 80% do valor de seus ganhos, mas sinta-se à vontade para estabelecer seu limite.
          </Text>

          <TouchableOpacity style={styles.proximoBtn} onPress={() => setStep(2)}>
            <Ionicons name="arrow-forward" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
        </ScrollView>
      )}

      {step === 2 && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepTitle}>Categorias e sub-categorias</Text>
          <Text style={styles.stepSub}>Escolha para quais categorias você gostaria de definir orçamentos.</Text>
          {categoriasSaida.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.catRowSelect}
              onPress={() => toggleCategoria(cat.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.catIconCircle, { backgroundColor: colors.secondary + '40' }]}>
                <Ionicons name={getIcon(cat.nome)} size={22} color={colors.secondary} />
              </View>
              <Text style={styles.catNome}>{cat.nome}</Text>
              <View style={[styles.radio, categoriasSelecionadas[cat.id] && styles.radioChecked]}>
                {categoriasSelecionadas[cat.id] ? <Ionicons name="checkmark" size={16} color={colors.textPrimary} /> : null}
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.proximoBtn} onPress={() => setStep(3)}>
            <Ionicons name="arrow-forward" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
        </ScrollView>
      )}

      {step === 3 && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.resumoRow}>
            <Text style={styles.resumoLabel}>Total</Text>
            <Text style={styles.resumoValor}>R$ {totalNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.resumoRow}>
            <Text style={styles.resumoLabel}>Valor restante</Text>
            <Text style={styles.resumoValor}>R$ {valorRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
          </View>
          <Text style={styles.metasIntro}>Está na hora de definir suas metas. Atribua o valor que desejar a cada categoria selecionada.</Text>

          {categoriasSaida.filter((c) => categoriasSelecionadas[c.id]).map((cat) => (
            <TouchableOpacity key={cat.id} style={styles.metaRow} onPress={() => abrirMeta(cat)}>
              <View style={[styles.catIconCircle, { backgroundColor: colors.secondary + '40' }]}>
                <Ionicons name={getIcon(cat.nome)} size={22} color={colors.secondary} />
              </View>
              <Text style={styles.catNome}>{cat.nome}</Text>
              <Text style={styles.metaValor}>R$ {(porCategoria[cat.id] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.addCatBtn} onPress={() => setStep(2)}>
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
                    <Ionicons name={getIcon(modalMeta.cat.nome)} size={20} color={colors.secondary} />
                  </View>
                  <Text style={styles.catNome}>{modalMeta.cat.nome}</Text>
                </View>
                <TextInput
                  style={styles.modalInput}
                  value={String(modalMeta.valor)}
                  onChangeText={(v) => setModalMeta((m) => m ? { ...m, valor: v } : null)}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  placeholderTextColor={colors.textMuted}
                />
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
  stepSub: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  valorGrande: { fontSize: 32, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg },
  label: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  btn80: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  btn80Text: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  sliderWrap: { marginBottom: spacing.md },
  sliderTrack: {
    height: 8,
    backgroundColor: colors.backgroundCardElevated,
    borderRadius: 4,
    marginBottom: spacing.xs,
    position: 'relative',
  },
  sliderFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.secondary, borderRadius: 4 },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    marginLeft: -10,
  },
  sliderLabels: { fontSize: 12, color: colors.textMuted },
  sugestaoText: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xl, lineHeight: 20 },
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
  resumoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  resumoLabel: { fontSize: 16, color: colors.textMuted },
  resumoValor: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  metasIntro: { fontSize: 14, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.lg },
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
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.lg },
  modalBtnCancel: { padding: spacing.sm },
  modalBtnCancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  modalBtnSave: { padding: spacing.sm },
  modalBtnSaveText: { fontSize: 14, fontWeight: '600', color: colors.secondary },
});
