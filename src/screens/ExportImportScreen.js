import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { buildCSVFromData, parseCSVToData } from '../utils/exportImport';

let FileSystem;
let Sharing;
let DocumentPicker;
try {
  FileSystem = require('expo-file-system').default;
} catch (_) {}
try {
  Sharing = require('expo-sharing');
} catch (_) {}
try {
  DocumentPicker = require('expo-document-picker');
} catch (_) {}

let ViewShot;
try {
  ViewShot = require('react-native-view-shot').default;
} catch (_) {}

export default function ExportImportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    contas,
    cartoes,
    transacoes,
    objetivos,
    financiamentos,
    orcamentoMensal,
    importReplaceAll,
  } = useApp();
  const [loading, setLoading] = useState(false);
  const [exportMsg, setExportMsg] = useState(null);
  const viewShotRef = useRef(null);

  const exportData = () => ({
    contas: contas || [],
    cartoes: cartoes || [],
    transacoes: transacoes || [],
    objetivos: objetivos || [],
    financiamentos: financiamentos || [],
    orcamentoMensal: orcamentoMensal || {},
  });

  const handleExportCSV = async () => {
    setLoading(true);
    setExportMsg(null);
    try {
      const data = exportData();
      const csv = buildCSVFromData(data);
      const fileName = `FluxApp_dados_${new Date().toISOString().slice(0, 10)}.csv`;
      if (FileSystem && Sharing && (await Sharing.isAvailableAsync())) {
        const path = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path, {
          mimeType: 'text/csv',
          dialogTitle: 'Exportar dados (CSV)',
        });
        setExportMsg('Arquivo compartilhado.');
      } else {
        await Share.share({
          message: csv,
          title: fileName,
        });
        setExportMsg('Compartilhe ou copie o texto para salvar como CSV.');
      }
    } catch (e) {
      setExportMsg('Erro ao exportar: ' + (e.message || String(e)));
    }
    setLoading(false);
  };

  const handleExportImage = async () => {
    if (!ViewShot || !viewShotRef.current) {
      setExportMsg('Exportar como imagem não disponível neste dispositivo.');
      return;
    }
    setLoading(true);
    setExportMsg(null);
    try {
      const uri = await viewShotRef.current.capture();
      if (Sharing && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Exportar resumo (imagem)',
        });
        setExportMsg('Imagem compartilhada.');
      } else {
        await Share.share({ message: uri, title: 'Resumo FluxApp.png' });
        setExportMsg('Imagem compartilhada.');
      }
    } catch (e) {
      setExportMsg('Erro ao gerar imagem: ' + (e.message || String(e)));
    }
    setLoading(false);
  };

  const handleImportCSV = async () => {
    if (!DocumentPicker || !FileSystem) {
      Alert.alert('Importar', 'Selecione um pacote de documentos (expo-document-picker) e expo-file-system para importar CSV.');
      return;
    }
    setLoading(true);
    setExportMsg(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        setLoading(false);
        return;
      }
      const uri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = parseCSVToData(content);
      const count = {
        contas: (parsed.contas || []).length,
        cartoes: (parsed.cartoes || []).length,
        transacoes: (parsed.transacoes || []).length,
        objetivos: (parsed.objetivos || []).length,
        financiamentos: (parsed.financiamentos || []).length,
      };
      Alert.alert(
        'Confirmar importação',
        `O arquivo contém: ${count.contas} contas, ${count.cartoes} cartões, ${count.transacoes} transações, ${count.objetivos} objetivos, ${count.financiamentos} financiamentos. Substituir todos os dados atuais pelos do arquivo?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sim, substituir',
            onPress: () => {
              importReplaceAll(parsed);
              setExportMsg('Dados importados com sucesso.');
              navigation.goBack();
            },
          },
        ]
      );
    } catch (e) {
      setExportMsg('Erro ao importar: ' + (e.message || String(e)));
    }
    setLoading(false);
  };

  const totalReceitas = (transacoes || []).filter((x) => x.tipo === 'entrada').reduce((s, x) => s + (x.valor || 0), 0);
  const totalDespesas = (transacoes || []).filter((x) => x.tipo === 'saida' || x.tipo === 'despesa_cartao').reduce((s, x) => s + Math.abs(x.valor || 0), 0);
  const saldo = (contas || []).filter((c) => c.incluirNaSomaTelaInicial !== false).reduce((s, c) => s + (c.saldo || 0), 0);

  const ResumoView = (
    <View style={styles.resumoCard}>
      <Text style={styles.resumoTitle}>Resumo dos dados</Text>
      <Text style={styles.resumoLine}>Contas: {(contas || []).length}</Text>
      <Text style={styles.resumoLine}>Cartões: {(cartoes || []).length}</Text>
      <Text style={styles.resumoLine}>Transações: {(transacoes || []).length}</Text>
      <Text style={styles.resumoLine}>Objetivos: {(objetivos || []).length}</Text>
      <Text style={styles.resumoLine}>Financiamentos: {(financiamentos || []).length}</Text>
      <Text style={styles.resumoLine}>Total receitas: R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
      <Text style={styles.resumoLine}>Total despesas: R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
      <Text style={styles.resumoLine}>Saldo contas: R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
      <Text style={styles.resumoFooter}>FluxApp • {new Date().toLocaleDateString('pt-BR')}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Exportar e importar</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl * 2 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Exportar</Text>
        <TouchableOpacity style={styles.btn} onPress={handleExportCSV} disabled={loading}>
          <Ionicons name="document-text-outline" size={24} color={colors.primary} />
          <Text style={styles.btnText}>Exportar como CSV</Text>
          <Text style={styles.btnSub}>Compartilhar ou salvar todos os dados em planilha</Text>
        </TouchableOpacity>
        {ViewShot ? (
          <>
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={styles.viewShotInner} collapsable={false}>
              {ResumoView}
            </ViewShot>
            <TouchableOpacity style={styles.btn} onPress={handleExportImage} disabled={loading}>
              <Ionicons name="image-outline" size={24} color={colors.primary} />
              <Text style={styles.btnText}>Exportar como imagem</Text>
              <Text style={styles.btnSub}>Captura do resumo acima</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.btn, styles.btnDisabled]} onPress={handleExportImage} disabled>
            <Ionicons name="image-outline" size={24} color={colors.textMuted} />
            <Text style={[styles.btnText, { color: colors.textMuted }]}>Exportar como imagem</Text>
            <Text style={styles.btnSub}>Instale react-native-view-shot para usar</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>Importar</Text>
        <TouchableOpacity style={styles.btn} onPress={handleImportCSV} disabled={loading}>
          <Ionicons name="cloud-upload-outline" size={24} color={colors.secondary} />
          <Text style={styles.btnText}>Importar de CSV</Text>
          <Text style={styles.btnSub}>Escolher arquivo CSV exportado pelo app (substitui dados atuais)</Text>
        </TouchableOpacity>

        <Text style={styles.importImageNote}>
          Importar por imagem (foto de planilha) pode ser adicionado no futuro com reconhecimento de texto (OCR).
        </Text>

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        {exportMsg ? <Text style={styles.msg}>{exportMsg}</Text> : null}
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
  backBtn: { marginRight: spacing.sm, padding: spacing.xs },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  btn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginLeft: spacing.sm, flex: 1 },
  btnSub: { fontSize: 12, color: colors.textMuted, marginLeft: 32, marginTop: 2, width: '100%' },
  viewShotInner: { marginBottom: spacing.sm },
  resumoCard: {
    backgroundColor: colors.backgroundCard,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  resumoTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  resumoLine: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  resumoFooter: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  importImageNote: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  loadingWrap: { padding: spacing.lg, alignItems: 'center' },
  msg: { fontSize: 14, color: colors.positive, marginTop: spacing.sm },
});
