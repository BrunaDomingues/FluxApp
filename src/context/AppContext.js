import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { categoriasPadrao } from '../constants/categorias';
import { loadCategorias as loadCategoriasStorage, saveCategorias as saveCategoriasStorage } from '../utils/storage';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [contas, setContas] = useState([
    { id: 'carteira', nome: 'Carteira', saldo: 0 },
  ]);
  const [cartoes, setCartoes] = useState([]);
  const [categorias, setCategorias] = useState(categoriasPadrao);
  const [categoriasLoaded, setCategoriasLoaded] = useState(false);
  const [transacoes, setTransacoes] = useState([]);

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
    if (!categoriasLoaded) return;
    saveCategoriasStorage(categorias);
  }, [categorias, categoriasLoaded]);

  const addConta = useCallback((conta) => {
    setContas((prev) => [...prev, { ...conta, id: Date.now().toString(), saldo: conta.saldoInicial || 0 }]);
  }, []);

  const addCartao = useCallback((cartao) => {
    setCartoes((prev) => [...prev, {
      ...cartao,
      id: Date.now().toString(),
      limite: cartao.limite ?? 0,
      bandeira: cartao.bandeira ?? 'Outro',
      ativo: cartao.ativo !== false,
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
    setTransacoes((prev) => [...prev, {
      ...t,
      id: Date.now().toString(),
      data: now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      mes: now.getMonth(),
      ano: now.getFullYear(),
    }]);
  }, []);

  const updateTransacao = useCallback((id, payload) => {
    setTransacoes((prev) => {
      const t = prev.find((x) => x.id === id);
      if (!t) return prev;
      if (t.transferenciaId) {
        const par = prev.find((x) => x.transferenciaId === t.transferenciaId && x.id !== id);
        const valor = Math.abs(payload.valor != null ? payload.valor : t.valor);
        const contaOrigem = payload.contaId != null ? payload.contaId : (t.descricao === 'Transferência enviada' ? t.contaId : par?.contaId);
        const contaDestino = payload.contaDestinoId != null ? payload.contaDestinoId : (t.descricao === 'Transferência recebida' ? t.contaId : par?.contaId);
        return prev.map((x) => {
          if (x.transferenciaId !== t.transferenciaId) return x;
          if (x.descricao === 'Transferência enviada') {
            return { ...x, valor: -valor, contaId: contaOrigem };
          }
          return { ...x, valor, contaId: contaDestino };
        });
      }
      return prev.map((x) => (x.id === id ? { ...x, ...payload } : x));
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

  const saldoContas = contas.reduce((s, c) => s + (c.saldo || 0), 0);
  const totalReceitas = transacoes.filter((x) => x.tipo === 'entrada').reduce((s, x) => s + (x.valor || 0), 0);
  const totalDespesas = transacoes.filter((x) => x.tipo === 'saida' || x.tipo === 'despesa_cartao').reduce((s, x) => s + Math.abs(x.valor || 0), 0);

  const value = {
    contas,
    cartoes,
    categorias,
    setCategorias,
    transacoes,
    addConta,
    addCartao,
    updateCartao,
    removeCartao,
    addCategoria,
    addTransacao,
    updateTransacao,
    saldoContas,
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
