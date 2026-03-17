import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const ABA_GERENCIAR = 'GERENCIAR';
const ABA_GERAL = 'GERAL';
const ABA_SOBRE = 'SOBRE';

const opcoesGerenciar = [
  { id: 'perfil', label: 'Meu perfil', icon: 'person-outline', screen: 'Perfil' },
  { id: 'contas', label: 'Contas', icon: 'business-outline', screen: 'Contas' },
  { id: 'cartao', label: 'Cartão', icon: 'card-outline', screen: 'Cartoes' },
  { id: 'financiamentos', label: 'Financiamentos', icon: 'document-text-outline', screen: 'Financiamentos' },
  { id: 'categorias', label: 'Categorias', icon: 'pricetag-outline', screen: 'Categories' },
  { id: 'tags', label: 'Tags', icon: 'pricetags-outline', screen: null },
  { id: 'objetivos', label: 'Objetivos', icon: 'flag-outline', screen: 'Objetivos' },
  { id: 'usuarios', label: 'Usuários (dividir despesas)', icon: 'people-outline', screen: 'Usuarios' },
  { id: 'cobrancasRecebidas', label: 'Cobranças recebidas', icon: 'document-text-outline', screen: 'CobrancasRecebidas' },
  { id: 'importar', label: 'Importar dados', icon: 'cloud-upload-outline', screen: 'ExportImport' },
  { id: 'exportar', label: 'Exportar relatório', icon: 'cloud-download-outline', screen: 'ExportImport' },
  { id: 'cards', label: 'Cards da tela inicial', icon: 'grid-outline', screen: 'CardsDaTelaInicial' },
  { id: 'calculadoras', label: 'Calculadoras', icon: 'calculator-outline', screen: null },
  { id: 'modoViagem', label: 'Modo viagem', icon: 'airplane-outline', toggle: true },
  { id: 'lembrete', label: 'Lembrete diário', icon: 'notifications-outline', screen: null },
];

const opcoesGeral = [
  { id: 'moeda', label: 'Moeda', icon: 'cash-outline', value: 'Real (BRL)' },
  { id: 'idioma', label: 'Idioma', icon: 'language-outline', value: 'Português' },
];

const opcoesSobre = [
  { id: 'versao', label: 'Versão', icon: 'information-circle-outline', value: '1.0.0' },
  { id: 'termos', label: 'Termos de uso', icon: 'document-text-outline', screen: null },
  { id: 'privacidade', label: 'Política de privacidade', icon: 'shield-checkmark-outline', screen: null },
];

export default function MaisScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [aba, setAba] = useState(ABA_GERENCIAR);
  const [modoViagem, setModoViagem] = useState(false);
  const { resetAllData } = useApp();
  const { isAuthenticated, signOut } = useAuth();

  const abas = [
    { key: ABA_GERENCIAR, label: 'GERENCIAR' },
    { key: ABA_GERAL, label: 'GERAL' },
    { key: ABA_SOBRE, label: 'SOBRE' },
  ];

  const getOpcoes = () => {
    if (aba === ABA_GERAL) return opcoesGeral;
    if (aba === ABA_SOBRE) return opcoesSobre;
    const list = [...opcoesGerenciar];
    if (isAuthenticated) {
      list.push({ id: 'sair', label: 'Sair da conta', icon: 'log-out-outline', action: 'signOut' });
    }
    return list;
  };

  const handleOpcao = (op) => {
    if (op.toggle) return;
    if (op.action === 'signOut') {
      Alert.alert('Sair', 'Deseja sair da sua conta?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', onPress: () => signOut?.() },
      ]);
      return;
    }
    if (op.id === 'zerarDados') {
      Alert.alert(
        'Zerar dados do app',
        'Isso vai apagar contas, transações, cartões, objetivos, financiamentos, usuários, recebimentos e configurações. Essa ação não pode ser desfeita.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Zerar',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Confirmar',
                'Tem certeza? Todos os dados serão removidos deste aparelho.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Sim, zerar tudo', style: 'destructive', onPress: () => resetAllData?.() },
                ]
              );
            },
          },
        ]
      );
      return;
    }
    if (op.screen) {
      navigation.navigate(op.screen);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mais opções</Text>
      </View>
      <View style={styles.tabs}>
        {abas.map((a) => (
          <TouchableOpacity
            key={a.key}
            style={[styles.tab, aba === a.key && styles.tabActive]}
            onPress={() => setAba(a.key)}
          >
            <Text style={[styles.tabText, aba === a.key && styles.tabTextActive]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: (spacing.xl * 2) + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {getOpcoes().map((op) => (
          <TouchableOpacity
            key={op.id}
            style={styles.row}
            onPress={() => handleOpcao(op)}
            disabled={!!op.toggle}
            activeOpacity={op.toggle ? 1 : 0.7}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={op.icon} size={22} color={colors.secondary} />
            </View>
            <Text style={styles.rowLabel}>{op.label}</Text>
            {op.toggle ? (
              <Switch
                value={op.id === 'modoViagem' ? modoViagem : false}
                onValueChange={op.id === 'modoViagem' ? setModoViagem : undefined}
                trackColor={{ false: colors.backgroundCardElevated, true: colors.secondary + '99' }}
                thumbColor={modoViagem ? colors.secondary : colors.textMuted}
              />
            ) : op.value ? (
              <Text style={styles.rowValue}>{op.value}</Text>
            ) : op.screen ? (
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            ) : null}
          </TouchableOpacity>
        ))}
        {aba === ABA_GERENCIAR && (
          <TouchableOpacity style={[styles.row, styles.rowDanger]} onPress={() => handleOpcao({ id: 'zerarDados' })} activeOpacity={0.7}>
            <View style={[styles.iconWrap, styles.iconWrapDanger]}>
              <Ionicons name="trash-outline" size={22} color={colors.spending} />
            </View>
            <Text style={[styles.rowLabel, styles.rowLabelDanger]}>Zerar dados do app</Text>
            <Ionicons name="warning-outline" size={20} color={colors.spending} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.backgroundCard,
    gap: spacing.xs,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.secondary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 14,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  rowDanger: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  iconWrapDanger: {
    backgroundColor: colors.spending + '20',
  },
  rowLabelDanger: {
    color: colors.spending,
    fontWeight: '600',
  },
});
