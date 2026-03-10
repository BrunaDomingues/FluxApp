/**
 * Categorias padrão conforme as fotos do app (DESPESAS e RECEITAS).
 * Cada uma tem id estável, nome, tipo e icon (Ionicons).
 */
export const categoriasPadrao = [
  // RECEITAS
  { id: 'ent-1', nome: 'Bonificação', tipo: 'entrada', icon: 'star-outline' },
  { id: 'ent-2', nome: 'Empréstimo', tipo: 'entrada', icon: 'cash-outline' },
  { id: 'ent-3', nome: 'Investimento', tipo: 'entrada', icon: 'trending-up-outline' },
  { id: 'ent-4', nome: 'Outros', tipo: 'entrada', icon: 'ellipsis-horizontal' },
  { id: 'ent-5', nome: 'Pix', tipo: 'entrada', icon: 'phone-portrait-outline' },
  { id: 'ent-6', nome: 'Presente', tipo: 'entrada', icon: 'gift-outline' },
  { id: 'ent-7', nome: 'Renda extra', tipo: 'entrada', icon: 'wallet-outline' },
  { id: 'ent-8', nome: 'Salário', tipo: 'entrada', icon: 'briefcase-outline' },
  { id: 'ent-9', nome: 'Transferência bancária', tipo: 'entrada', icon: 'swap-horizontal' },
  // DESPESAS
  { id: 'sai-1', nome: 'Alimentação', tipo: 'saida', icon: 'restaurant-outline' },
  { id: 'sai-2', nome: 'Assinatura', tipo: 'saida', icon: 'card-outline' },
  { id: 'sai-3', nome: 'Casa', tipo: 'saida', icon: 'home-outline' },
  { id: 'sai-4', nome: 'Compras', tipo: 'saida', icon: 'cart-outline' },
  { id: 'sai-5', nome: 'Educação', tipo: 'saida', icon: 'school-outline' },
  { id: 'sai-6', nome: 'Lazer', tipo: 'saida', icon: 'happy-outline' },
  { id: 'sai-7', nome: 'Operação bancária', tipo: 'saida', icon: 'business-outline' },
  { id: 'sai-8', nome: 'Outros', tipo: 'saida', icon: 'ellipsis-horizontal' },
  { id: 'sai-9', nome: 'Pix', tipo: 'saida', icon: 'phone-portrait-outline' },
  { id: 'sai-10', nome: 'Saúde', tipo: 'saida', icon: 'medkit-outline' },
  { id: 'sai-11', nome: 'Serviços', tipo: 'saida', icon: 'document-text-outline' },
  { id: 'sai-12', nome: 'Supermercado', tipo: 'saida', icon: 'cart-outline' },
  { id: 'sai-13', nome: 'Transporte', tipo: 'saida', icon: 'car-outline' },
  { id: 'sai-14', nome: 'Viagem', tipo: 'saida', icon: 'airplane-outline' },
];

/** Ícone padrão quando a categoria não tem icon salvo */
export const ICONE_PADRAO = 'pricetag-outline';
