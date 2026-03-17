import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { categoriasPadrao } from '../constants/categorias';
import {
  loadCategorias as loadCategoriasStorage,
  saveCategorias as saveCategoriasStorage,
  loadCardsTelaInicial as loadCardsStorage,
  saveCardsTelaInicial as saveCardsStorage,
  loadFinanciamentos as loadFinanciamentosStorage,
  saveFinanciamentos as saveFinanciamentosStorage,
  loadObjetivos as loadObjetivosStorage,
  saveObjetivos as saveObjetivosStorage,
  loadContas as loadContasStorage,
  saveContas as saveContasStorage,
  loadCartoes as loadCartoesStorage,
  saveCartoes as saveCartoesStorage,
  loadTransacoes as loadTransacoesStorage,
  saveTransacoes as saveTransacoesStorage,
  loadOrcamentoMensal as loadOrcamentoMensalStorage,
  saveOrcamentoMensal as saveOrcamentoMensalStorage,
  loadUsuarios as loadUsuariosStorage,
  saveUsuarios as saveUsuariosStorage,
  loadRecebimentosUsuarios as loadRecebimentosUsuariosStorage,
  saveRecebimentosUsuarios as saveRecebimentosUsuariosStorage,
  loadCobrancasRecebidas as loadCobrancasRecebidasStorage,
  saveCobrancasRecebidas as saveCobrancasRecebidasStorage,
  loadPerfil as loadPerfilStorage,
  savePerfil as savePerfilStorage,
  clearAllFluxAppData,
  getStorageOwner,
  setStorageOwner,
  saveAllAppDataToStorage,
} from '../utils/storage';
import { parseDateDDMM } from '../utils/dateMask';
import { useAuth } from './AuthContext';
import { loadUserData, saveUserData } from '../lib/supabaseSync';

const PRINCIPAL_ID = 'principal';

const AppContext = createContext(null);

const CARDS_PADRAO = {
  pendenciasAlertas: true,
  contas: true,
  cartoes: true,
  financiamentos: false,
  despesasPorCategoria: true,
  planejamentoMensal: true,
  economiaMensal: false,
  frequenciaGastos: false,
  balancoMensal: true,
  transacoesFavoritas: false,
  objetivos: false,
};

const CARDS_ORDER_DEFAULT = [
  'pendenciasAlertas', 'contas', 'cartoes', 'financiamentos', 'despesasPorCategoria', 'planejamentoMensal',
  'economiaMensal', 'frequenciaGastos', 'balancoMensal', 'transacoesFavoritas', 'objetivos',
];

export function AppProvider({ children }) {
  const {
    user,
    getLinkedUsers,
    onRecebimentoFromUser,
    deleteUnpaidSharedExpensePartsByTransacao,
    deleteAllUnpaidSharedExpensePartsAsOwner,
  } = useAuth();
  const [supabaseFetchDone, setSupabaseFetchDone] = useState(false);
  const [hydratedFromSupabase, setHydratedFromSupabase] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const saveToSupabaseTimeoutRef = useRef(null);
  const retrySyncIntervalRef = useRef(null);

  const [contas, setContas] = useState([
    { id: 'carteira', nome: 'Carteira', saldo: 0 },
  ]);
  const [contasLoaded, setContasLoaded] = useState(false);
  const [cartoes, setCartoes] = useState([]);
  const [cartoesLoaded, setCartoesLoaded] = useState(false);
  const [categorias, setCategorias] = useState(categoriasPadrao);
  const [categoriasLoaded, setCategoriasLoaded] = useState(false);
  const [transacoes, setTransacoes] = useState([]);
  const [transacoesLoaded, setTransacoesLoaded] = useState(false);
  const [cardsDaTelaInicial, setCardsDaTelaInicialState] = useState(CARDS_PADRAO);
  const [cardsOrdem, setCardsOrdemState] = useState(CARDS_ORDER_DEFAULT);
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [financiamentos, setFinanciamentosState] = useState([]);
  const [financiamentosLoaded, setFinanciamentosLoaded] = useState(false);
  const [objetivos, setObjetivosState] = useState([]);
  const [objetivosLoaded, setObjetivosLoaded] = useState(false);
  const [orcamentoMensal, setOrcamentoMensalState] = useState({});
  const [orcamentoLoaded, setOrcamentoLoaded] = useState(false);
  const [usuariosOutros, setUsuariosOutros] = useState([]);
  const [usuariosLoaded, setUsuariosLoaded] = useState(false);
  const [recebimentosDeUsuarios, setRecebimentosDeUsuarios] = useState([]);
  const [recebimentosLoaded, setRecebimentosLoaded] = useState(false);
  const [cobrancasRecebidas, setCobrancasRecebidas] = useState([]);
  const [cobrancasRecebidasLoaded, setCobrancasRecebidasLoaded] = useState(false);
  const [perfil, setPerfilState] = useState(null);
  const [perfilLoaded, setPerfilLoaded] = useState(false);

  const resetAllData = useCallback(async () => {
    if (saveToSupabaseTimeoutRef.current) {
      clearTimeout(saveToSupabaseTimeoutRef.current);
      saveToSupabaseTimeoutRef.current = null;
    }
    await clearAllFluxAppData();
    const contaInicial = [{ id: 'carteira', nome: 'Carteira', saldo: 0 }];
    const payloadZerado = {
      contas: contaInicial,
      cartoes: [],
      transacoes: [],
      objetivos: [],
      financiamentos: [],
      orcamentoMensal: {},
      recebimentosUsuarios: [],
      usuarios: [],
      cobrancasRecebidas: [],
      perfil: null,
      categorias: categoriasPadrao,
      cardsTelaInicial: { enabled: CARDS_PADRAO, order: CARDS_ORDER_DEFAULT },
    };
    setCategorias(categoriasPadrao);
    setCardsDaTelaInicialState(CARDS_PADRAO);
    setCardsOrdemState(CARDS_ORDER_DEFAULT);
    setFinanciamentosState([]);
    setObjetivosState([]);
    setOrcamentoMensalState({});
    setUsuariosOutros([]);
    setRecebimentosDeUsuarios([]);
    setCobrancasRecebidas([]);
    setPerfilState(null);
    setCartoes([]);
    setTransacoes([]);
    setContas(contaInicial);
    if (user?.id) {
      // Se o usuário zerar os dados, remove do outro lado as partes NÃO pagas criadas por ele.
      await deleteAllUnpaidSharedExpensePartsAsOwner?.();
      const { error } = await saveUserData(user.id, payloadZerado, { overwrite: true });
      if (error) return { error };
    }
    return {};
  }, [user?.id, deleteAllUnpaidSharedExpensePartsAsOwner]);

  useEffect(() => {
    if (!user?.id) {
      setSupabaseFetchDone(true);
      return;
    }
    let cancelled = false;
    getStorageOwner().then((owner) => {
      if (cancelled) return;
      if (owner && owner.userId !== user.id) {
        return clearAllFluxAppData();
      }
    }).then(() => {
      if (cancelled) return;
      setSupabaseFetchDone(false);
      setHydratedFromSupabase(false);
      setContas([{ id: 'carteira', nome: 'Carteira', saldo: 0 }]);
      setCartoes([]);
      setTransacoes([]);
      setFinanciamentosState([]);
      setObjetivosState([]);
      setOrcamentoMensalState({});
      setUsuariosOutros([]);
      setRecebimentosDeUsuarios([]);
      setCobrancasRecebidas([]);
      setPerfilState(null);
      setCategorias(categoriasPadrao);
      setCardsDaTelaInicialState(CARDS_PADRAO);
      setCardsOrdemState(CARDS_ORDER_DEFAULT);
      setContasLoaded(false);
      setCartoesLoaded(false);
      setTransacoesLoaded(false);
      setObjetivosLoaded(false);
      setFinanciamentosLoaded(false);
      setOrcamentoLoaded(false);
      setUsuariosLoaded(false);
      setRecebimentosLoaded(false);
      setCobrancasRecebidasLoaded(false);
      setPerfilLoaded(false);
      setCategoriasLoaded(false);
      setCardsLoaded(false);
      return loadUserData(user.id);
    }).then((data) => {
      if (cancelled) return;
      setSupabaseFetchDone(true);
      if (data && (data.contas?.length > 0 || data.transacoes?.length > 0 || Object.keys(data.orcamentoMensal || {}).length > 0 || data.usuarios?.length > 0 || data.cartoes?.length > 0 || data.objetivos?.length > 0 || data.financiamentos?.length > 0 || data.recebimentosUsuarios?.length > 0 || data.cobrancasRecebidas?.length > 0 || data.perfil)) {
        if (data.contas?.length > 0) setContas(data.contas);
        if (data.cartoes?.length >= 0) setCartoes(data.cartoes || []);
        if (data.transacoes?.length >= 0) setTransacoes(data.transacoes || []);
        if (data.objetivos?.length >= 0) setObjetivosState(data.objetivos || []);
        if (data.financiamentos?.length >= 0) setFinanciamentosState(data.financiamentos || []);
        if (data.orcamentoMensal && typeof data.orcamentoMensal === 'object') setOrcamentoMensalState(data.orcamentoMensal);
        if (data.recebimentosUsuarios?.length >= 0) setRecebimentosDeUsuarios(data.recebimentosUsuarios || []);
        if (data.cobrancasRecebidas?.length >= 0) setCobrancasRecebidas(data.cobrancasRecebidas || []);
        if (data.perfil && typeof data.perfil === 'object') setPerfilState(data.perfil);
        if (data.usuarios?.length >= 0) {
          const outros = (data.usuarios || []).filter(
            (u) => u.id !== PRINCIPAL_ID && u.id !== user?.id && !u.principal
          );
          setUsuariosOutros(outros);
        }
        if (Array.isArray(data.categorias) && data.categorias.length > 0) setCategorias(data.categorias);
        if (data.cardsTelaInicial && typeof data.cardsTelaInicial === 'object') {
          if (data.cardsTelaInicial.enabled) setCardsDaTelaInicialState((p) => ({ ...p, ...data.cardsTelaInicial.enabled }));
          if (Array.isArray(data.cardsTelaInicial.order)) setCardsOrdemState(data.cardsTelaInicial.order);
        }
        setContasLoaded(true);
        setCartoesLoaded(true);
        setTransacoesLoaded(true);
        setObjetivosLoaded(true);
        setFinanciamentosLoaded(true);
        setOrcamentoLoaded(true);
        setUsuariosLoaded(true);
        setRecebimentosLoaded(true);
        setCobrancasRecebidasLoaded(true);
        setPerfilLoaded(true);
        setCategoriasLoaded(true);
        setCardsLoaded(true);
        setHydratedFromSupabase(true);
        saveAllAppDataToStorage(data);
      } else {
        setContasLoaded(true);
        setCartoesLoaded(true);
        setTransacoesLoaded(true);
        setObjetivosLoaded(true);
        setFinanciamentosLoaded(true);
        setOrcamentoLoaded(true);
        setUsuariosLoaded(true);
        setRecebimentosLoaded(true);
        setCobrancasRecebidasLoaded(true);
        setPerfilLoaded(true);
        setCategoriasLoaded(true);
        setCardsLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  /** Recarrega dados principais do Supabase (útil após marcar despesa compartilhada como paga / confirmar recebimento). */
  const refetchUserData = useCallback(() => {
    if (!user?.id) return Promise.resolve();
    return loadUserData(user.id).then((data) => {
      if (data?.contas?.length > 0) setContas(data.contas);
      if (data?.transacoes) setTransacoes(data.transacoes || []);
      if (data?.recebimentosUsuarios) setRecebimentosDeUsuarios(data.recebimentosUsuarios || []);
      if (data?.cobrancasRecebidas) setCobrancasRecebidas(data.cobrancasRecebidas || []);
    });
  }, [user?.id]);

  /** Sincroniza agora com o Supabase (antes de sair ou para retry). Retorna promise que resolve com { error } se falhar. */
  const syncToSupabaseNow = useCallback(() => {
    if (saveToSupabaseTimeoutRef.current) {
      clearTimeout(saveToSupabaseTimeoutRef.current);
      saveToSupabaseTimeoutRef.current = null;
    }
    if (!user?.id) return Promise.resolve({ error: null });
    const payload = {
      contas,
      cartoes,
      transacoes,
      objetivos,
      financiamentos,
      orcamentoMensal,
      recebimentosUsuarios: recebimentosDeUsuarios,
      usuarios: [
        { id: PRINCIPAL_ID, nome: perfil?.nomeCompleto || 'Principal', principal: true },
        ...(usuariosOutros || []),
      ],
      cobrancasRecebidas,
      perfil,
      categorias,
      cardsTelaInicial: { enabled: cardsDaTelaInicial, order: cardsOrdem },
    };
    return saveUserData(user.id, payload).then(({ error }) => {
      setPendingSync(!!error);
      if (!error) saveAllAppDataToStorage(payload);
      return { error };
    });
  }, [user?.id, contas, cartoes, transacoes, objetivos, financiamentos, orcamentoMensal, recebimentosDeUsuarios, usuariosOutros, cobrancasRecebidas, perfil, categorias, cardsDaTelaInicial, cardsOrdem]);

  useEffect(() => {
    if (user?.id && supabaseFetchDone) {
      setStorageOwner({ userId: user.id, cpf: perfil?.cpf ?? null });
    }
  }, [user?.id, supabaseFetchDone, perfil?.cpf]);

  useEffect(() => {
    if (!user?.id) return;
    const allLoaded =
      contasLoaded &&
      cartoesLoaded &&
      transacoesLoaded &&
      objetivosLoaded &&
      financiamentosLoaded &&
      orcamentoLoaded &&
      usuariosLoaded &&
      recebimentosLoaded &&
      cobrancasRecebidasLoaded &&
      perfilLoaded &&
      categoriasLoaded &&
      cardsLoaded;
    if (!allLoaded) return;
    if (saveToSupabaseTimeoutRef.current) clearTimeout(saveToSupabaseTimeoutRef.current);
    saveToSupabaseTimeoutRef.current = setTimeout(() => {
      saveToSupabaseTimeoutRef.current = null;
      const payload = {
        contas,
        cartoes,
        transacoes,
        objetivos,
        financiamentos,
        orcamentoMensal,
        recebimentosUsuarios: recebimentosDeUsuarios,
        usuarios: usuariosForPayload,
        cobrancasRecebidas,
        perfil,
        categorias,
        cardsTelaInicial: { enabled: cardsDaTelaInicial, order: cardsOrdem },
      };
      saveUserData(user.id, payload).then(({ error }) => {
        setPendingSync(!!error);
        if (!error) saveAllAppDataToStorage(payload);
      });
    }, 1500);
    return () => {
      if (saveToSupabaseTimeoutRef.current) clearTimeout(saveToSupabaseTimeoutRef.current);
    };
  }, [
    user?.id,
    contas,
    cartoes,
    transacoes,
    objetivos,
    financiamentos,
    orcamentoMensal,
    recebimentosDeUsuarios,
    usuariosForPayload,
    cobrancasRecebidas,
    perfil,
    categorias,
    cardsDaTelaInicial,
    cardsOrdem,
    contasLoaded,
    cartoesLoaded,
    transacoesLoaded,
    objetivosLoaded,
    financiamentosLoaded,
    orcamentoLoaded,
    usuariosLoaded,
    recebimentosLoaded,
    cobrancasRecebidasLoaded,
    perfilLoaded,
    categoriasLoaded,
    cardsLoaded,
  ]);

  useEffect(() => {
    if (!pendingSync || !user?.id) return;
    const retry = () => syncToSupabaseNow().then(({ error }) => { if (!error) setPendingSync(false); });
    const id = setInterval(retry, 30000);
    retrySyncIntervalRef.current = id;
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') retry(); });
    return () => {
      clearInterval(id);
      sub?.remove();
    };
  }, [pendingSync, user?.id, syncToSupabaseNow]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') clearAllFluxAppData();
    });
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    if (user && supabaseFetchDone) return;
    let cancelled = false;
    loadCategoriasStorage().then((saved) => {
      if (!cancelled && saved && saved.length > 0) {
        setCategorias(saved);
      }
      if (!cancelled) setCategoriasLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user, supabaseFetchDone, hydratedFromSupabase]);

  useEffect(() => {
    if (user && supabaseFetchDone) return;
    let cancelled = false;
    loadCardsStorage().then((saved) => {
      if (!cancelled && saved && typeof saved === 'object') {
        setCardsDaTelaInicialState((prev) => ({ ...CARDS_PADRAO, ...(saved.enabled || saved) }));
        if (Array.isArray(saved.order) && saved.order.length > 0) {
          setCardsOrdemState(saved.order);
        }
      }
      if (!cancelled) setCardsLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user, supabaseFetchDone, hydratedFromSupabase]);

  useEffect(() => {
    if (!cardsLoaded) return;
    saveCardsStorage({ enabled: cardsDaTelaInicial, order: cardsOrdem });
  }, [cardsDaTelaInicial, cardsOrdem, cardsLoaded]);

  useEffect(() => {
    if (user && supabaseFetchDone) return;
    let cancelled = false;
    loadFinanciamentosStorage().then((saved) => {
      if (!cancelled && saved && Array.isArray(saved)) {
        setFinanciamentosState(saved);
      }
      if (!cancelled) setFinanciamentosLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user, supabaseFetchDone, hydratedFromSupabase]);

  useEffect(() => {
    if (!financiamentosLoaded) return;
    saveFinanciamentosStorage(financiamentos);
  }, [financiamentos, financiamentosLoaded]);

  useEffect(() => {
    if (user && supabaseFetchDone) return;
    let cancelled = false;
    loadObjetivosStorage().then((saved) => {
      if (!cancelled && saved && Array.isArray(saved)) {
        setObjetivosState(saved);
      }
      if (!cancelled) setObjetivosLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user, supabaseFetchDone, hydratedFromSupabase]);

  useEffect(() => {
    if (!objetivosLoaded) return;
    saveObjetivosStorage(objetivos);
  }, [objetivos, objetivosLoaded]);

  useEffect(() => {
    if (user && supabaseFetchDone) return;
    let cancelled = false;
    loadContasStorage().then((saved) => {
      if (!cancelled && saved && Array.isArray(saved) && saved.length > 0) {
        setContas(saved);
      }
      if (!cancelled) setContasLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user, supabaseFetchDone, hydratedFromSupabase]);

  useEffect(() => {
    if (!contasLoaded) return;
    saveContasStorage(contas);
  }, [contas, contasLoaded]);

  useEffect(() => {
    if (user && supabaseFetchDone) return;
    let cancelled = false;
    loadCartoesStorage().then((saved) => {
      if (!cancelled && saved && Array.isArray(saved)) {
        setCartoes(saved);
      }
      if (!cancelled) setCartoesLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user, supabaseFetchDone, hydratedFromSupabase]);

  useEffect(() => {
    if (!cartoesLoaded) return;
    saveCartoesStorage(cartoes);
  }, [cartoes, cartoesLoaded]);

  useEffect(() => {
    if (user && supabaseFetchDone) return;
    let cancelled = false;
    loadTransacoesStorage().then((saved) => {
      if (!cancelled && saved && Array.isArray(saved)) {
        setTransacoes(saved);
      }
      if (!cancelled) setTransacoesLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user, supabaseFetchDone, hydratedFromSupabase]);

  useEffect(() => {
    if (!transacoesLoaded) return;
    saveTransacoesStorage(transacoes);
  }, [transacoes, transacoesLoaded]);

  useEffect(() => {
    if (user && supabaseFetchDone) return;
    let cancelled = false;
    loadOrcamentoMensalStorage().then((saved) => {
      if (!cancelled && saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
        setOrcamentoMensalState(saved);
      }
      if (!cancelled) setOrcamentoLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user, supabaseFetchDone, hydratedFromSupabase]);

  useEffect(() => {
    if (!orcamentoLoaded) return;
    saveOrcamentoMensalStorage(orcamentoMensal);
  }, [orcamentoMensal, orcamentoLoaded]);

  useEffect(() => {
    if (user && supabaseFetchDone) return;
    let cancelled = false;
    loadUsuariosStorage().then((saved) => {
      if (!cancelled && saved && Array.isArray(saved)) {
        setUsuariosOutros(
          saved.filter((u) => u.id !== PRINCIPAL_ID && u.id !== user?.id && !u.principal)
        );
      }
      if (!cancelled) setUsuariosLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user?.id, supabaseFetchDone, hydratedFromSupabase]);

  useEffect(() => {
    if (!usuariosLoaded) return;
    const full = [
      { id: PRINCIPAL_ID, nome: perfil?.nomeCompleto || 'Principal', principal: true },
      ...(usuariosOutros || []),
    ];
    saveUsuariosStorage(full);
  }, [usuariosOutros, perfil, usuariosLoaded]);

  useEffect(() => {
    if (user && supabaseFetchDone) return;
    let cancelled = false;
    loadRecebimentosUsuariosStorage().then((saved) => {
      if (!cancelled && saved && Array.isArray(saved)) {
        setRecebimentosDeUsuarios(saved);
      }
      if (!cancelled) setRecebimentosLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user, supabaseFetchDone, hydratedFromSupabase]);

  useEffect(() => {
    if (!recebimentosLoaded) return;
    saveRecebimentosUsuariosStorage(recebimentosDeUsuarios);
  }, [recebimentosDeUsuarios, recebimentosLoaded]);

  useEffect(() => {
    if (user && supabaseFetchDone) return;
    let cancelled = false;
    loadCobrancasRecebidasStorage().then((saved) => {
      if (!cancelled && saved && Array.isArray(saved)) {
        setCobrancasRecebidas(saved);
      }
      if (!cancelled) setCobrancasRecebidasLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user, supabaseFetchDone, hydratedFromSupabase]);

  useEffect(() => {
    if (!cobrancasRecebidasLoaded) return;
    saveCobrancasRecebidasStorage(cobrancasRecebidas);
  }, [cobrancasRecebidas, cobrancasRecebidasLoaded]);

  useEffect(() => {
    if (user && supabaseFetchDone) return;
    let cancelled = false;
    loadPerfilStorage().then((saved) => {
      if (!cancelled && saved && typeof saved === 'object') {
        setPerfilState(saved);
      }
      if (!cancelled) setPerfilLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user, supabaseFetchDone, hydratedFromSupabase]);

  useEffect(() => {
    if (!perfilLoaded) return;
    savePerfilStorage(perfil);
  }, [perfil, perfilLoaded]);

  // Preenche perfil inicial a partir dos metadados do usuário do Supabase (nome/cpf do cadastro)
  useEffect(() => {
    if (!user?.id) return;
    if (!supabaseFetchDone) return;
    if (perfilLoaded && perfil) return;
    const meta = user.user_metadata || {};
    if (!meta.nome_completo && !meta.cpf) return;
    setPerfilState((prev) => prev || {
      nomeCompleto: meta.nome_completo || undefined,
      cpf: meta.cpf || undefined,
    });
  }, [user?.id, user?.user_metadata, supabaseFetchDone, perfilLoaded, perfil]);

  // Mescla usuários vinculados (conta convidou/convidado) em usuariosOutros; desvinculados continuam na lista com linked: false
  useEffect(() => {
    if (!user?.id || !supabaseFetchDone || !getLinkedUsers) return;
    let cancelled = false;
    getLinkedUsers().then(({ data }) => {
      if (cancelled) return;
      const linkedList = (data || []).filter((l) => l.id !== user?.id);
      const linkedById = new Map(linkedList.map((l) => [l.id, { ...l, linked: true }]));
      setUsuariosOutros((prev) => {
        const prevIds = new Set(prev.map((u) => u.id));
        const updated = prev
          .filter((u) => u.id !== user?.id)
          .map((u) => {
            if (linkedById.has(u.id)) {
              const l = linkedById.get(u.id);
              return { ...u, nome: l.nome || u.nome, email: l.email ?? u.email, linked: true };
            }
            if (u.linked) return { ...u, linked: false };
            return u;
          });
        linkedList.forEach((l) => {
          if (!prevIds.has(l.id)) updated.push({ id: l.id, nome: l.nome, email: l.email, linked: true });
        });
        return updated;
      });
    });
    return () => { cancelled = true; };
  }, [user?.id, supabaseFetchDone, getLinkedUsers]);

  const usuariosForPayload = useMemo(
    () => [
      { id: PRINCIPAL_ID, nome: perfil?.nomeCompleto || 'Principal', principal: true },
      ...(usuariosOutros || []),
    ],
    [perfil, usuariosOutros]
  );

  useEffect(() => {
    if (!user?.id) return;
    const allLoaded =
      contasLoaded &&
      cartoesLoaded &&
      transacoesLoaded &&
      objetivosLoaded &&
      financiamentosLoaded &&
      orcamentoLoaded &&
      usuariosLoaded &&
      recebimentosLoaded &&
      cobrancasRecebidasLoaded &&
      perfilLoaded &&
      categoriasLoaded &&
      cardsLoaded;
    if (!allLoaded) return;
    if (saveToSupabaseTimeoutRef.current) clearTimeout(saveToSupabaseTimeoutRef.current);
    saveToSupabaseTimeoutRef.current = setTimeout(() => {
      saveToSupabaseTimeoutRef.current = null;
      saveUserData(user.id, {
        contas,
        cartoes,
        transacoes,
        objetivos,
        financiamentos,
        orcamentoMensal,
        recebimentosUsuarios: recebimentosDeUsuarios,
        usuarios: usuariosForPayload,
        cobrancasRecebidas,
        perfil,
        categorias,
        cardsTelaInicial: { enabled: cardsDaTelaInicial, order: cardsOrdem },
      });
    }, 1500);
    return () => {
      if (saveToSupabaseTimeoutRef.current) clearTimeout(saveToSupabaseTimeoutRef.current);
    };
  }, [
    user?.id,
    contas,
    cartoes,
    transacoes,
    objetivos,
    financiamentos,
    orcamentoMensal,
    recebimentosDeUsuarios,
    usuariosForPayload,
    cobrancasRecebidas,
    perfil,
    categorias,
    cardsDaTelaInicial,
    cardsOrdem,
    contasLoaded,
    cartoesLoaded,
    transacoesLoaded,
    objetivosLoaded,
    financiamentosLoaded,
    orcamentoLoaded,
    usuariosLoaded,
    recebimentosLoaded,
    cobrancasRecebidasLoaded,
    perfilLoaded,
    categoriasLoaded,
    cardsLoaded,
  ]);

  const setPerfil = useCallback((data) => {
    setPerfilState((prev) => ({ ...prev, ...data }));
  }, []);

  const refreshLinkedUsers = useCallback(() => {
    if (!getLinkedUsers) return;
    getLinkedUsers().then(({ data }) => {
      const linkedList = (data || []).filter((l) => l.id !== user?.id);
      const linkedById = new Map(linkedList.map((l) => [l.id, { ...l, linked: true }]));
      setUsuariosOutros((prev) => {
        const prevIds = new Set(prev.map((u) => u.id));
        const updated = prev
          .filter((u) => u.id !== user?.id)
          .map((u) => {
            if (linkedById.has(u.id)) {
              const l = linkedById.get(u.id);
              return { ...u, nome: l.nome || u.nome, email: l.email ?? u.email, linked: true };
            }
            if (u.linked) return { ...u, linked: false };
            return u;
          });
        linkedList.forEach((l) => {
          if (!prevIds.has(l.id)) updated.push({ id: l.id, nome: l.nome, email: l.email, linked: true });
        });
        return updated;
      });
    });
  }, [getLinkedUsers, user?.id]);

  const usuarios = useMemo(
    () => [
      { id: PRINCIPAL_ID, nome: perfil?.nomeCompleto || 'Principal', principal: true },
      ...(usuariosOutros || []),
    ],
    [perfil, usuariosOutros]
  );

  const addCobrancaRecebida = useCallback((cobranca) => {
    const id = `cob_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setCobrancasRecebidas((prev) => [...prev, { ...cobranca, id, importedAt: new Date().toISOString() }]);
    return id;
  }, []);

  const addConta = useCallback((conta) => {
    setContas((prev) => [...prev, {
      id: Date.now().toString(),
      nome: conta.nome || '',
      saldo: conta.saldoInicial ?? 0,
      instituicao: conta.instituicao ?? null,
      descricao: conta.descricao ?? '',
      tipoConta: conta.tipoConta ?? 'corrente',
      cor: conta.cor ?? null,
      incluirNaSomaTelaInicial: conta.incluirNaSomaTelaInicial !== false,
      arquivada: false,
    }]);
  }, []);

  const updateConta = useCallback((id, payload) => {
    setContas((prev) => prev.map((c) => (c.id === id ? { ...c, ...payload } : c)));
  }, []);

  const removeConta = useCallback((id) => {
    setContas((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addCartao = useCallback((cartao) => {
    setCartoes((prev) => [...prev, {
      ...cartao,
      id: Date.now().toString(),
      limite: cartao.limite ?? 0,
      bandeira: cartao.bandeira ?? 'Outro',
      tipo: cartao.tipo === 'debito' ? 'debito' : 'credito',
      ativo: cartao.ativo !== false,
      diaFechamento: cartao.diaFechamento ?? null,
      diaVencimento: cartao.diaVencimento ?? null,
    }]);
  }, []);

  const updateCartao = useCallback((id, payload) => {
    setCartoes((prev) => prev.map((c) => (c.id === id ? { ...c, ...payload } : c)));
  }, []);

  const removeCartao = useCallback((id) => {
    setCartoes((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addCategoria = useCallback((cat) => {
    setCategorias((prev) => [...prev, {
      ...cat,
      id: Date.now().toString(),
      icon: cat.icon || 'pricetag-outline',
    }]);
  }, []);

  const addTransacao = useCallback((t) => {
    const now = new Date();
    if (t.tipo === 'despesa_cartao' && t.totalParcelas > 1 && t.mesPrimeiraParcela != null && t.anoPrimeiraParcela != null) {
      const parcelaGroupId = Date.now().toString() + '_' + Math.random().toString(36).slice(2);
      const valorParcela = Math.abs(t.valor || 0);
      const descBase = (t.descricao || '').trim() || 'Parcela';
      const novas = [];
      for (let i = 1; i <= t.totalParcelas; i++) {
        let mes = t.mesPrimeiraParcela + (i - 1);
        let ano = t.anoPrimeiraParcela;
        while (mes > 11) { mes -= 12; ano += 1; }
        while (mes < 0) { mes += 12; ano -= 1; }
        novas.push({
          ...t,
          id: parcelaGroupId + '_' + i,
          valor: -valorParcela,
          descricao: `${descBase} ${i}/${t.totalParcelas}`,
          data: now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          mes: now.getMonth(),
          ano: now.getFullYear(),
          parcelaNumero: i,
          totalParcelas: t.totalParcelas,
          parcelaGroupId,
          mesVencimento: mes,
          anoVencimento: ano,
          pago: false,
        });
      }
      setTransacoes((prev) => [...prev, ...novas]);
      return novas[0] || null;
    }
    const nova = {
      ...t,
      id: Date.now().toString(),
      data: t.data != null && t.data !== '' ? t.data : now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      mes: t.mes != null && typeof t.mes === 'number' ? t.mes : now.getMonth(),
      ano: t.ano != null && typeof t.ano === 'number' ? t.ano : now.getFullYear(),
    };
    setTransacoes((prev) => [...prev, nova]);
    if (t.tipo === 'despesa_cartao') return null;
    // Atualizar saldo da(s) conta(s)
    setContas((prev) => {
      const next = prev.map((c) => {
        let delta = 0;
        if (t.descricao === 'Transferência enviada' && c.id === t.contaId) delta = -(Math.abs(t.valor || 0));
        if (t.descricao === 'Transferência recebida' && c.id === t.contaId) delta = t.valor || 0;
        if (t.tipo === 'entrada' && c.id === t.contaId) delta = t.valor || 0;
        if ((t.tipo === 'saida') && c.id === t.contaId) delta = -Math.abs(t.valor || 0);
        if (delta === 0) return c;
        return { ...c, saldo: (c.saldo || 0) + delta };
      });
      return next;
    });
    return nova;
  }, []);

  const updateTransacao = useCallback((id, payload) => {
    const getDeltas = (t) => {
      const d = {};
      if (!t) return d;
      if (t.descricao === 'Transferência enviada' && t.contaId) d[t.contaId] = -Math.abs(t.valor || 0);
      if (t.descricao === 'Transferência recebida' && t.contaId) d[t.contaId] = t.valor || 0;
      if (t.tipo === 'entrada' && t.contaId) d[t.contaId] = t.valor || 0;
      if (t.tipo === 'saida' && t.contaId) d[t.contaId] = -Math.abs(t.valor || 0);
      return d;
    };
    const mergeDeltas = (a, b) => {
      const r = { ...a };
      Object.keys(b).forEach((k) => { r[k] = (r[k] || 0) + b[k]; });
      return r;
    };
    const negateDeltas = (d) => {
      const r = {};
      Object.keys(d).forEach((k) => { r[k] = -d[k]; });
      return r;
    };

    setTransacoes((prev) => {
      const t = prev.find((x) => x.id === id);
      if (!t) return prev;
      let reverseDeltas = {};
      let newTransacoes = prev;
      if (t.transferenciaId) {
        const par = prev.find((x) => x.transferenciaId === t.transferenciaId && x.id !== id);
        reverseDeltas = mergeDeltas(getDeltas(t), getDeltas(par));
        reverseDeltas = negateDeltas(reverseDeltas);
        const valor = Math.abs(payload.valor != null ? payload.valor : t.valor);
        const contaOrigem = payload.contaId != null ? payload.contaId : (t.descricao === 'Transferência enviada' ? t.contaId : par?.contaId);
        const contaDestino = payload.contaDestinoId != null ? payload.contaDestinoId : (t.descricao === 'Transferência recebida' ? t.contaId : par?.contaId);
        newTransacoes = prev.map((x) => {
          if (x.transferenciaId !== t.transferenciaId) return x;
          if (x.descricao === 'Transferência enviada') return { ...x, valor: -valor, contaId: contaOrigem };
          return { ...x, valor, contaId: contaDestino };
        });
      } else {
        reverseDeltas = negateDeltas(getDeltas(t));
        newTransacoes = prev.map((x) => (x.id === id ? { ...x, ...payload } : x));
      }
      const updatedT = newTransacoes.find((x) => x.id === id);
      const updatedPar = updatedT?.transferenciaId ? newTransacoes.find((x) => x.transferenciaId === updatedT.transferenciaId && x.id !== id) : null;
      const forwardDeltas = mergeDeltas(getDeltas(updatedT), getDeltas(updatedPar));
      setContas((contasPrev) =>
        contasPrev.map((c) => {
          const delta = (reverseDeltas[c.id] || 0) + (forwardDeltas[c.id] || 0);
          if (delta === 0) return c;
          return { ...c, saldo: (c.saldo || 0) + delta };
        })
      );
      return newTransacoes;
    });
  }, []);

  const removeTransacao = useCallback((id) => {
    const getDeltas = (t) => {
      const d = {};
      if (!t) return d;
      if (t.descricao === 'Transferência enviada' && t.contaId) d[t.contaId] = -Math.abs(t.valor || 0);
      if (t.descricao === 'Transferência recebida' && t.contaId) d[t.contaId] = t.valor || 0;
      if (t.tipo === 'entrada' && t.contaId) d[t.contaId] = t.valor || 0;
      if (t.tipo === 'saida' && t.contaId) d[t.contaId] = -Math.abs(t.valor || 0);
      return d;
    };
    const mergeDeltas = (a, b) => {
      const r = { ...a };
      Object.keys(b).forEach((k) => { r[k] = (r[k] || 0) + b[k]; });
      return r;
    };
    const negateDeltas = (d) => {
      const r = {};
      Object.keys(d).forEach((k) => { r[k] = -d[k]; });
      return r;
    };

    setTransacoes((prev) => {
      const t = prev.find((x) => x.id === id);
      if (!t) return prev;

      // Se o dono apagou uma despesa compartilhada, remove as partes NÃO pagas do outro usuário.
      if (
        (t.tipo === 'saida' || t.tipo === 'despesa_cartao') &&
        t.divisao?.partes?.some((p) => p.userId && p.userId !== user?.id) &&
        user?.id
      ) {
        Promise.resolve().then(() => deleteUnpaidSharedExpensePartsByTransacao?.(t.id));
      }

      let reverseDeltas = {};
      let idsToRemove = [id];
      if (t.transferenciaId) {
        const parceiros = prev.filter((x) => x.transferenciaId === t.transferenciaId);
        idsToRemove = parceiros.map((x) => x.id);
        parceiros.forEach((p) => { reverseDeltas = mergeDeltas(reverseDeltas, getDeltas(p)); });
      } else {
        reverseDeltas = getDeltas(t);
      }
      reverseDeltas = negateDeltas(reverseDeltas);
      const idsSet = new Set(idsToRemove);
      setContas((contasPrev) =>
        contasPrev.map((c) => {
          const delta = reverseDeltas[c.id] || 0;
          if (delta === 0) return c;
          return { ...c, saldo: (c.saldo || 0) + delta };
        })
      );
      return prev.filter((x) => !idsSet.has(x.id));
    });
  }, [user?.id, deleteUnpaidSharedExpensePartsByTransacao]);
  const setOrcamentoMensal = useCallback((mes, ano, total, porCategoria) => {
    const key = `${ano}-${mes}`;
    setOrcamentoMensalState((prev) => ({ ...prev, [key]: { total: total || 0, categorias: porCategoria || {} } }));
  }, []);

  const getOrcamento = useCallback((mes, ano) => {
    const key = `${ano}-${mes}`;
    return orcamentoMensal[key] || { total: 0, categorias: {} };
  }, [orcamentoMensal]);

  const removeOrcamentoMensal = useCallback((mes, ano) => {
    const key = `${ano}-${mes}`;
    setOrcamentoMensalState((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Gasto por categoria no mês (apenas despesas).
  // Para cartão de crédito: considera o mês de VENCIMENTO da parcela (o que será pago no mês), não o mês da compra
  const getGastoPorCategoriaNoMes = useCallback((mes, ano) => {
    const despesas = transacoes.filter((t) => {
      if (t.tipo === 'saida') return t.mes === mes && t.ano === ano;
      if (t.tipo === 'despesa_cartao') {
        if (t.mesVencimento != null && t.anoVencimento != null) {
          return t.mesVencimento === mes && t.anoVencimento === ano;
        }
        return t.mes === mes && t.ano === ano;
      }
      return false;
    });
    const porCat = {};
    despesas.forEach((t) => {
      const id = t.categoriaId || 'outros';
      const valor = Math.abs(t.valor || 0);
      porCat[id] = (porCat[id] || 0) + valor;
    });
    return porCat;
  }, [transacoes]);

  const getReceitasNoMes = useCallback((mes, ano) => {
    return transacoes
      .filter((t) => t.tipo === 'entrada' && t.mes === mes && t.ano === ano)
      .reduce((s, x) => s + (x.valor || 0), 0);
  }, [transacoes]);

  const addFinanciamento = useCallback((data) => {
    const totalParcelas = Math.max(1, parseInt(data.totalParcelas, 10) || 1);
    const valorPadrao = parseFloat(data.valorPadrao) || 0;
    const diaVencimento = Math.min(31, Math.max(1, parseInt(data.diaVencimento, 10) || 1));
    const parcelas = Array.from({ length: totalParcelas }, (_, i) => ({
      numero: i + 1,
      valorPadrao,
      valorPago: null,
      dataPagamento: null,
      pago: false,
    }));
    const novo = {
      id: Date.now().toString(),
      descricao: (data.descricao || '').trim() || 'Financiamento',
      contaId: data.contaId || null,
      totalParcelas,
      valorPadrao,
      diaVencimento,
      parcelas,
    };
    setFinanciamentosState((prev) => [...prev, novo]);
  }, []);

  const updateFinanciamento = useCallback((id, payload) => {
    setFinanciamentosState((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...payload } : f))
    );
  }, []);

  const updateParcelaFinanciamento = useCallback((financiamentoId, numeroParcela, payload) => {
    let prevParcela = null;
    let prevFin = null;
    let nextParcela = null;

    setFinanciamentosState((prev) =>
      prev.map((f) => {
        if (f.id !== financiamentoId) return f;
        prevFin = f;
        const parcelasNext = (f.parcelas || []).map((p) => {
          if (p.numero !== numeroParcela) return p;
          prevParcela = p;
          nextParcela = { ...p, ...payload };
          return nextParcela;
        });
        return { ...f, parcelas: parcelasNext };
      })
    );

    // Side effects: ao marcar como paga, cria uma despesa (saida) na data de pagamento.
    // Ao desmarcar, remove a despesa criada automaticamente (se existir).
    Promise.resolve().then(() => {
      if (!prevParcela || !prevFin || !nextParcela) return;

      const virouPaga = prevParcela.pago !== true && nextParcela.pago === true;
      const virouNaoPaga = prevParcela.pago === true && nextParcela.pago !== true;

      if (virouNaoPaga && prevParcela.transacaoId) {
        removeTransacao(prevParcela.transacaoId);
        // limpa o vínculo
        setFinanciamentosState((prev) =>
          prev.map((f) => {
            if (f.id !== financiamentoId) return f;
            return {
              ...f,
              parcelas: (f.parcelas || []).map((p) =>
                p.numero === numeroParcela ? { ...p, transacaoId: null } : p
              ),
            };
          })
        );
        return;
      }

      if (!virouPaga) return;

      const valor = Math.round(Math.max(0, Number(nextParcela.valorPago ?? nextParcela.valorPadrao ?? 0)) * 100) / 100;
      if (valor <= 0) return;

      const hoje = new Date();
      const parsed = nextParcela.dataPagamento && typeof nextParcela.dataPagamento === 'string'
        ? parseDateDDMM(String(nextParcela.dataPagamento).trim())
        : null;
      const data = parsed
        ? `${String(parsed.day).padStart(2, '0')}/${String(parsed.month + 1).padStart(2, '0')}/${parsed.year}`
        : hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const mesTx = parsed ? parsed.month : hoje.getMonth();
      const anoTx = parsed ? parsed.year : hoje.getFullYear();

      const tx = addTransacao({
        tipo: 'saida',
        valor: -Math.abs(valor),
        descricao: `Parcela ${numeroParcela} — ${prevFin.descricao || 'Financiamento'}`,
        contaId: prevFin.contaId || (contas.filter((c) => !c.arquivada)[0]?.id ?? 'carteira'),
        data,
        mes: mesTx,
        ano: anoTx,
        categoriaId: 'sai-8', // Outros
        fixa: true,
        financiamentoId,
        parcelaNumero: numeroParcela,
      });

      if (tx?.id) {
        setFinanciamentosState((prev) =>
          prev.map((f) => {
            if (f.id !== financiamentoId) return f;
            return {
              ...f,
              parcelas: (f.parcelas || []).map((p) =>
                p.numero === numeroParcela ? { ...p, transacaoId: tx.id } : p
              ),
            };
          })
        );
      }
    });
  }, [addTransacao, removeTransacao, contas]);

  const removeFinanciamento = useCallback((id) => {
    setFinanciamentosState((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const addObjetivo = useCallback((data) => {
    const novo = {
      id: Date.now().toString(),
      nome: (data.nome || '').trim() || 'Objetivo',
      valorMeta: Math.max(0, parseFloat(data.valorMeta) || 0),
      valorInicial: Math.max(0, parseFloat(data.valorInicial) || 0),
      dataLimite: data.dataLimite || null,
      depositos: [],
      concluido: false,
      pausado: false,
      icon: data.icon || null,
      color: data.color || null,
    };
    setObjetivosState((prev) => [...prev, novo]);
    return novo.id;
  }, []);

  const updateObjetivo = useCallback((id, payload) => {
    setObjetivosState((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...payload } : o))
    );
  }, []);

  const removeObjetivo = useCallback((id) => {
    setObjetivosState((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const addDepositoObjetivo = useCallback((objetivoId, valor) => {
    const v = Math.max(0, parseFloat(valor) || 0);
    if (v <= 0) return;
    const now = new Date();
    const dep = {
      id: Date.now().toString(),
      valor: v,
      data: now.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
    setObjetivosState((prev) =>
      prev.map((o) =>
        o.id === objetivoId ? { ...o, depositos: [...(o.depositos || []), dep] } : o
      )
    );
  }, []);

  const removeDepositoObjetivo = useCallback((objetivoId, depositoId) => {
    setObjetivosState((prev) =>
      prev.map((o) =>
        o.id === objetivoId
          ? { ...o, depositos: (o.depositos || []).filter((d) => d.id !== depositoId) }
          : o
      )
    );
  }, []);

  const getPrincipalUserId = useCallback(() => PRINCIPAL_ID, []);

  const addUser = useCallback((nome, cpf, email) => {
    const id = Date.now().toString();
    const cpfDigits = cpf ? String(cpf).replace(/\D/g, '').slice(0, 11) : undefined;
    const novo = {
      id,
      nome: (nome || '').trim() || 'Usuário',
      cpf: cpfDigits,
      email: email ? String(email).trim() || undefined : undefined,
    };
    setUsuariosOutros((prev) => [...prev, novo]);
    return id;
  }, []);

  const updateUser = useCallback((id, payload) => {
    setUsuariosOutros((prev) => prev.map((u) => (u.id === id ? { ...u, ...payload } : u)));
  }, []);

  const removeUser = useCallback((id) => {
    setUsuariosOutros((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const setPrincipalUser = useCallback(() => {}, []);

  /** Parte do valor da despesa que cabe ao usuário principal (para divisão). Sem divisão retorna o valor total. */
  const getValorPartePrincipal = useCallback((transacao) => {
    const d = transacao?.divisao;
    if (!d || !d.partes || d.partes.length === 0) return Math.abs(transacao?.valor ?? 0);
    const principalId = getPrincipalUserId();
    if (!principalId) return Math.abs(transacao?.valor ?? 0);
    const total = Math.abs(transacao?.valor ?? 0);
    const parte = d.partes.find((p) => p.userId === principalId);
    if (!parte) return 0;
    let pct = parte.porcentagem;
    if (pct == null && d.tipo === 'igual') pct = 100 / d.partes.length;
    return Math.round(total * ((pct || 0) / 100) * 100) / 100;
  }, [usuarios, getPrincipalUserId]);

  /** Valor total que o usuário userId deve ao principal (soma das partes dele nas despesas divididas). */
  const getValorAReceberDeUsuario = useCallback((userId) => {
    const despesas = transacoes.filter(
      (t) => (t.tipo === 'saida' || t.tipo === 'despesa_cartao') && t.divisao?.partes?.some((p) => p.userId === userId)
    );
    const total = despesas.reduce((s, t) => {
      const parte = t.divisao.partes.find((p) => p.userId === userId);
      let pct = parte?.porcentagem;
      if (pct == null && t.divisao.tipo === 'igual') pct = 100 / t.divisao.partes.length;
      return s + Math.abs(t.valor || 0) * ((pct || 0) / 100);
    }, 0);
    return Math.round(total * 100) / 100;
  }, [transacoes]);

  /** Total já recebido do usuário userId (registros de recebimento). */
  const getTotalRecebidoDeUsuario = useCallback((userId) => {
    return recebimentosDeUsuarios
      .filter((r) => r.userId === userId)
      .reduce((s, r) => s + (r.valor || 0), 0);
  }, [recebimentosDeUsuarios]);

  /** Lista de recebimentos já registrados do usuário userId (para compartilhar no pacote de cobrança). */
  const getRecebimentosDeUsuario = useCallback((userId) => {
    return (recebimentosDeUsuarios || []).filter((r) => r.userId === userId);
  }, [recebimentosDeUsuarios]);

  /** Valor que ainda falta receber do usuário userId (deve - já recebido). */
  const getValorAReceberRestanteDeUsuario = useCallback((userId) => {
    const devido = getValorAReceberDeUsuario(userId);
    const recebido = getTotalRecebidoDeUsuario(userId);
    return Math.round(Math.max(0, devido - recebido) * 100) / 100;
  }, [getValorAReceberDeUsuario, getTotalRecebidoDeUsuario]);

  /** Soma do valor a receber restante de todos os usuários (exceto o principal). */
  const getTotalAReceberRestante = useCallback(() => {
    const principalId = getPrincipalUserId();
    const total = usuarios
      .filter((u) => u.id !== principalId)
      .reduce((s, u) => s + getValorAReceberRestanteDeUsuario(u.id), 0);
    return Math.round(total * 100) / 100;
  }, [usuarios, getPrincipalUserId, getValorAReceberRestanteDeUsuario]);

  /** Registra recebimento de valor do usuário userId: reduz "a receber" e (por padrão) adiciona receita.
   * dataPagamento opcional "dd/mm/yyyy" — se vazio usa hoje.
   * opts.semReceita, opts.horario "HH:mm", opts.comprovante (base64 string).
   */
  const addRecebimento = useCallback((userId, valor, contaId, dataPagamento, opts) => {
    const id = Date.now().toString();
    const user = usuarios.find((u) => u.id === userId);
    const nome = user?.nome || 'Usuário';
    const now = new Date();
    let data, mes, ano;
    if (dataPagamento && typeof dataPagamento === 'string' && dataPagamento.trim()) {
      const parsed = parseDateDDMM(dataPagamento.trim());
      if (parsed) {
        mes = parsed.month;
        ano = parsed.year;
        data = `${String(parsed.day).padStart(2, '0')}/${String(parsed.month + 1).padStart(2, '0')}/${parsed.year}`;
      } else {
        data = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        mes = now.getMonth();
        ano = now.getFullYear();
      }
    } else {
      data = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      mes = now.getMonth();
      ano = now.getFullYear();
    }
    const valorNum = Math.round(Math.abs(Number(valor) || 0) * 100) / 100;
    if (valorNum <= 0) return;
    const semReceita = opts?.semReceita === true;
    const horario = opts?.horario && typeof opts.horario === 'string' ? opts.horario.trim() : undefined;
    const comprovante = opts?.comprovante && typeof opts.comprovante === 'string' ? opts.comprovante : undefined;
    const conta = contaId || contas.filter((c) => !c.arquivada)[0]?.id;
    if (!semReceita) {
      addTransacao({
        tipo: 'entrada',
        valor: valorNum,
        descricao: `Recebimento de ${nome}`,
        contaId: conta || null,
        data,
        mes,
        ano,
        recebimentoDeUserId: userId,
      });
    }
    setRecebimentosDeUsuarios((prev) => [...prev, {
      id,
      userId,
      valor: valorNum,
      data,
      mes,
      ano,
      ...(horario && { horario }),
      ...(comprovante && { comprovante }),
      semReceita: semReceita || undefined,
    }]);
    if (user?.id && String(userId).length >= 30) {
      onRecebimentoFromUser?.(user.id, userId, valorNum);
    }
  }, [usuarios, contas, addTransacao, user?.id, onRecebimentoFromUser]);

  /** Lista de despesas em que o usuário userId tem parte (para cobrança). Cada item: { transacao, valorParte, porcentagem } */
  const getDespesasComParteDoUsuario = useCallback((userId) => {
    return transacoes
      .filter((t) => (t.tipo === 'saida' || t.tipo === 'despesa_cartao') && t.divisao?.partes?.some((p) => p.userId === userId))
      .map((t) => {
        const parte = t.divisao.partes.find((p) => p.userId === userId);
        let pct = parte?.porcentagem;
        if (pct == null && t.divisao.tipo === 'igual') pct = 100 / t.divisao.partes.length;
        const valorParte = Math.round(Math.abs(t.valor || 0) * ((pct || 0) / 100) * 100) / 100;
        return { transacao: t, valorParte, porcentagem: Math.round((pct || 0) * 100) / 100 };
      });
  }, [transacoes]);

  /** Substitui todos os dados pelos importados (CSV ou backup JSON). parsed pode incluir perfil, usuarios, recebimentosUsuarios. */
  const importReplaceAll = useCallback((parsed) => {
    const currentUserId = user?.id;
    if (parsed.contas != null && Array.isArray(parsed.contas) && parsed.contas.length > 0) {
      setContas(parsed.contas);
    }
    if (parsed.cartoes != null && Array.isArray(parsed.cartoes)) {
      setCartoes(parsed.cartoes);
    }
    if (parsed.transacoes != null && Array.isArray(parsed.transacoes)) {
      setTransacoes(parsed.transacoes);
    }
    if (parsed.objetivos != null && Array.isArray(parsed.objetivos)) {
      setObjetivosState(parsed.objetivos);
    }
    if (parsed.financiamentos != null && Array.isArray(parsed.financiamentos)) {
      setFinanciamentosState(parsed.financiamentos);
    }
    if (parsed.orcamentoMensal != null && typeof parsed.orcamentoMensal === 'object') {
      setOrcamentoMensalState((prev) => ({ ...prev, ...parsed.orcamentoMensal }));
    }
    if (parsed.recebimentosUsuarios != null && Array.isArray(parsed.recebimentosUsuarios)) {
      setRecebimentosDeUsuarios(parsed.recebimentosUsuarios);
    }
    if (parsed.usuarios != null && Array.isArray(parsed.usuarios)) {
      setUsuariosOutros(
        parsed.usuarios.filter(
          (u) => u.id !== PRINCIPAL_ID && u.id !== currentUserId && !u.principal
        )
      );
    }
    if (parsed.perfil != null && typeof parsed.perfil === 'object') {
      setPerfilState(parsed.perfil);
    }
  }, [user?.id]);

  const getProximasParcelasCartao = useCallback(() => {
    return transacoes
      .filter((x) => x.tipo === 'despesa_cartao' && x.parcelaNumero != null && x.pago !== true)
      .sort((a, b) => {
        const anoA = a.anoVencimento ?? a.ano;
        const anoB = b.anoVencimento ?? b.ano;
        if (anoA !== anoB) return anoA - anoB;
        const mesA = a.mesVencimento ?? a.mes;
        const mesB = b.mesVencimento ?? b.mes;
        return mesA - mesB;
      });
  }, [transacoes]);

  const getPrevisaoGastosCartaoPorMes = useCallback((mes, ano) => {
    return transacoes
      .filter((x) => x.tipo === 'despesa_cartao' && x.mesVencimento === mes && x.anoVencimento === ano && x.pago !== true)
      .reduce((s, x) => s + Math.abs(x.valor || 0), 0);
  }, [transacoes]);

  const saldoContas = contas
    .filter((c) => c.incluirNaSomaTelaInicial !== false)
    .reduce((s, c) => s + (c.saldo || 0), 0);
  const saldoTodasContas = contas
    .filter((c) => !c.arquivada)
    .reduce((s, c) => s + (c.saldo || 0), 0);
  const totalReceitas = transacoes.filter((x) => x.tipo === 'entrada').reduce((s, x) => s + (x.valor || 0), 0);
  const totalDespesas = transacoes
    .filter((x) => x.tipo === 'saida' || x.tipo === 'despesa_cartao')
    .reduce((s, x) => s + Math.abs(x.valor || 0), 0);

  const value = {
    isHydrating: Boolean(user && !supabaseFetchDone),
    contas,
    cartoes,
    categorias,
    setCategorias,
    transacoes,
    cardsDaTelaInicial,
    setCardsDaTelaInicial: setCardsDaTelaInicialState,
    cardsOrdem,
    setCardsOrdem: setCardsOrdemState,
    addConta,
    updateConta,
    removeConta,
    addCartao,
    updateCartao,
    removeCartao,
    addCategoria,
    addTransacao,
    updateTransacao,
    removeTransacao,
    saldoContas,
    saldoTodasContas,
    totalReceitas,
    totalDespesas,
    hasCartoes: cartoes.filter((c) => c.ativo !== false).length > 0,
    orcamentoMensal,
    setOrcamentoMensal,
    getOrcamento,
    removeOrcamentoMensal,
    getGastoPorCategoriaNoMes,
    getReceitasNoMes,
    financiamentos,
    addFinanciamento,
    updateFinanciamento,
    updateParcelaFinanciamento,
    removeFinanciamento,
    getProximasParcelasCartao,
    getPrevisaoGastosCartaoPorMes,
    objetivos,
    addObjetivo,
    updateObjetivo,
    removeObjetivo,
    addDepositoObjetivo,
    removeDepositoObjetivo,
    importReplaceAll,
    usuarios,
    addUser,
    updateUser,
    removeUser,
    refreshLinkedUsers,
    setPrincipalUser,
    getPrincipalUserId,
    getValorPartePrincipal,
    getValorAReceberDeUsuario,
    getTotalRecebidoDeUsuario,
    getValorAReceberRestanteDeUsuario,
    getTotalAReceberRestante,
    addRecebimento,
    getDespesasComParteDoUsuario,
    getRecebimentosDeUsuario,
    cobrancasRecebidas,
    addCobrancaRecebida,
    perfil,
    setPerfil,
    refetchUserData,
    syncToSupabaseNow,
    pendingSync,
    resetAllData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
