import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { formatBRL, parseToRaw, rawToNumber, numberToRaw } from '../utils/currency';
import { maskDateInput, parseLocalDateFromYYYYMMDD } from '../utils/dateMask';

const CORES_OBJETIVO = [
  '#00BCD4', '#BB86FC', '#00C853', '#FF9800', '#FF5252', '#2196F3',
  '#8BC34A', '#607D8B', '#E91E63', '#9C27B0', '#3F51B5', '#009688',
  '#795548', '#F44336', '#FFEB3B', '#4CAF50', '#03A9F4', '#673AB7',
];

const ICONES_OBJETIVO = [
  'restaurant-outline', 'car-outline', 'shirt-outline', 'scan-outline', 'umbrella-outline',
  'pulse-outline', 'home-outline', 'book-outline', 'cash-outline', 'gift-outline',
  'trending-up-outline', 'shield-checkmark-outline', 'ellipsis-horizontal-outline', 'airplane-outline', 'people-outline',
  'business-outline', 'bag-outline', 'bicycle-outline', 'paw-outline', 'bookmark-outline',
  'briefcase-outline', 'bus-outline', 'calendar-outline', 'videocam-outline', 'camera-outline',
  'cart-outline', 'wallet-outline', 'phone-portrait-outline', 'stats-chart-outline', 'card-outline',
  'clipboard-outline', 'cafe-outline', 'chatbubble-outline', 'document-text-outline', 'desktop-outline',
  'diamond-outline', 'globe-outline', 'barbell-outline', 'mail-outline', 'happy-outline',
  'film-outline', 'flag-outline', 'flower-outline', 'brush-outline', 'game-controller-outline',
  'musical-notes-outline', 'construct-outline', 'heart-outline', 'trophy-outline', 'add',
  'calculator-outline', 'pricetag-outline', 'medkit-outline', 'nutrition-outline', 'school-outline',
];

function parseDataLimite(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split('/');
  if (parts.length < 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return null;
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDataParaInput(isoStr) {
  if (!isoStr) return '';
  const d = parseLocalDateFromYYYYMMDD(isoStr);
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

export default function AddObjetivoScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { addObjetivo, updateObjetivo } = useApp();
  const editar = route?.params?.editar;
  const duplicar = route?.params?.duplicar;
  const tipo = route?.params?.tipo;
  const isEdit = !!editar && !duplicar;

  const [nome, setNome] = useState('');
  const [valorMeta, setValorMeta] = useState('');
  const [valorInicial, setValorInicial] = useState('');
  const [dataLimiteStr, setDataLimiteStr] = useState('');
  const [icon, setIcon] = useState(null);
  const [color, setColor] = useState(null);
  const [modalIconVisible, setModalIconVisible] = useState(false);

  useEffect(() => {
    if (tipo && tipo.id !== 'personalizado') {
      setNome(tipo.label || '');
      setIcon(tipo.icon || null);
      setColor(tipo.color || null);
    }
  }, [tipo]);

  useEffect(() => {
    if (editar) {
      setNome(editar.nome || '');
      setValorMeta(editar.valorMeta > 0 ? numberToRaw(editar.valorMeta) : '');
      setValorInicial((editar.valorInicial || 0) > 0 ? numberToRaw(editar.valorInicial) : '');
      setDataLimiteStr(editar.dataLimite ? formatDataParaInput(editar.dataLimite) : '');
      setIcon(editar.icon || null);
      setColor(editar.color || null);
    }
    if (duplicar) {
      setNome((duplicar.nome || '') + ' (cópia)');
      setValorMeta(duplicar.valorMeta > 0 ? numberToRaw(duplicar.valorMeta) : '');
      setValorInicial((duplicar.valorInicial || 0) > 0 ? numberToRaw(duplicar.valorInicial) : '');
      setDataLimiteStr(duplicar.dataLimite ? formatDataParaInput(duplicar.dataLimite) : '');
      setIcon(duplicar.icon || null);
      setColor(duplicar.color || null);
    }
  }, [editar, duplicar]);

  const handleSalvar = () => {
    const nomeTrim = (nome || '').trim();
    if (!nomeTrim) {
      Alert.alert('Atenção', 'Informe o nome do objetivo.');
      return;
    }
    const valor = rawToNumber(valorMeta);
    const inicial = rawToNumber(valorInicial);
    if (valor <= 0) {
      Alert.alert('Atenção', 'Informe o valor da meta.');
      return;
    }
    if (inicial >= valor) {
      Alert.alert('Atenção', 'O valor da meta deve ser maior que o valor inicial.');
      return;
    }
    const dataLimite = parseDataLimite(dataLimiteStr);

    if (isEdit) {
      updateObjetivo(editar.id, {
        nome: nomeTrim,
        valorMeta: valor,
        valorInicial: inicial,
        dataLimite: dataLimite || editar.dataLimite,
        icon: icon || editar.icon,
        color: color || editar.color,
      });
      navigation.goBack();
      return;
    }
    if (duplicar) {
      const id = addObjetivo({
        nome: nomeTrim,
        valorMeta: valor,
        valorInicial: inicial,
        dataLimite,
        icon: icon || duplicar.icon,
        color: color || duplicar.color,
      });
      navigation.replace('ObjetivoDetalhes', { objetivoId: id });
      return;
    }
    const id = addObjetivo({
      nome: nomeTrim,
      valorMeta: valor,
      valorInicial: inicial,
      dataLimite,
      icon: icon || null,
      color: color || null,
    });
    navigation.replace('ObjetivoDetalhes', { objetivoId: id });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEdit ? 'Editar objetivo' : 'Novo objetivo'}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 80 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Fundo de emergência"
          placeholderTextColor={colors.textMuted}
          value={nome}
          onChangeText={setNome}
        />

        <Text style={styles.label}>Valor inicial (R$) — valor que já tem</Text>
        <TextInput
          style={styles.input}
          placeholder="R$ 0,00"
          placeholderTextColor={colors.textMuted}
          value={valorInicial === '' ? '' : formatBRL(valorInicial)}
          onChangeText={(t) => setValorInicial(parseToRaw(t))}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Valor da meta (R$) — deve ser maior que o valor inicial</Text>
        <TextInput
          style={styles.input}
          placeholder="R$ 0,00"
          placeholderTextColor={colors.textMuted}
          value={valorMeta === '' ? '' : formatBRL(valorMeta)}
          onChangeText={(t) => setValorMeta(parseToRaw(t))}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Data limite (dd/mm/aaaa)</Text>
        <TextInput
          style={styles.input}
          placeholder="dd/mm/aaaa"
          placeholderTextColor={colors.textMuted}
          value={dataLimiteStr}
          onChangeText={(t) => setDataLimiteStr(maskDateInput(t))}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Cor</Text>
        <View style={styles.colorRow}>
          {CORES_OBJETIVO.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorOption,
                { backgroundColor: c },
                color === c && styles.colorOptionSelected,
              ]}
              onPress={() => setColor(c)}
            >
              {color === c ? <Ionicons name="checkmark" size={16} color="#FFF" /> : null}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Ícone</Text>
        <TouchableOpacity
          style={styles.iconPickerBtn}
          onPress={() => setModalIconVisible(true)}
        >
          {icon ? (
            <View style={[styles.iconPreview, color && { backgroundColor: color + '40' }]}>
              <Ionicons name={icon} size={24} color={color || colors.secondary} />
            </View>
          ) : null}
          <Text style={styles.iconPickerText}>{icon ? 'Alterar ícone' : 'Escolher ícone'}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar} activeOpacity={0.8}>
          <Text style={styles.btnSalvarText}>{isEdit ? 'SALVAR' : 'CRIAR OBJETIVO'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalIconVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setModalIconVisible(false)}>
          <Pressable style={styles.modalIconBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalIconTitle}>Ícone</Text>
            <ScrollView style={styles.iconGridScroll} contentContainerStyle={styles.iconGrid}>
              {ICONES_OBJETIVO.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  style={[
                    styles.iconOption,
                    icon === ic && color && { backgroundColor: color + '40' },
                  ]}
                  onPress={() => { setIcon(ic); setModalIconVisible(false); }}
                >
                  <Ionicons
                    name={ic}
                    size={28}
                    color={icon === ic && color ? color : colors.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalIconFechar} onPress={() => setModalIconVisible(false)}>
              <Text style={styles.modalIconFecharText}>FECHAR</Text>
            </TouchableOpacity>
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
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  label: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  btnSalvar: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  btnSalvarText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: '#FFF',
  },
  iconPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  iconPreview: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconPickerText: { flex: 1, fontSize: 16, color: colors.textPrimary },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalIconBox: {
    backgroundColor: colors.backgroundCard,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: '60%',
  },
  modalIconTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  iconGridScroll: { maxHeight: 280 },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconOption: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.backgroundCardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconFechar: { marginTop: spacing.lg, alignItems: 'center' },
  modalIconFecharText: { fontSize: 14, fontWeight: '600', color: colors.secondary },
});
