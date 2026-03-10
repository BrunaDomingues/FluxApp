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
    setTransacoes((prev) => [...prev, { ...t, id: Date.now().toString(), data: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }]);
  }, []);

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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
