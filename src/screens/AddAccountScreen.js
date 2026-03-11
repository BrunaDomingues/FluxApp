import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
  Pressable,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { formatBRL, parseToRaw, rawToNumber, numberToRaw } from '../utils/currency';

const SPEECH_HTML = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:transparent;">
<script>
(function() {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ error: 'Não suportado' }));
    return;
  }
  window.startRecognition = function() {
    var rec = new SpeechRecognition();
    rec.lang = 'pt-BR';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = function(e) {
      var t = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) t += e.results[i][0].transcript;
      }
      if (t && window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ transcript: t }));
    };
    rec.onend = function() {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ done: true }));
    };
    rec.onerror = function(e) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ error: e.error || 'Erro' }));
    };
    rec.start();
  };
})();
</script>
</body>
</html>
`;

const BANCOS = [
  { id: 'nubank', nome: 'Nubank' },
  { id: 'inter', nome: 'Inter' },
  { id: 'itau', nome: 'Itaú' },
  { id: 'carteira', nome: 'Carteira' },
  { id: 'outro', nome: 'Outro' },
];

const TIPOS_CONTA = [
  { id: 'corrente', nome: 'Conta corrente' },
  { id: 'carteira', nome: 'Carteira' },
  { id: 'poupanca', nome: 'Poupança' },
  { id: 'investimentos', nome: 'Investimentos' },
  { id: 'vrva', nome: 'VR/VA' },
  { id: 'outro', nome: 'Outros...' },
];

const CORES_CONTA = [
  { id: 'c1', hex: '#00BCD4' },
  { id: 'c2', hex: '#BB86FC' },
  { id: 'c3', hex: '#8BC34A' },
  { id: 'c4', hex: '#FF9800' },
  { id: 'c5', hex: '#F44336' },
  { id: 'c6', hex: '#03A9F4' },
  { id: 'c7', hex: '#B39DDB' },
  { id: 'c8', hex: '#CDDC39' },
  { id: 'c9', hex: '#FFCC80' },
  { id: 'c10', hex: '#F48FB1' },
  { id: 'c11', hex: '#37474F' },
  { id: 'c12', hex: '#78909C' },
  { id: 'c13', hex: '#B0BEC5' },
  { id: 'c14', hex: '#ECEFF1' },
  { id: 'c15', hex: '#2196F3' },
  { id: 'c16', hex: '#14B8A6' },
  { id: 'c17', hex: '#2E7D32' },
  { id: 'c18', hex: '#FFEB3B' },
  { id: 'c19', hex: '#9E9D24' },
  { id: 'c20', hex: '#AD1457' },
  { id: 'c21', hex: '#795548' },
  { id: 'c22', hex: '#B71C1C' },
  { id: 'c23', hex: '#90A4AE' },
  { id: 'c24', hex: '#263238' },
  { id: 'c25', hex: '#80CBC4' },
  { id: 'c26', hex: '#7E57C2' },
  { id: 'c27', hex: '#EF5350' },
];

export default function AddAccountScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { addConta, updateConta, removeConta } = useApp();
  const editar = route?.params?.editar;
  const isEditMode = !!editar;

  const [nome, setNome] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [instituicaoId, setInstituicaoId] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [tipoContaId, setTipoContaId] = useState('corrente');
  const [corId, setCorId] = useState('c2');
  const [incluirNaSoma, setIncluirNaSoma] = useState(true);
  const [modalBanco, setModalBanco] = useState(false);
  const [modalTipo, setModalTipo] = useState(false);
  const [modalVoz, setModalVoz] = useState(false);
  const [vozCarregando, setVozCarregando] = useState(false);
  const webViewRef = useRef(null);

  const bottomSafe = insets.bottom || 12;

  const handleMicPress = () => {
    setModalVoz(true);
    setVozCarregando(true);
  };

  const handleWebViewLoad = () => {
    setVozCarregando(false);
    setTimeout(() => {
      webViewRef.current?.injectJavaScript('window.startRecognition && window.startRecognition();');
    }, 300);
  };

  const handleVozMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.transcript) {
        setDescricao((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
      }
      if (data.done || data.transcript) setModalVoz(false);
      if (data.error) {
        if (data.error !== 'aborted' && data.error !== 'no-speech') {
          Alert.alert('Reconhecimento de voz', data.error === 'not-allowed' ? 'Permita o uso do microfone nas configurações do app.' : 'Não foi possível transcrever.');
        }
        setModalVoz(false);
      }
    } catch (_) {}
  };

  React.useEffect(() => {
    if (editar) {
      setNome(editar.nome || '');
      setSaldoInicial(editar.saldo != null ? numberToRaw(editar.saldo) : '');
      setInstituicaoId(editar.instituicao ?? null);
      setDescricao(editar.descricao || '');
      setTipoContaId(editar.tipoConta || 'corrente');
      setCorId(editar.cor ? CORES_CONTA.find((x) => x.hex === editar.cor)?.id || 'c2' : 'c2');
      setIncluirNaSoma(editar.incluirNaSomaTelaInicial !== false);
    }
  }, [editar?.id]);

  const saldoNum = rawToNumber(saldoInicial);
  const instituicaoNome = instituicaoId ? (BANCOS.find((b) => b.id === instituicaoId)?.nome || instituicaoId) : null;
  const tipoNome = TIPOS_CONTA.find((t) => t.id === tipoContaId)?.nome || 'Conta corrente';
  const corHex = CORES_CONTA.find((c) => c.id === corId)?.hex ?? CORES_CONTA[1].hex;

  const handleSalvar = () => {
    const n = (nome || '').trim();
    if (!n) {
      Alert.alert('Atenção', 'Informe o nome da conta.');
      return;
    }
    if (isEditMode) {
      updateConta(editar.id, {
        nome: n,
        saldo: saldoNum,
        instituicao: instituicaoId,
        descricao: descricao.trim(),
        tipoConta: tipoContaId,
        cor: corHex,
        incluirNaSomaTelaInicial: incluirNaSoma,
      });
    } else {
      addConta({
        nome: n,
        saldoInicial: saldoNum,
        instituicao: instituicaoId,
        descricao: descricao.trim(),
        tipoConta: tipoContaId,
        cor: corHex,
        incluirNaSomaTelaInicial: incluirNaSoma,
      });
    }
    navigation.goBack();
  };

  const handleExcluir = () => {
    Alert.alert(
      'Excluir conta',
      `Excluir "${nome || editar?.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            removeConta(editar.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: bottomSafe }]}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
      {/* Header azul com saldo atual */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Editar conta' : 'Nova conta'}</Text>
        <View style={styles.headerSaldoBlock}>
          <Text style={styles.headerSaldoLabel}>Saldo atual da conta</Text>
          <Text style={styles.headerSaldoValue}>
            {saldoInicial === '' ? 'R$ 0,00' : formatBRL(saldoInicial)}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 80 + bottomSafe }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Saldo editável (no card) - opcional, já mostramos no header; usuário pode editar pelo campo */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Saldo inicial</Text>
          <TextInput
            style={styles.input}
            placeholder="R$ 0,00"
            placeholderTextColor={colors.textMuted}
            value={saldoInicial === '' ? '' : formatBRL(saldoInicial)}
            onChangeText={(text) => setSaldoInicial(parseToRaw(text))}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Nome da conta</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Carteira, Nubank"
            placeholderTextColor={colors.textMuted}
            value={nome}
            onChangeText={setNome}
          />
        </View>

        {/* Banco / Instituição */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.rowSelect}
            onPress={() => setModalBanco(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowSelectLeft}>
              <View style={styles.iconCirclePurple}>
                <Ionicons name="business-outline" size={20} color={colors.secondary} />
              </View>
              <Text style={styles.rowSelectLabel}>
                {instituicaoNome || 'Selecionar banco/instituição'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <Modal visible={modalBanco} transparent animationType="fade">
            <Pressable style={styles.modalBackdrop} onPress={() => setModalBanco(false)}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Banco / Instituição</Text>
                {BANCOS.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={styles.modalItem}
                    onPress={() => {
                      setInstituicaoId(b.id);
                      setModalBanco(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{b.nome}</Text>
                    {instituicaoId === b.id && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </Pressable>
          </Modal>
        </View>

        {/* Descrição */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Descrição</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={handleMicPress} style={styles.micButton}>
              <Ionicons name="mic-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              placeholder="Toque no microfone para falar e transcrever (pt-BR)"
              placeholderTextColor={colors.textMuted}
              value={descricao}
              onChangeText={setDescricao}
            />
          </View>
        </View>

        {/* Modal voz - WebView com Web Speech API (Google) */}
        <Modal visible={modalVoz} transparent animationType="fade">
          <View style={styles.modalVozBackdrop}>
            <View style={styles.modalVozContent}>
              {vozCarregando ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : null}
              <Text style={styles.modalVozTitle}>Ouvindo... fale agora.</Text>
              <Text style={styles.modalVozSub}>Use o reconhecimento de voz do Google (navegador).</Text>
              <TouchableOpacity style={styles.modalVozFechar} onPress={() => setModalVoz(false)}>
                <Text style={styles.modalVozFecharText}>Fechar</Text>
              </TouchableOpacity>
            </View>
            <WebView
              ref={webViewRef}
              source={{ html: SPEECH_HTML }}
              style={styles.webViewInvisivel}
              onLoadEnd={handleWebViewLoad}
              onMessage={handleVozMessage}
              javaScriptEnabled
              originWhitelist={['*']}
              mediaCapturePermissionGrantType="grant"
            />
          </View>
        </Modal>

        {/* Tipo da conta */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.rowSelect}
            onPress={() => setModalTipo(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowSelectLeft}>
              <Ionicons name="wallet-outline" size={22} color={colors.primary} style={styles.rowIcon} />
              <Text style={styles.rowSelectLabel}>{tipoNome}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <Modal visible={modalTipo} transparent animationType="fade">
            <Pressable style={styles.modalBackdrop} onPress={() => setModalTipo(false)}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Tipo da conta</Text>
                {TIPOS_CONTA.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.modalItem}
                    onPress={() => {
                      setTipoContaId(t.id);
                      setModalTipo(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{t.nome}</Text>
                    {tipoContaId === t.id && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </Pressable>
          </Modal>
        </View>

        {/* Cor da conta */}
        <View style={styles.card}>
          <View style={styles.corRow}>
            <Ionicons name="color-palette-outline" size={20} color={colors.textMuted} style={styles.rowIcon} />
            <Text style={styles.cardLabel}>Cor</Text>
          </View>
          <View style={styles.coresGrid}>
            {CORES_CONTA.map((c) => {
              const isLight = ['#CDDC39', '#FFEB3B', '#9E9D24', '#ECEFF1', '#B0BEC5', '#80CBC4'].includes(c.hex);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.corCircle, { backgroundColor: c.hex }, corId === c.id && styles.corCircleSelected]}
                  onPress={() => setCorId(c.id)}
                >
                  {corId === c.id && (
                    <Ionicons name="checkmark" size={16} color={isLight ? '#333' : '#FFF'} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Incluir na soma da tela inicial */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="help-circle-outline" size={20} color={colors.textMuted} style={styles.rowIcon} />
              <Text style={styles.toggleLabel}>Incluir na soma da tela inicial</Text>
            </View>
            <Switch
              value={incluirNaSoma}
              onValueChange={setIncluirNaSoma}
              trackColor={{ false: colors.backgroundCardElevated, true: colors.primary + '99' }}
              thumbColor={incluirNaSoma ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        {isEditMode && (
          <TouchableOpacity style={styles.excluirBtn} onPress={handleExcluir}>
            <Ionicons name="trash-outline" size={20} color={colors.spending} />
            <Text style={styles.excluirText}>Excluir conta</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Botão circular com check (flutuante) - mesmo padrão da tela de Categorias */}
      <TouchableOpacity
        style={[styles.fab, { bottom: bottomSafe }]}
        onPress={handleSalvar}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark" size={32} color="#FFF" />
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardWrap: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: spacing.md,
  },
  headerSaldoBlock: {
    marginTop: spacing.xs,
  },
  headerSaldoLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  headerSaldoValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  content: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundCardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  modalVozBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalVozContent: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  modalVozTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  modalVozSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  modalVozFechar: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  modalVozFecharText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  webViewInvisivel: {
    width: 1,
    height: 1,
    opacity: 0,
    position: 'absolute',
  },
  inputIcon: { marginRight: spacing.sm },
  inputWithIcon: { flex: 1 },
  rowSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowSelectLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  rowIcon: { marginRight: spacing.sm },
  iconCirclePurple: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    padding: spacing.md,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  modalItemText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  corRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  coresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  corCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corCircleSelected: {
    borderWidth: 2,
    borderColor: '#FFF',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  excluirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  excluirText: { fontSize: 14, color: colors.spending, fontWeight: '600' },
  fab: {
    position: 'absolute',
    left: '50%',
    marginLeft: -28,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
