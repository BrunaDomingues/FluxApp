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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { parseLocalDateFromYYYYMMDD } from '../utils/dateMask';

const TAB_EM_ANDAMENTO = 'em_andamento';
const TAB_CONCLUIDOS = 'concluidos';

const TIPOS_OBJETIVO = [
  { id: 'personalizado', label: 'Objetivo personalizado', icon: 'add', color: '#607D8B' },
  { id: 'fundo_emergencia', label: 'Fundo de emergência', icon: 'cash-outline', color: '#00C853' },
  { id: 'carro_novo', label: 'Carro novo', icon: 'car-outline', color: '#BB86FC' },
  { id: 'casa_nova', label: 'Casa nova', icon: 'home-outline', color: '#00BCD4' },
  { id: 'reforma', label: 'Reforma', icon: 'construct-outline', color: '#FF9800' },
  { id: 'viagem_ferias', label: 'Viagem de férias', icon: 'airplane-outline', color: '#FF5252' },
  { id: 'despesas_medicas', label: 'Despesas médicas', icon: 'medkit-outline', color: '#2196F3' },
  { id: 'pagar_divida', label: 'Pagar uma dívida', icon: 'document-text-outline', color: '#8BC34A' },
];

function formatDataLimite(str) {
  if (!str) return '—';
  if (typeof str === 'string' && str.includes('/')) return str;
  const d = parseLocalDateFromYYYYMMDD(str);
  if (!d) return str;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ObjetivosScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { objetivos } = useApp();
  const [tab, setTab] = useState(TAB_EM_ANDAMENTO);
  const [menuVisible, setMenuVisible] = useState(false);
  const [modalTiposVisible, setModalTiposVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const menuButtonRef = useRef(null);

  const abrirCriarObjetivo = () => setModalTiposVisible(true);
  const selecionarTipo = (tipo) => {
    setModalTiposVisible(false);
    navigation.navigate('AddObjetivo', { tipo });
  };

  const emAndamento = objetivos.filter((o) => !o.concluido);
  const concluidos = objetivos.filter((o) => o.concluido);
  const list = tab === TAB_CONCLUIDOS ? concluidos : emAndamento;

  const abrirMenu = () => {
    menuButtonRef.current?.measureInWindow((x, y, w, h) => {
      const windowWidth = Dimensions.get('window').width;
      setMenuPosition({ top: y + h + 4, right: windowWidth - (x + w) });
      setMenuVisible(true);
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { backgroundColor: colors.secondary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Objetivos</Text>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={abrirCriarObjetivo}
        >
          <Ionicons name="add" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <View ref={menuButtonRef} collapsable={false}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={abrirMenu}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === TAB_EM_ANDAMENTO && styles.tabActive]}
          onPress={() => setTab(TAB_EM_ANDAMENTO)}
        >
          <Text style={[styles.tabText, tab === TAB_EM_ANDAMENTO && styles.tabTextActive]}>
            Em andamento
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === TAB_CONCLUIDOS && styles.tabActive]}
          onPress={() => setTab(TAB_CONCLUIDOS)}
        >
          <Text style={[styles.tabText, tab === TAB_CONCLUIDOS && styles.tabTextActive]}>
            Concluídos
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {tab === TAB_EM_ANDAMENTO && emAndamento.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Definindo objetivos você alcança seus sonhos mais rápido</Text>
            <Text style={styles.emptySub}>Que tal criar um pra te ajudar?</Text>
            <TouchableOpacity
              style={styles.btnCriar}
              onPress={abrirCriarObjetivo}
              activeOpacity={0.8}
            >
              <Text style={styles.btnCriarText}>Criar novo objetivo</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === TAB_CONCLUIDOS && concluidos.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Você ainda não concluiu um objetivo</Text>
            <Text style={styles.emptySub}>Que tal continuar guardando dinheiro?</Text>
          </View>
        )}

        {list.length > 0 &&
          list.map((obj) => {
            const valorInicial = obj.valorInicial || 0;
            const totalGuardado = valorInicial + (obj.depositos || []).reduce((s, d) => s + (d.valor || 0), 0);
            const meta = obj.valorMeta || 1;
            const pct = Math.min(100, Math.round((totalGuardado / meta) * 100));
            return (
              <TouchableOpacity
                key={obj.id}
                style={styles.card}
                onPress={() => navigation.navigate('ObjetivoDetalhes', { objetivoId: obj.id })}
                activeOpacity={0.8}
              >
                <View style={[styles.cardIconWrap, obj.color && { backgroundColor: obj.color + '40' }]}>
                  <Ionicons name={obj.icon || 'cash-outline'} size={22} color={obj.color || colors.textPrimary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{obj.nome}</Text>
                  <Text style={styles.cardGuardado}>
                    R$ {totalGuardado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} guardados
                  </Text>
                  <View style={styles.progressWrap}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${pct}%`, backgroundColor: obj.color || colors.secondary },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressPct}>{pct}%</Text>
                  </View>
                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="trophy-outline" size={16} color={colors.textMuted} />
                      <Text style={styles.metaText}>
                        R$ {(obj.valorMeta || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                      <Text style={styles.metaText}>{formatDataLimite(obj.dataLimite)}</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            );
          })}
      </ScrollView>

      <Modal visible={menuVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuBox, { top: menuPosition.top, right: menuPosition.right }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); }}>
              <Text style={styles.menuItemText}>Opções em breve</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={modalTiposVisible} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalTiposVisible(false)}>
          <Pressable style={styles.modalTiposBox} onPress={(e) => e.stopPropagation()}>
            {TIPOS_OBJETIVO.map((tipo) => (
              <TouchableOpacity
                key={tipo.id}
                style={styles.tipoRow}
                onPress={() => selecionarTipo(tipo)}
                activeOpacity={0.7}
              >
                <View style={[styles.tipoIconWrap, { backgroundColor: (tipo.color || colors.secondary) + '40' }]}>
                  <Ionicons name={tipo.icon} size={22} color={tipo.color || colors.secondary} />
                </View>
                <Text style={styles.tipoLabel}>{tipo.label}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
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
  tabs: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.secondary + '30',
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.backgroundCard },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.textPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptySub: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  btnCriar: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minWidth: 240,
    alignItems: 'center',
  },
  btnCriarText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  cardGuardado: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.backgroundCardElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressPct: { fontSize: 12, color: colors.textMuted, minWidth: 28 },
  cardMeta: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { fontSize: 12, color: colors.textMuted },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  menuBox: {
    position: 'absolute',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  menuItem: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  menuItemText: { fontSize: 14, color: colors.textPrimary },
  modalTiposBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.backgroundCard,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
    maxHeight: '70%',
  },
  tipoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  tipoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  tipoLabel: { flex: 1, fontSize: 16, color: colors.textPrimary, fontWeight: '500' },
});
