import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Modal,
  TextInput,
  Pressable,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '../components/Icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { maskDateInput, maskTimeInput, parseExifDateTime } from '../utils/dateMask';
import { buildCobrancaPayload } from '../utils/exportImport';
import { AppAlert } from '../components/AppAlert';

let captureRef;
let Sharing;
let Clipboard;
let FileSystem;
try {
  captureRef = require('react-native-view-shot').captureRef;
} catch (_) {}
try {
  Sharing = require('expo-sharing');
} catch (_) {}
try {
  Clipboard = require('expo-clipboard');
} catch (_) {}
try {
  FileSystem = require('expo-file-system').default;
} catch (_) {}

export default function CobrancaUsuarioScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const {
    usuarios,
    perfil,
    getPrincipalUserId,
    getDespesasComParteDoUsuario,
    getValorAReceberDeUsuario,
    getValorAReceberRestanteDeUsuario,
    getRecebimentosDeUsuario,
    addRecebimento,
  } = useApp();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');
  const [modalRecebimentoVisible, setModalRecebimentoVisible] = useState(false);
  const [valorRecebimento, setValorRecebimento] = useState('');
  const [payerId, setPayerId] = useState(null);
  const [debtorId, setDebtorId] = useState(null);
  const [dataPagamento, setDataPagamento] = useState('');
  const [horarioPagamento, setHorarioPagamento] = useState('');
  const [comprovanteUri, setComprovanteUri] = useState(null);
  const [comprovanteBase64, setComprovanteBase64] = useState(null);
  const [modalSelectPayerVisible, setModalSelectPayerVisible] = useState(false);
  const [modalSelectDebtorVisible, setModalSelectDebtorVisible] = useState(false);
  const viewRef = useRef(null);

  const principalId = getPrincipalUserId();
  const outrosUsuarios = (usuarios || []).filter((u) => !u.principal && u.id);
  const despesasBrutas = userId ? getDespesasComParteDoUsuario(userId) : [];

  const now = new Date();
  const mesAtual = now.getMonth();
  const anoAtual = now.getFullYear();
  const proximoMes = mesAtual === 11 ? 0 : mesAtual + 1;
  const proximoAno = mesAtual === 11 ? anoAtual + 1 : anoAtual;
  const mesPassado = mesAtual === 0 ? 11 : mesAtual - 1;
  const anoPassado = mesAtual === 0 ? anoAtual - 1 : anoAtual;

  const getMesAnoDaTransacao = (t) => {
    if (t.tipo === 'despesa_cartao' && t.mesVencimento != null && t.anoVencimento != null) {
      return { mes: t.mesVencimento, ano: t.anoVencimento };
    }
    return { mes: t.mes ?? mesAtual, ano: t.ano ?? anoAtual };
  };

  const despesasDoUsuario = (() => {
    if (filtroPeriodo === 'todos') return despesasBrutas;
    return despesasBrutas.filter(({ transacao }) => {
      const { mes, ano } = getMesAnoDaTransacao(transacao);
      if (filtroPeriodo === 'mes_atual') return mes === mesAtual && ano === anoAtual;
      if (filtroPeriodo === 'proximo_mes') return mes === proximoMes && ano === proximoAno;
      if (filtroPeriodo === 'mes_passado') return mes === mesPassado && ano === anoPassado;
      return true;
    });
  })();

  const totalAReceber = Math.round(despesasDoUsuario.reduce((s, d) => s + d.valorParte, 0) * 100) / 100;
  const usuarioSelecionado = outrosUsuarios.find((u) => u.id === userId);

  const PERIODOS = [
    { id: 'todos', label: 'Todos' },
    { id: 'mes_passado', label: 'Mês passado' },
    { id: 'mes_atual', label: 'Mês atual' },
    { id: 'proximo_mes', label: 'Próximo mês' },
  ];

  const buildTextoCompletoCobranca = () => {
    if (!userId || !usuarioSelecionado) return '';
    const nome = usuarioSelecionado.nome || 'Usuário';
    const dataGeracao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const periodoLabel = PERIODOS.find((p) => p.id === filtroPeriodo)?.label || 'Todos';
    let texto = `💰 *RESUMO DE COBRANÇA*\n`;
    texto += `_Para: ${nome}_\n`;
    texto += `_Período: ${periodoLabel}_\n`;
    texto += `_Gerado em: ${dataGeracao}_\n\n`;
    if (despesasDoUsuario.length === 0) {
      texto += `Nenhuma despesa no período selecionado.\n\n`;
      return texto + `_FluxApp_`;
    }
    texto += `📋 *Despesas compartilhadas:*\n\n`;
    despesasDoUsuario.forEach(({ transacao, valorParte, porcentagem }, i) => {
      const desc = transacao.descricao || 'Despesa';
      const data = transacao.data || '—';
      const localStr = transacao.local ? ` (${transacao.local})` : '';
      const valorTotal = Math.abs(transacao.valor || 0);
      texto += `${i + 1}. *${desc}*${localStr}\n`;
      texto += `   📅 Data: ${data}\n`;
      texto += `   💵 Valor total: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      texto += `   📌 Sua parte (${porcentagem.toFixed(0)}%): R$ ${valorParte.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;
    });
    texto += `━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `✅ *TOTAL A PAGAR: R$ ${totalAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n`;
    texto += `_FluxApp • ${dataGeracao}_`;
    return texto;
  };

  const handleCopiarTexto = async () => {
    if (!userId) {
      setMsg('Selecione um usuário.');
      return;
    }
    const texto = buildTextoCompletoCobranca();
    if (!texto) return;
    try {
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(texto);
        setMsg('Texto copiado! Cole no WhatsApp ou onde quiser.');
      } else {
        await Share.share({ message: texto, title: 'Cobrança - copie o texto' });
        setMsg('Use a opção de compartilhar para enviar ou copiar.');
      }
    } catch (e) {
      setMsg('Erro ao copiar: ' + (e.message || String(e)));
    }
  };

  const handleCompartilharTexto = async () => {
    if (!userId) {
      setMsg('Selecione um usuário.');
      return;
    }
    const texto = buildTextoCompletoCobranca();
    if (!texto) return;
    try {
      await Share.share({
        message: texto,
        title: `Cobrança - ${usuarioSelecionado?.nome || 'Usuário'}`,
      });
      setMsg('Texto compartilhado.');
    } catch (e) {
      if (e.message !== 'User did not share') setMsg('Erro: ' + (e.message || String(e)));
    }
  };

  /** Compartilha dados da cobrança para o outro usuário importar no app (Mais → Importar cobrança recebida). */
  const handleCompartilharDadosApp = async () => {
    if (!userId || !usuarioSelecionado) {
      setMsg('Selecione um usuário.');
      return;
    }
    const principal = (usuarios || []).find((u) => u.principal);
    if (!principal) {
      setMsg('Usuário principal não encontrado.');
      return;
    }
    if (!usuarioSelecionado.cpf) {
      setMsg('Cadastre o CPF desse usuário em Mais → Usuários → Editar. Assim só ele conseguirá importar a cobrança no app.');
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const payload = buildCobrancaPayload({
        fromUser: {
          id: principal.id,
          nome: principal.nome || perfil?.nomeCompleto || 'Principal',
          cpf: perfil?.cpf,
        },
        toUser: {
          id: usuarioSelecionado.id,
          nome: usuarioSelecionado.nome || 'Usuário',
          cpf: usuarioSelecionado.cpf,
        },
        despesas: despesasDoUsuario,
        recebimentos: getRecebimentosDeUsuario ? getRecebimentosDeUsuario(userId) : [],
        totalAReceber,
      });
      const fileName = `FluxApp_cobranca_${usuarioSelecionado.nome || 'usuario'}_${new Date().toISOString().slice(0, 10)}.json`;
      if (FileSystem && Sharing && (await Sharing.isAvailableAsync())) {
        const path = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(path, payload, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path, {
          mimeType: 'application/json',
          dialogTitle: 'Compartilhar dados da cobrança',
        });
        setMsg('Envie o arquivo para a pessoa. Ela abre no app em Mais → Importar dados → Importar cobrança recebida.');
      } else {
        await Share.share({
          message: payload,
          title: fileName,
        });
        setMsg('Cole o conteúdo no app da outra pessoa em Mais → Importar dados → Importar cobrança recebida.');
      }
    } catch (e) {
      setMsg('Erro ao gerar: ' + (e.message || String(e)));
    }
    setLoading(false);
  };

  const aReceberRestante = userId ? (getValorAReceberRestanteDeUsuario?.(userId) ?? 0) : 0;
  const usuariosComRestante = outrosUsuarios.filter((u) => (getValorAReceberRestanteDeUsuario?.(u.id) ?? 0) > 0);
  const principalUser = (usuarios || []).find((u) => u.principal) || null;
  const principalNome = principalUser?.nome || 'Principal';
  const isPayerPrincipal = !!principalId && payerId === principalId;
  const debtorEfetivoId = isPayerPrincipal ? (debtorId || userId || usuariosComRestante[0]?.id) : (payerId || userId);
  const aReceberDoDebtorEfetivo = debtorEfetivoId ? (getValorAReceberRestanteDeUsuario?.(debtorEfetivoId) ?? 0) : 0;
  const debtorEfetivoNome = debtorEfetivoId
    ? (usuarios || []).find((u) => u.id === debtorEfetivoId)?.nome || 'Usuário'
    : null;
  const payerNome = payerId
    ? (payerId === principalId ? `${principalNome} (principal)` : ((usuarios || []).find((u) => u.id === payerId)?.nome || 'Usuário'))
    : null;

  const handleAbrirRegistrarRecebimento = () => {
    const quemTinhaRestante = userId && aReceberRestante > 0 ? userId : usuariosComRestante[0]?.id;
    if (!quemTinhaRestante) {
      setMsg('Nenhum usuário com valor a receber.');
      return;
    }
    setPayerId(quemTinhaRestante);
    setDebtorId(quemTinhaRestante);
    const restante = getValorAReceberRestanteDeUsuario?.(quemTinhaRestante) ?? 0;
    setValorRecebimento(restante > 0 ? restante.toFixed(2).replace('.', ',') : '');
    const hoje = new Date();
    setDataPagamento(hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    setModalRecebimentoVisible(true);
    setMsg(null);
  };

  useEffect(() => {
    if (route?.params?.openRecebimento === true) {
      handleAbrirRegistrarRecebimento();
      navigation.setParams?.({ openRecebimento: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.openRecebimento]);

  const handleTrocarPayer = (id) => {
    setPayerId(id);
    if (id === principalId) {
      const alvo = debtorId || userId || usuariosComRestante[0]?.id;
      if (alvo) {
        const restante = getValorAReceberRestanteDeUsuario?.(alvo) ?? 0;
        setValorRecebimento(restante > 0 ? restante.toFixed(2).replace('.', ',') : '');
      }
      return;
    }
    setDebtorId(id);
    const restante = getValorAReceberRestanteDeUsuario?.(id) ?? 0;
    setValorRecebimento(restante > 0 ? restante.toFixed(2).replace('.', ',') : '');
  };

  const handleTrocarDebtor = (id) => {
    setDebtorId(id);
    const restante = getValorAReceberRestanteDeUsuario?.(id) ?? 0;
    setValorRecebimento(restante > 0 ? restante.toFixed(2).replace('.', ',') : '');
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

  const handleConfirmarRecebimento = () => {
    const quemPagou = payerId || userId;
    const devedor = debtorEfetivoId;
    if (!quemPagou || !devedor) {
      setMsg('Selecione quem pagou e de qual usuário dar baixa.');
      return;
    }
    const valorStr = (valorRecebimento || '').replace(',', '.').trim();
    const valor = parseFloat(valorStr);
    const restanteDevedor = getValorAReceberRestanteDeUsuario?.(devedor) ?? 0;
    if (isNaN(valor) || valor <= 0) {
      setMsg('Informe o valor pago.');
      return;
    }
    if (valor > restanteDevedor) {
      setMsg(`O valor não pode ser maior que o restante a receber desse usuário (R$ ${restanteDevedor.toFixed(2).replace('.', ',')}).`);
      return;
    }
    const opts = {
      ...(quemPagou === principalId && { semReceita: true }),
      ...(horarioPagamento?.trim() && { horario: horarioPagamento.trim() }),
      ...(comprovanteBase64 && { comprovante: comprovanteBase64 }),
    };
    addRecebimento(devedor, valor, undefined, dataPagamento?.trim() || undefined, opts);
    setModalRecebimentoVisible(false);
    setValorRecebimento('');
    setDataPagamento('');
    setHorarioPagamento('');
    setComprovanteUri(null);
    setComprovanteBase64(null);
    setPayerId(null);
    setDebtorId(null);
    setMsg(quemPagou === principalId
      ? 'Baixa registrada (sem criar receita).'
      : 'Recebimento registrado! O valor foi adicionado às receitas.');
  };

  const handleFecharModalRecebimento = () => {
    setModalRecebimentoVisible(false);
    setHorarioPagamento('');
    setComprovanteUri(null);
    setComprovanteBase64(null);
  };

  const handleGerarImagem = async () => {
    if (!userId || !viewRef.current || !captureRef) {
      setMsg('Selecione um usuário e aguarde a tela carregar.');
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const uri = await captureRef(viewRef.current, {
        result: 'tmpfile',
        format: 'png',
        quality: 1,
      });
      if (Sharing && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Cobrança - ${usuarioSelecionado?.nome || 'Usuário'}`,
        });
        setMsg('Imagem compartilhada.');
      } else {
        await Share.share({ message: uri, title: `Cobrança - ${usuarioSelecionado?.nome}.png` });
        setMsg('Imagem compartilhada.');
      }
    } catch (e) {
      setMsg('Erro: ' + (e.message || String(e)));
    }
    setLoading(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Cobrança por usuário</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl * 2 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>Selecione para quem gerar o resumo de cobrança</Text>
        <View style={styles.chips}>
          {outrosUsuarios.map((u) => (
            <TouchableOpacity
              key={u.id}
              style={[styles.chip, userId === u.id && styles.chipActive]}
              onPress={() => setUserId(u.id)}
            >
              <Text style={[styles.chipText, userId === u.id && styles.chipTextActive]}>{u.nome}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {outrosUsuarios.length === 0 && (
          <Text style={styles.hint}>Cadastre outros usuários em Mais → Usuários e divida despesas com eles.</Text>
        )}
        {userId && (
          <>
            <Text style={styles.label}>Período</Text>
            <View style={styles.chips}>
              {PERIODOS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, filtroPeriodo === p.id && styles.chipActive]}
                  onPress={() => setFiltroPeriodo(p.id)}
                >
                  <Text style={[styles.chipText, filtroPeriodo === p.id && styles.chipTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View
              ref={viewRef}
              style={styles.cardResumo}
              collapsable={false}
            >
              <Text style={styles.resumoTitle}>Resumo para {usuarioSelecionado?.nome}</Text>
              <Text style={styles.resumoSub}>
                {filtroPeriodo === 'todos'
                  ? 'Sua parte nas despesas compartilhadas'
                  : `Período: ${PERIODOS.find((p) => p.id === filtroPeriodo)?.label || filtroPeriodo}`}
              </Text>
              {despesasDoUsuario.length === 0 ? (
                <Text style={styles.resumoEmpty}>
                  {filtroPeriodo === 'todos'
                    ? 'Nenhuma despesa dividida com esta pessoa no momento.'
                    : 'Nenhuma despesa neste período.'}
                </Text>
              ) : (
                <>
                  {despesasDoUsuario.map(({ transacao, valorParte, porcentagem }, i) => (
                    <View key={transacao.id} style={styles.resumoRow}>
                      <View style={styles.resumoRowLeft}>
                        <Text style={styles.resumoDesc} numberOfLines={1}>
                          {transacao.descricao || 'Despesa'}
                        </Text>
                        <Text style={styles.resumoData}>
                          {transacao.data || '—'}
                          {transacao.local ? ` • ${transacao.local}` : ''}
                        </Text>
                      </View>
                      <Text style={styles.resumoValor}>
                        R$ {valorParte.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        {porcentagem > 0 && (
                          <Text style={styles.resumoPct}> ({porcentagem.toFixed(0)}%)</Text>
                        )}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.resumoTotalWrap}>
                    <Text style={styles.resumoTotalLabel}>Total a pagar</Text>
                    <Text style={styles.resumoTotalValor}>
                      R$ {totalAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </>
              )}
              <Text style={styles.resumoFooter}>FluxApp • {new Date().toLocaleDateString('pt-BR')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.btnImagem, loading && styles.btnDisabled]}
              onPress={handleGerarImagem}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={22} color={colors.textPrimary} />
                  <Text style={styles.btnImagemText}>Gerar e compartilhar imagem</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={styles.btnTextRow}>
              <TouchableOpacity style={styles.btnTexto} onPress={handleCopiarTexto}>
                <Ionicons name="copy-outline" size={22} color={colors.textPrimary} />
                <Text style={styles.btnTextoText}>Copiar texto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnTexto} onPress={handleCompartilharTexto}>
                <Ionicons name="share-social-outline" size={22} color={colors.textPrimary} />
                <Text style={styles.btnTextoText}>Enviar texto (WhatsApp etc.)</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.btnImagem, { marginTop: spacing.sm, backgroundColor: colors.secondary }]}
              onPress={handleCompartilharDadosApp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="phone-portrait-outline" size={22} color="#fff" />
                  <Text style={[styles.btnImagemText, { color: '#fff' }]}>
                    Compartilhar dados para importar no app
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.btnTextHint}>
              A outra pessoa pode abrir o arquivo no FluxApp em Mais → Importar dados → Importar cobrança recebida.
            </Text>
            {usuariosComRestante.length > 0 && (
              <TouchableOpacity
                style={[styles.btnImagem, { backgroundColor: colors.positive, marginTop: spacing.sm }]}
                onPress={handleAbrirRegistrarRecebimento}
              >
                <Ionicons name="cash-outline" size={22} color="#fff" />
                <Text style={[styles.btnImagemText, { color: '#fff' }]}>
                  Registrar recebimento
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.btnTextHint}>
              Escolha o período acima. O texto e a imagem usam só as despesas do período selecionado.
            </Text>
          </>
        )}
        {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      </ScrollView>

      <Modal
        visible={modalRecebimentoVisible}
        transparent
        animationType="fade"
        onRequestClose={handleFecharModalRecebimento}
      >
        <Pressable style={styles.modalOverlay} onPress={handleFecharModalRecebimento}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Registrar recebimento</Text>
              <Text style={styles.modalSub}>
                Escolha quem pagou. Se for o principal, não cria receita — apenas dá baixa no alerta.
              </Text>
              <Text style={styles.modalLabel}>Quem pagou?</Text>
              <TouchableOpacity style={styles.selectRow} onPress={() => setModalSelectPayerVisible(true)} activeOpacity={0.8}>
                <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.selectRowText, !payerNome && styles.selectRowPlaceholder]}>
                  {payerNome || 'Selecionar usuário'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {isPayerPrincipal && (
                <>
                  <Text style={styles.modalLabel}>Dar baixa para qual usuário?</Text>
                  <TouchableOpacity style={styles.selectRow} onPress={() => setModalSelectDebtorVisible(true)} activeOpacity={0.8}>
                    <Ionicons name="people-outline" size={18} color={colors.textMuted} />
                    <Text style={[styles.selectRowText, !debtorEfetivoNome && styles.selectRowPlaceholder]}>
                      {debtorEfetivoNome || 'Selecionar usuário'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </>
              )}
              {payerId && (
                <>
                  <Text style={styles.modalLabel}>Data do pagamento (opcional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={dataPagamento}
                    onChangeText={(t) => setDataPagamento(maskDateInput(t))}
                    placeholder="dd/mm/aaaa — vazio = hoje"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                  <Text style={styles.modalLabel}>Horário (opcional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={horarioPagamento}
                    onChangeText={(t) => setHorarioPagamento(maskTimeInput(t))}
                    placeholder="HH:mm"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                  <Text style={styles.modalLabel}>Valor pago (receita)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={valorRecebimento}
                    onChangeText={setValorRecebimento}
                    placeholder={aReceberDoDebtorEfetivo > 0 ? `Ex: ${aReceberDoDebtorEfetivo.toFixed(2).replace('.', ',')} (valor total)` : '0,00'}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.modalLabel}>Comprovante (opcional)</Text>
                  {comprovanteUri ? (
                    <View style={styles.comprovantePreview}>
                      <Image source={{ uri: comprovanteUri }} style={styles.comprovanteImage} resizeMode="cover" />
                      <TouchableOpacity
                        style={styles.comprovanteRemover}
                        onPress={() => { setComprovanteUri(null); setComprovanteBase64(null); }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#fff" />
                        <Text style={styles.comprovanteRemoverText}>Remover</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.comprovanteBtn} onPress={handleAnexarComprovante}>
                      <Ionicons name="image-outline" size={22} color={colors.primary} />
                      <Text style={styles.comprovanteBtnText}>Anexar comprovante (ex.: PIX)</Text>
                      <Text style={styles.comprovanteBtnSub}>Se a imagem tiver data/hora, preenche automático</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={handleFecharModalRecebimento}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleConfirmarRecebimento}>
                <Text style={styles.modalBtnConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={modalSelectPayerVisible} transparent animationType="fade" onRequestClose={() => setModalSelectPayerVisible(false)}>
        <Pressable style={styles.selectModalBackdrop} onPress={() => setModalSelectPayerVisible(false)}>
          <Pressable style={styles.selectModalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.selectModalTitle}>Quem pagou?</Text>
            {!!principalId && (
              <TouchableOpacity
                style={styles.selectModalItem}
                onPress={() => {
                  handleTrocarPayer(principalId);
                  setModalSelectPayerVisible(false);
                }}
              >
                <Text style={styles.selectModalItemText}>{principalNome} (principal)</Text>
                <Text style={styles.selectModalItemSub}>Sem receita</Text>
              </TouchableOpacity>
            )}
            {usuariosComRestante.map((u) => {
              const restante = getValorAReceberRestanteDeUsuario?.(u.id) ?? 0;
              return (
                <TouchableOpacity
                  key={u.id}
                  style={styles.selectModalItem}
                  onPress={() => {
                    handleTrocarPayer(u.id);
                    setModalSelectPayerVisible(false);
                  }}
                >
                  <Text style={styles.selectModalItemText}>{u.nome}</Text>
                  <Text style={styles.selectModalItemSub}>R$ {restante.toFixed(2).replace('.', ',')} a receber</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.selectModalClose} onPress={() => setModalSelectPayerVisible(false)}>
              <Text style={styles.selectModalCloseText}>Fechar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={modalSelectDebtorVisible} transparent animationType="fade" onRequestClose={() => setModalSelectDebtorVisible(false)}>
        <Pressable style={styles.selectModalBackdrop} onPress={() => setModalSelectDebtorVisible(false)}>
          <Pressable style={styles.selectModalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.selectModalTitle}>Dar baixa para qual usuário?</Text>
            {usuariosComRestante.map((u) => {
              const restante = getValorAReceberRestanteDeUsuario?.(u.id) ?? 0;
              return (
                <TouchableOpacity
                  key={u.id}
                  style={styles.selectModalItem}
                  onPress={() => {
                    handleTrocarDebtor(u.id);
                    setModalSelectDebtorVisible(false);
                  }}
                >
                  <Text style={styles.selectModalItemText}>{u.nome}</Text>
                  <Text style={styles.selectModalItemSub}>R$ {restante.toFixed(2).replace('.', ',')} a receber</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.selectModalClose} onPress={() => setModalSelectDebtorVisible(false)}>
              <Text style={styles.selectModalCloseText}>Fechar</Text>
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
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  label: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.full,
  },
  chipActive: { backgroundColor: colors.secondary },
  chipText: { fontSize: 14, color: colors.textSecondary },
  chipTextActive: { color: colors.textPrimary, fontWeight: '600' },
  hint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg },
  cardResumo: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  resumoTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  resumoSub: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  resumoEmpty: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
  resumoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  resumoRowLeft: { flex: 1 },
  resumoDesc: { fontSize: 15, color: colors.textPrimary },
  resumoData: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  resumoValor: { fontSize: 15, fontWeight: '600', color: colors.spending },
  resumoPct: { fontSize: 12, color: colors.textMuted, fontWeight: '400' },
  resumoTotalWrap: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resumoTotalLabel: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  resumoTotalValor: { fontSize: 18, fontWeight: '700', color: colors.spending },
  resumoFooter: { fontSize: 12, color: colors.textMuted, marginTop: spacing.md },
  btnImagem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  btnDisabled: { opacity: 0.7 },
  btnImagemText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  btnTextRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  btnTexto: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  btnTextoText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  btnTextHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  msg: { fontSize: 14, color: colors.positive, marginTop: spacing.sm },
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
    maxWidth: 340,
    maxHeight: '90%',
  },
  modalScroll: { maxHeight: 360 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  modalSub: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  modalLabel: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
  modalChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  modalChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalChipActive: { backgroundColor: colors.secondary, borderColor: colors.primary },
  modalChipText: { fontSize: 14, color: colors.textSecondary },
  modalChipTextActive: { color: colors.textPrimary, fontWeight: '600' },
  modalChipRestante: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  comprovanteBtn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
    marginBottom: spacing.lg,
  },
  comprovanteBtnText: { fontSize: 15, color: colors.primary, fontWeight: '500' },
  comprovanteBtnSub: { fontSize: 12, color: colors.textMuted, width: '100%', marginLeft: 30 },
  comprovantePreview: { marginBottom: spacing.lg },
  comprovanteImage: { width: '100%', height: 160, borderRadius: borderRadius.md, backgroundColor: 'rgba(0,0,0,0.2)' },
  comprovanteRemover: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.spending,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  comprovanteRemoverText: { fontSize: 14, color: '#fff' },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  modalBtnCancel: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  modalBtnCancelText: { fontSize: 16, color: colors.textMuted },
  modalBtnConfirm: {
    backgroundColor: colors.positive,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  modalBtnConfirmText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  selectRowText: { flex: 1, fontSize: 16, color: colors.textPrimary },
  selectRowPlaceholder: { color: colors.textMuted },
  selectModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  selectModalBox: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
    maxHeight: 440,
  },
  selectModalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  selectModalItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.sm,
  },
  selectModalItemText: { fontSize: 16, color: colors.textPrimary, fontWeight: '600' },
  selectModalItemSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  selectModalClose: { marginTop: spacing.sm, padding: spacing.md, alignItems: 'center' },
  selectModalCloseText: { fontSize: 16, color: colors.textMuted, fontWeight: '600' },
});
