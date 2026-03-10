import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

const categoriasIniciais = [
  { id: '1', nome: 'Moradia', tipo: 'saida' },
  { id: '2', nome: 'Alimentação', tipo: 'saida' },
  { id: '3', nome: 'Transporte', tipo: 'saida' },
  { id: '4', nome: 'Lazer', tipo: 'saida' },
  { id: '5', nome: 'Salário', tipo: 'entrada' },
  { id: '6', nome: 'Freelance', tipo: 'entrada' },
];

export function AppProvider({ children }) {
  const [contas, setContas] = useState([
    { id: 'carteira', nome: 'Carteira', saldo: 0 },
  ]);
  const [cartoes, setCartoes] = useState([]);
  const [categorias, setCategorias] = useState(categoriasIniciais);
  const [transacoes, setTransacoes] = useState([]);

  const addConta = useCallback((conta) => {
    setContas((prev) => [...prev, { ...conta, id: Date.now().toString(), saldo: conta.saldoInicial || 0 }]);
  }, []);

  const addCartao = useCallback((cartao) => {
    setCartoes((prev) => [...prev, { ...cartao, id: Date.now().toString(), limite: cartao.limite || 0 }]);
  }, []);

  const addCategoria = useCallback((cat) => {
    setCategorias((prev) => [...prev, { ...cat, id: Date.now().toString() }]);
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
    transacoes,
    addConta,
    addCartao,
    addCategoria,
    addTransacao,
    saldoContas,
    totalReceitas,
    totalDespesas,
    hasCartoes: cartoes.length > 0,
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
