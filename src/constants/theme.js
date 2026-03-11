/**
 * Paleta do app de controle financeiro (tema escuro)
 * Baseado no design: positivo/ganhos, gastos/alertas, ação primária, ação secundária
 */
export const colors = {
  // Principais
  positive: '#00C853',      // Saldo positivo e ganhos
  spending: '#FF5252',     // Gastos e alertas
  primary: '#2979FF',      // Ação primária e marca (azul)
  secondary: '#BB86FC',    // Ação secundária e progresso (roxo)

  // Texto
  textPrimary: '#FFFFFF',
  textSecondary: '#E0E0E0',
  textMuted: '#888888',

  // Fundos
  background: '#0D0D0D',
  backgroundCard: '#1A1A1A',
  backgroundCardElevated: '#252525',

  // Estados do botão primário
  primaryPressed: '#1D4ED8',
  primaryHover: '#2563EB',

  // Categorias (gráficos e ícones)
  categoryMoradia: '#2979FF',
  categoryAlimentacao: '#00C853',
  categoryLazer: '#BB86FC',
  categoryTransporte: '#FF5252',
  categorySaude: '#A78BFA',
  categoryEducacao: '#F59E0B',
};

/** Cores para gráfico de gastos por categoria (ciclo) */
export const categoryChartColors = [
  colors.categoryMoradia,
  colors.categoryAlimentacao,
  colors.categoryLazer,
  colors.categoryTransporte,
  colors.categorySaude,
  colors.categoryEducacao,
  colors.primary,
  colors.secondary,
];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};
