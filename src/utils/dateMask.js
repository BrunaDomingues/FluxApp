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

/**
 * Interpreta string dd/mm/yyyy ou dd/mm (usa ano atual) para dia, mês, ano.
 * @param {string} str - "dd/mm/yyyy" ou "dd/mm"
 * @returns {{ day: number, month: number, year: number } | null} month 0-11 (Date)
 */
export function parseDateDDMM(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split('/').map((p) => parseInt(p.replace(/\D/g, ''), 10));
  const day = parts[0];
  const month = parts[1] != null ? parts[1] - 1 : null;
  const year = parts[2] != null ? parts[2] : new Date().getFullYear();
  if (isNaN(day) || day < 1 || day > 31) return null;
  if (month == null || isNaN(month) || month < 0 || month > 11) return null;
  if (isNaN(year) || year < 1900 || year > 2100) return null;
  return { day, month, year };
}

/** Máscara CPF: 000.000.000-00 (até 11 dígitos). */
export function maskCpfInput(text) {
  const digits = (text || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return digits.slice(0, 3) + '.' + digits.slice(3);
  if (digits.length <= 9) return digits.slice(0, 3) + '.' + digits.slice(3, 6) + '.' + digits.slice(6);
  return digits.slice(0, 3) + '.' + digits.slice(3, 6) + '.' + digits.slice(6, 9) + '-' + digits.slice(9);
}

/** Retorna só os 11 dígitos do CPF para comparação/armazenamento. */
export function normalizeCpf(str) {
  if (str == null) return '';
  const digits = String(str).replace(/\D/g, '').slice(0, 11);
  return digits.length === 11 ? digits : String(str).replace(/\D/g, '');
}

/**
 * Parseia data/hora no formato EXIF DateTimeOriginal: "yyyy:mm:dd HH:mm:ss" ou "yyyy-mm-dd HH:mm:ss"
 * @returns {{ data: string (dd/mm/yyyy), horario: string (HH:mm) } | null}
 */
export function parseExifDateTime(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  const [datePart, timePart] = trimmed.split(/\s+/);
  if (!datePart) return null;
  const dateSegments = datePart.replace(/-/g, ':').split(':');
  if (dateSegments.length < 3) return null;
  const y = parseInt(dateSegments[0], 10);
  const m = parseInt(dateSegments[1], 10);
  const d = parseInt(dateSegments[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const data = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  let horario = '';
  if (timePart) {
    const [h, min] = timePart.split(':').map((x) => parseInt(x, 10));
    if (!isNaN(h) && h >= 0 && h <= 23 && !isNaN(min) && min >= 0 && min <= 59) {
      horario = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
  }
  return { data, horario: horario || null };
}

/** Máscara horário HH:mm (até 5 caracteres: HH:mm). */
export function maskTimeInput(text) {
  const digits = (text || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + ':' + digits.slice(2);
}
