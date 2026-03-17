import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  TextInput,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { AppAlert } from '../components/AppAlert';
import { maskDateInput, maskTimeInput, parseExifDateTime } from '../utils/dateMask';

let FileSystem;
try {
  FileSystem = require('expo-file-system').default;
} catch (_) {}

export default function DespesasCompartilhadasPendentesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { getMyPendingSharedExpenses, markSharedExpensePartPaid } = useAuth();
  const { refetchUserData } = useApp();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [modalPagarVisible, setModalPagarVisible] = useState(false);
  const [itemPagar, setItemPagar] = useState(null);
  const [dataPagamento, setDataPagamento] = useState('');
  const [horarioPagamento, setHorarioPagamento] = useState('');
  const [comprovanteUri, setComprovanteUri] = useState(null);
  const [comprovanteBase64, setComprovanteBase64] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await getMyPendingSharedExpenses?.() ?? { data: [], error: null };
    if (error) {
      setList([]);
      return;
    }
    setList(Array.isArray(data) ? data : []);
  }, [getMyPendingSharedExpenses]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const abrirModalPagar = (item) => {
    setItemPagar(item);
    setDataPagamento('');
    setHorarioPagamento('');
    setComprovanteUri(null);
    setComprovanteBase64(null);
    setModalPagarVisible(true);
  };

  const handleAnexarComprovante = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        AppAlert.alert('Permissão', 'É necessário permitir acesso às fotos para anexar o comprovante.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        exif: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const uri = asset.uri;
      const exifDateTime = asset.exif?.DateTimeOriginal || asset.exif?.DateTime;
      if (exifDateTime) {
        const parsed = parseExifDateTime(exifDateTime);
        if (parsed) {
          if (parsed.data) setDataPagamento(parsed.data);
          if (parsed.horario) setHorarioPagamento(parsed.horario);
        }
      }
      if (FileSystem && uri) {
        try {
          const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
          setComprovanteBase64(base64);
          setComprovanteUri(uri);
        } catch (_) {
          setComprovanteUri(uri);
        }
      } else {
        setComprovanteUri(uri);
      }
    } catch (e) {
      if (e?.code !== 'E_PICKER_CANCELLED') AppAlert.alert('Erro', 'Não foi possível abrir as fotos.');
    }
  };

  const handleConfirmarPago = async () => {
    if (!itemPagar) return;
    setPayingId(itemPagar.id);
    const opts = {};
    if (dataPagamento?.trim()) opts.data = dataPagamento.trim();
    if (horarioPagamento?.trim()) opts.horario = horarioPagamento.trim();
    if (comprovanteBase64) opts.comprovante = comprovanteBase64;
    const { error } = await markSharedExpensePartPaid?.(itemPagar.id, opts) ?? {};
    setPayingId(null);
    setModalPagarVisible(false);
    setItemPagar(null);
    setDataPagamento('');
    setHorarioPagamento('');
    setComprovanteUri(null);
    setComprovanteBase64(null);
    if (error) {
      AppAlert.alert('Erro', error);
      return;
    }
    await refetchUserData?.();
    await load();
  };

  const total = list.reduce((s, i) => s + (i.valor || 0), 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Despesas que devo</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl * 2 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={styles.subtitle}>
          Despesas compartilhadas em que sua parte ainda está pendente. Ao marcar como pago, o valor é descontado da sua carteira.
        </Text>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhuma despesa pendente</Text>
            <Text style={styles.emptySub}>Quando alguém dividir uma despesa com você, sua parte aparecerá aqui.</Text>
          </View>
        ) : (
          <>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total a pagar</Text>
              <Text style={styles.totalValor}>R$ {total.toFixed(2).replace('.', ',')}</Text>
            </View>
            <View style={styles.card}>
              {list.map((item) => (
                <View key={item.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.descricao}>{item.descricao || 'Despesa compartilhada'}</Text>
                    <Text style={styles.owner}>Com {item.ownerNome}</Text>
                    <Text style={styles.valor}>R$ {(item.valor || 0).toFixed(2).replace('.', ',')}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.btnPaguei, payingId === item.id && styles.btnPagueiDisabled]}
                    onPress={() => abrirModalPagar(item)}
                    disabled={payingId !== null}
                  >
                    {payingId === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text style={styles.btnPagueiText}>Paguei</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={modalPagarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalPagarVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalPagarVisible(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Registrar pagamento</Text>
            {itemPagar && (
              <Text style={styles.modalSubtitle}>
                R$ {(itemPagar.valor || 0).toFixed(2).replace('.', ',')} — {itemPagar.descricao}
              </Text>
            )}
            <Text style={styles.modalLabel}>Data do pagamento (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="dd/mm/aaaa"
              placeholderTextColor={colors.textMuted}
              value={dataPagamento}
              onChangeText={(t) => setDataPagamento(maskDateInput(t))}
              keyboardType="numeric"
              maxLength={10}
            />
            <Text style={styles.modalLabel}>Horário (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="00:00"
              placeholderTextColor={colors.textMuted}
              value={horarioPagamento}
              onChangeText={(t) => setHorarioPagamento(maskTimeInput(t))}
              keyboardType="numeric"
              maxLength={5}
            />
            <Text style={styles.modalLabel}>Comprovante (opcional)</Text>
            {comprovanteUri ? (
              <View style={styles.comprovanteRow}>
                <Image source={{ uri: comprovanteUri }} style={styles.comprovantePreview} />
                <TouchableOpacity
                  style={styles.btnRemoverComprovante}
                  onPress={() => { setComprovanteUri(null); setComprovanteBase64(null); }}
                >
                  <Text style={styles.btnRemoverComprovanteText}>Remover</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.btnAnexar} onPress={handleAnexarComprovante}>
                <Ionicons name="attach" size={20} color={colors.textMuted} />
                <Text style={styles.btnAnexarText}>Anexar comprovante</Text>
              </TouchableOpacity>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalPagarVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnConfirm, payingId && styles.modalBtnConfirmDisabled]}
                onPress={handleConfirmarPago}
                disabled={!!payingId}
              >
                {payingId ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>Confirmar</Text>
                )}
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
  loading: { paddingVertical: spacing.xl * 2, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { fontSize: 16, color: colors.textMuted, marginTop: spacing.md },
  emptySub: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  totalCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  totalLabel: { fontSize: 14, color: colors.textMuted },
  totalValor: { fontSize: 22, fontWeight: '700', color: colors.spending, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
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
  rowLeft: { flex: 1 },
  descricao: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  owner: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  valor: { fontSize: 15, fontWeight: '600', color: colors.spending, marginTop: 4 },
  btnPaguei: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.positive,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  btnPagueiDisabled: { opacity: 0.7 },
  btnPagueiText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  modalSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  modalLabel: { fontSize: 14, color: colors.textMuted, marginTop: spacing.sm, marginBottom: 4 },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
  },
  comprovanteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  comprovantePreview: { width: 64, height: 64, borderRadius: borderRadius.sm, backgroundColor: '#222' },
  btnRemoverComprovante: { padding: spacing.sm },
  btnRemoverComprovanteText: { fontSize: 14, color: colors.spending },
  btnAnexar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.md,
    marginTop: 4,
  },
  btnAnexarText: { fontSize: 14, color: colors.textMuted },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalBtnCancel: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  modalBtnCancelText: { fontSize: 16, color: colors.textMuted },
  modalBtnConfirm: {
    backgroundColor: colors.positive,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  modalBtnConfirmDisabled: { opacity: 0.7 },
  modalBtnConfirmText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
