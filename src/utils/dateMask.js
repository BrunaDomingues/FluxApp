/**
 * Máscara para campo de data dd/mm/yyyy.
 * Permite apenas dígitos; formata automaticamente com as barras.
 * @param {string} text - Texto atual do input (pode conter apenas números ou já mascarado)
 * @returns {string} Texto mascarado no formato dd/mm/yyyy (até 8 dígitos)
 */
export function maskDateInput(text) {
  const digits = (text || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
}

/**
 * Interpreta uma string yyyy-mm-dd como data LOCAL (meia-noite no fuso do usuário).
 * Evita o bug de new Date("yyyy-mm-dd") ser interpretado como UTC.
 * @param {string} str - "yyyy-mm-dd"
 * @returns {Date | null}
 */
export function parseLocalDateFromYYYYMMDD(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split('-');
  if (parts.length < 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return null;
  return d;
}
