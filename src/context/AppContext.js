import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { categoriasPadrao } from '../constants/categorias';
import { loadCategorias as loadCategoriasStorage, saveCategorias as saveCategoriasStorage } from '../utils/storage';
import { loadCardsTelaInicial as loadCardsStorage, saveCardsTelaInicial as saveCardsStorage } from '../utils/storage';

const AppContext = createContext(null);

const CARDS_PADRAO = {
  pendenciasAlertas: true,
  contas: true,
  cartoes: true,
  despesasPorCategoria: true,
  planejamentoMensal: true,
  economiaMensal: false,
  frequenciaGastos: false,
  balancoMensal: true,
  transacoesFavoritas: false,
  objetivos: false,
};

const CARDS_ORDER_DEFAULT = [
  'pendenciasAlertas', 'contas', 'cartoes', 'despesasPorCategoria', 'planejamentoMensal',
  'economiaMensal', 'frequenciaGastos', 'balancoMensal', 'transacoesFavoritas', 'objetivos',
];

export function AppProvider({ children }) {
  const [contas, setContas] = useState([
    { id: 'carteira', nome: 'Carteira', saldo: 0 },
  ]);
  const [cartoes, setCartoes] = useState([]);
  const [categorias, setCategorias] = useState(categoriasPadrao);
  const [categoriasLoaded, setCategoriasLoaded] = useState(false);
  const [transacoes, setTransacoes] = useState([]);
  const [cardsDaTelaInicial, setCardsDaTelaInicialState] = useState(CARDS_PADRAO);
  const [cardsOrdem, setCardsOrdemState] = useState(CARDS_ORDER_DEFAULT);
  const [cardsLoaded, setCardsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadCategoriasStorage().then((saved) => {
      if (!cancelled && saved && saved.length > 0) {
        setCategorias(saved);
      }
      if (!cancelled) setCategoriasLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!cardsLoaded) return;
    saveCardsStorage({ enabled: cardsDaTelaInicial, order: cardsOrdem });
  }, [cardsDaTelaInicial, cardsOrdem, cardsLoaded]);

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
    const nova = {
      ...t,
      id: Date.now().toString(),
      data: now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      mes: now.getMonth(),
      ano: now.getFullYear(),
    };
    setTransacoes((prev) => [...prev, nova]);
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

  // Orçamento mensal: { "2026-3": { total: 4000, categorias: { "idCat": limite } } }
  const [orcamentoMensal, setOrcamentoMensalState] = useState({});
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

  // Gasto por categoria no mês (apenas despesas)
  const getGastoPorCategoriaNoMes = useCallback((mes, ano) => {
    const despesas = transacoes.filter(
      (t) => (t.tipo === 'saida' || t.tipo === 'despesa_cartao') && t.mes === mes && t.ano === ano
    );
    const porCat = {};
    despesas.forEach((t) => {
      const id = t.categoriaId || 'outros';
      porCat[id] = (porCat[id] || 0) + Math.abs(t.valor || 0);
    });
    return porCat;
  }, [transacoes]);

  const getReceitasNoMes = useCallback((mes, ano) => {
    return transacoes
      .filter((t) => t.tipo === 'entrada' && t.mes === mes && t.ano === ano)
      .reduce((s, x) => s + (x.valor || 0), 0);
  }, [transacoes]);

  const saldoContas = contas
    .filter((c) => c.incluirNaSomaTelaInicial !== false)
    .reduce((s, c) => s + (c.saldo || 0), 0);
  const saldoTodasContas = contas
    .filter((c) => !c.arquivada)
    .reduce((s, c) => s + (c.saldo || 0), 0);
  const totalReceitas = transacoes.filter((x) => x.tipo === 'entrada').reduce((s, x) => s + (x.valor || 0), 0);
  const totalDespesas = transacoes.filter((x) => x.tipo === 'saida' || x.tipo === 'despesa_cartao').reduce((s, x) => s + Math.abs(x.valor || 0), 0);

  const value = {
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
