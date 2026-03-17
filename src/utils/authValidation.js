/**
 * Validação de senha no cadastro:
 * - Mais de 6 caracteres (mínimo 7)
 * - Pelo menos uma letra maiúscula
 * - Pelo menos um caractere especial
 * - Senha e repetição devem ser iguais
 */
export function validatePassword(senha, repetir) {
  if (!senha || typeof senha !== 'string') {
    return { ok: false, error: 'Digite a senha.' };
  }
  if (senha.length < 7) {
    return { ok: false, error: 'A senha deve ter mais de 6 caracteres.' };
  }
  if (!/[A-Z]/.test(senha)) {
    return { ok: false, error: 'A senha deve ter pelo menos uma letra maiúscula.' };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(senha)) {
    return { ok: false, error: 'A senha deve ter pelo menos um caractere especial.' };
  }
  if (senha !== repetir) {
    return { ok: false, error: 'As duas senhas devem ser iguais.' };
  }
  return { ok: true };
}

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/** Retorna só os 11 dígitos do CPF (string). */
function cpfDigits(str) {
  if (str == null) return '';
  return String(str).replace(/\D/g, '').slice(0, 11);
}

/**
 * Valida se o CPF tem 11 dígitos e os dígitos verificadores estão corretos.
 * @param {string} cpf - CPF com ou sem máscara
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateCpf(cpf) {
  const digits = cpfDigits(cpf);
  if (digits.length !== 11) {
    return { ok: false, error: 'O CPF deve ter 11 dígitos.' };
  }
  if (/^(\d)\1{10}$/.test(digits)) {
    return { ok: false, error: 'CPF inválido.' };
  }
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i], 10) * (10 - i);
  let first = (sum * 10) % 11;
  if (first === 10) first = 0;
  if (first !== parseInt(digits[9], 10)) {
    return { ok: false, error: 'CPF inválido.' };
  }
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i], 10) * (11 - i);
  let second = (sum * 10) % 11;
  if (second === 10) second = 0;
  if (second !== parseInt(digits[10], 10)) {
    return { ok: false, error: 'CPF inválido.' };
  }
  return { ok: true };
}

/**
 * Traduz mensagens de erro do Supabase Auth para texto amigável em português.
 * @param {string} [message]
 * @returns {string}
 */
export function formatAuthErrorMessage(message) {
  if (!message || typeof message !== 'string') return 'Tente novamente.';
  const m = message.toLowerCase();
  if (m.includes('rate limit') && m.includes('email')) {
    return 'Muitas tentativas. O envio de e-mails está temporariamente limitado. Aguarde alguns minutos e tente novamente.';
  }
  return message;
}
