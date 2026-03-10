/**
 * Formatação de valores em Real (BRL) para campos de input.
 * Internamente o valor é armazenado como string de dígitos (centavos).
 * Ex.: "123456" -> exibe "R$ 1.234,56" e equivale a 1234.56 reais.
 */

/**
 * Formata uma string de centavos (apenas dígitos) para exibição em R$.
 * @param {string} rawDigits - Apenas dígitos (valor em centavos)
 * @returns {string} Ex: "R$ 0,00", "R$ 1.234,56"
 */
export function formatBRL(rawDigits) {
  const digits = (rawDigits || '').replace(/\D/g, '');
  const cents = parseInt(digits || '0', 10);
  const reais = cents / 100;
  return (
    'R$ ' +
    reais.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Extrai apenas os dígitos do texto digitado (valor em centavos).
 * Permite colar "1.234,56" ou "1234,56" e normaliza para "123456".
 * @param {string} text - Texto do input (pode conter R$, pontos, vírgulas)
 * @returns {string} Apenas dígitos (centavos)
 */
export function parseToRaw(text) {
  return (text || '').replace(/\D/g, '');
}

/**
 * Converte string de centavos para número em reais.
 * @param {string} rawDigits
 * @returns {number}
 */
export function rawToNumber(rawDigits) {
  return parseInt(parseToRaw(rawDigits) || '0', 10) / 100;
}

/**
 * Converte número em reais para string de centavos (para estado interno).
 * @param {number} value
 * @returns {string}
 */
export function numberToRaw(value) {
  const n = parseFloat(value);
  if (Number.isNaN(n) || n < 0) return '0';
  return String(Math.round(n * 100));
}
