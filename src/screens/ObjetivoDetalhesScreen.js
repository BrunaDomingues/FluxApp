import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { formatBRL, parseToRaw, rawToNumber } from '../utils/currency';
import { AppAlert } from '../components/AppAlert';
import { parseLocalDateFromYYYYMMDD } from '../utils/dateMask';

function formatDataLimite(str) {
  if (!str) return '—';
  if (typeof str === 'string' && str.includes('/')) return str;
  const d = parseLocalDateFromYYYYMMDD(str);
  if (!d) return str;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function semanasAteLimite(dataLimite) {
  if (!dataLimite) return 1;
  const fim = parseLocalDateFromYYYYMMDD(dataLimite);
  if (!fim) return 1;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  fim.setHours(0, 0, 0, 0);
  const diff = Math.max(0, Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24)));
  return Math.max(1, Math.ceil(diff / 7));
}

export default function ObjetivoDetalhesScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { objetivos, updateObjetivo, removeObjetivo, addDepositoObjetivo, removeDepositoObjetivo } = useApp();
  const objetivoId = route?.params?.objetivoId;
  const objetivo = objetivos.find((o) => o.id === objetivoId);

  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [modalDepositoVisible, setModalDepositoVisible] = useState(false);
  const [valorDeposito, setValorDeposito] = useState('');
  const menuButtonRef = useRef(null);

  if (!objetivo) {
    if (navigation.canGoBack()) navigation.goBack();
    return null;
  }

  const depositos = objetivo.depositos || [];
  const valorInicial = objetivo.valorInicial || 0;
  const totalGuardado = valorInicial + depositos.reduce((s, d) => s + (d.valor || 0), 0);
  const meta = objetivo.valorMeta || 1;
  const pct = Math.min(100, Math.round((totalGuardado / meta) * 100));
  const restante = Math.max(0, meta - totalGuardado);
  const semanas = semanasAteLimite(objetivo.dataLimite);
  const porSemana = restante > 0 && semanas > 0 ? Math.round((restante / semanas) * 100) / 100 : 0;

  const abrirMenu = () => {
    menuButtonRef.current?.measureInWindow((x, y, w, h) => {
      const windowWidth = Dimensions.get('window').width;
      setMenuPosition({ top: y + h + 4, right: windowWidth - (x + w) });
      setMenuVisible(true);
    });
  };

  const handleAddDeposito = () => {
    const v = rawToNumber(valorDeposito);
    if (v <= 0) return;
    addDepositoObjetivo(objetivo.id, v);
    setValorDeposito('');
    setModalDepositoVisible(false);
  };

  const handleExcluirDeposito = (dep) => {
    AppAlert.alert(
      'Excluir depósito',
      `Excluir depósito de R$ ${(dep.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => removeDepositoObjetivo(objetivo.id, dep.id) },
      ]
    );
  };

  const handleEditar = () => {
    setMenuVisible(false);
    navigation.navigate('AddObjetivo', { editar: objetivo });
  };

  const handlePausar = () => {
    setMenuVisible(false);
    updateObjetivo(objetivo.id, { pausado: !objetivo.pausado });
  };

  const handleDuplicar = () => {
    setMenuVisible(false);
    navigation.navigate('AddObjetivo', { duplicar: objetivo });
  };

  const handleMarcarConcluido = () => {
    setMenuVisible(false);
    updateObjetivo(objetivo.id, { concluido: true });
  };

  const handleExcluir = () => {
    setMenuVisible(false);
    AppAlert.alert(
      'Excluir objetivo',
      `Excluir "${objetivo.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            removeObjetivo(objetivo.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { backgroundColor: colors.secondary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{objetivo.nome}</Text>
        <View ref={menuButtonRef} collapsable={false}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={abrirMenu}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardSemana}>
          <View style={styles.cardSemanaIcon}>
            <Ionicons name="calendar-outline" size={24} color={colors.secondary} />
          </View>
          <Text style={styles.cardSemanaLabel}>
            Para atingir seu objetivo a tempo, você terá que guardar a cada semana
          </Text>
          <Text style={styles.cardSemanaValor}>
            R$ {porSemana.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={styles.cardProgress}>
          <View style={styles.cardProgressHeader}>
            <View style={[styles.cardProgressIcon, objetivo.color && { backgroundColor: objetivo.color + '40' }]}>
              <Ionicons name={objetivo.icon || 'cash-outline'} size={20} color={objetivo.color || colors.textPrimary} />
            </View>
            <Text style={styles.cardProgressTitle}>{objetivo.nome}</Text>
          </View>
          <View style={styles.progressBarWrap}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${pct}%`, backgroundColor: objetivo.color || colors.secondary },
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressGuardado}>
                R$ {totalGuardado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} guardados
              </Text>
              <Text style={styles.progressPct}>{pct}%</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="trophy-outline" size={18} color={colors.textMuted} />
              <Text style={styles.metaText}>
                R$ {(objetivo.valorMeta || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              <Text style={styles.metaText}>{formatDataLimite(objetivo.dataLimite)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.depositosCard}>
          <View style={styles.depositosHeader}>
            <Text style={styles.depositosTitle}>Depósitos</Text>
            <TouchableOpacity
              style={styles.fabAdd}
              onPress={() => { setValorDeposito(''); setModalDepositoVisible(true); }}
            >
              <Ionicons name="add" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          {depositos.length === 0 ? (
            <Text style={styles.depositosEmpty}>Você ainda não fez um depósito.</Text>
          ) : (
            depositos
              .slice()
              .sort((a, b) => (b.id || '').localeCompare(a.id || ''))
              .map((dep) => (
                <View key={dep.id} style={styles.depositoRow}>
                  <Text style={styles.depositoData}>{dep.data}</Text>
                  <Text style={styles.depositoValor}>
                    R$ {(dep.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                  <TouchableOpacity
                    style={styles.depositoIconBtn}
                    onPress={() => handleExcluirDeposito(dep)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.spending} />
                  </TouchableOpacity>
                </View>
              ))
          )}
        </View>
      </ScrollView>

      <Modal visible={menuVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuBox, { top: menuPosition.top, right: menuPosition.right }]}>
            <TouchableOpacity style={styles.menuItem} onPress={handleEditar}>
              <Text style={styles.menuItemText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handlePausar}>
              <Text style={styles.menuItemText}>{objetivo.pausado ? 'Retomar' : 'Pausar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleDuplicar}>
              <Text style={styles.menuItemText}>Duplicar</Text>
            </TouchableOpacity>
            {!objetivo.concluido && (
              <TouchableOpacity style={styles.menuItem} onPress={handleMarcarConcluido}>
                <Text style={styles.menuItemText}>Marcar como concluído</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={handleExcluir}>
              <Text style={styles.menuItemTextDanger}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={modalDepositoVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalDepositoVisible(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Novo depósito</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="R$ 0,00"
              placeholderTextColor={colors.textMuted}
              value={valorDeposito === '' ? '' : formatBRL(valorDeposito)}
              onChangeText={(t) => setValorDeposito(parseToRaw(t))}
              keyboardType="numeric"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalDepositoVisible(false)}>
                <Text style={styles.modalBtnCancelText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnOk} onPress={handleAddDeposito}>
                <Text style={styles.modalBtnOkText}>ADICIONAR</Text>
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
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1, textAlign: 'center' },
  headerIconBtn: { padding: spacing.xs },
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  cardSemana: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardSemanaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  cardSemanaLabel: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
  cardSemanaValor: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  cardProgress: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardProgressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  cardProgressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardProgressTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  progressBarWrap: { marginBottom: spacing.md },
  progressTrack: {
    height: 8,
    backgroundColor: colors.backgroundCardElevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressGuardado: { fontSize: 13, color: colors.textMuted },
  progressPct: { fontSize: 13, color: colors.textMuted },
  metaRow: { flexDirection: 'row', gap: spacing.lg },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { fontSize: 14, color: colors.textMuted },
  depositosCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  depositosHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  depositosTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  fabAdd: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.positive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  depositosEmpty: { fontSize: 14, color: colors.textMuted },
  depositoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  depositoData: { fontSize: 14, color: colors.textMuted, flex: 1 },
  depositoValor: { fontSize: 15, fontWeight: '600', color: colors.positive },
  depositoIconBtn: { padding: spacing.xs },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  menuBox: {
    position: 'absolute',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  menuItem: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  menuItemText: { fontSize: 15, color: colors.textPrimary },
  menuItemTextDanger: { fontSize: 15, color: colors.spending, fontWeight: '600' },
  modalBox: { backgroundColor: colors.backgroundCard, borderRadius: borderRadius.lg, padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.lg },
  modalBtnCancel: { padding: spacing.sm },
  modalBtnCancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  modalBtnOk: { padding: spacing.sm },
  modalBtnOkText: { fontSize: 14, fontWeight: '600', color: colors.secondary },
});
