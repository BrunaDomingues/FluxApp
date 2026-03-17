/**
 * Camada de persistência com SQLite (expo-sqlite).
 * Substitui AsyncStorage; mesma API de load/save para o AppContext.
 * Schema: perfil (principal), usuarios (só quem divide), kv (demais dados em JSON).
 */

import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_NAME = 'fluxapp.db';
const MIGRATION_KEY = '@fluxapp_sqlite_migrated';
let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  await dbInstance.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS perfil (
      id INTEGER PRIMARY KEY DEFAULT 1,
      nome_completo TEXT,
      cpf TEXT
    );
    INSERT OR IGNORE INTO perfil (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      cpf TEXT
    );

    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
  if (!migrated) {
    await migrateFromAsyncStorage(dbInstance);
    await AsyncStorage.setItem(MIGRATION_KEY, '1');
  }
  return dbInstance;
}

async function migrateFromAsyncStorage(db) {
  try {
    const perfilRaw = await AsyncStorage.getItem('@fluxapp_perfil');
    if (perfilRaw) {
      const p = JSON.parse(perfilRaw);
      if (p && (p.nomeCompleto || p.cpf)) {
        await db.runAsync(
          'UPDATE perfil SET nome_completo = ?, cpf = ? WHERE id = 1',
          p.nomeCompleto ?? null,
          p.cpf ?? null
        );
      }
    }
    let oldPrincipalId = null;
    const usuariosRaw = await AsyncStorage.getItem('@fluxapp_usuarios');
    if (usuariosRaw) {
      const list = JSON.parse(usuariosRaw);
      if (Array.isArray(list)) {
        const principalUser = list.find((u) => u.principal === true);
        if (principalUser) oldPrincipalId = principalUser.id;
        for (const u of list) {
          if (u.principal) continue;
          if (u.id && u.nome) {
            await db.runAsync(
              'INSERT OR REPLACE INTO usuarios (id, nome, cpf) VALUES (?, ?, ?)',
              u.id,
              u.nome || '',
              u.cpf ?? null
            );
          }
        }
      }
    }
    const kvKeys = [
      '@fluxapp_categorias',
      '@fluxapp_cards_tela_inicial',
      '@fluxapp_contas',
      '@fluxapp_cartoes',
      '@fluxapp_transacoes',
      '@fluxapp_orcamento_mensal',
      '@fluxapp_financiamentos',
      '@fluxapp_objetivos',
      '@fluxapp_recebimentos_usuarios',
      '@fluxapp_cobrancas_recebidas',
    ];
    for (const key of kvKeys) {
      let value = await AsyncStorage.getItem(key);
      if (value != null) {
        if (key === '@fluxapp_transacoes' && oldPrincipalId) {
          try {
            const arr = JSON.parse(value);
            if (Array.isArray(arr)) {
              const updated = arr.map((t) => {
                if (!t.divisao?.partes) return t;
                return {
                  ...t,
                  divisao: {
                    ...t.divisao,
                    partes: t.divisao.partes.map((p) =>
                      p.userId === oldPrincipalId ? { ...p, userId: 'principal' } : p
                    ),
                  },
                };
              });
              value = JSON.stringify(updated);
            }
          } catch (_) {}
        }
        if (key === '@fluxapp_recebimentos_usuarios' && oldPrincipalId) {
          try {
            const arr = JSON.parse(value);
            if (Array.isArray(arr)) {
              const updated = arr.map((r) =>
                r.userId === oldPrincipalId ? { ...r, userId: 'principal' } : r
              );
              value = JSON.stringify(updated);
            }
          } catch (_) {}
        }
        await db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, value);
      }
    }
  } catch (e) {
    console.warn('migrateFromAsyncStorage:', e);
  }
}

function kvKey(name) {
  return `@fluxapp_${name}`;
}

// --- Perfil (sempre id=1, principal do app) ---
export async function loadPerfil() {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync('SELECT nome_completo, cpf FROM perfil WHERE id = 1');
    if (!row) return null;
    return {
      nomeCompleto: row.nome_completo || undefined,
      cpf: row.cpf || undefined,
    };
  } catch (e) {
    console.warn('loadPerfil:', e);
    return null;
  }
}

export async function savePerfil(perfil) {
  try {
    const db = await getDb();
    await db.runAsync(
      'UPDATE perfil SET nome_completo = ?, cpf = ? WHERE id = 1',
      perfil?.nomeCompleto ?? null,
      perfil?.cpf ?? null
    );
  } catch (e) {
    console.warn('savePerfil:', e);
  }
}

// --- Usuários (só quem divide; principal não fica aqui) ---
export async function loadUsuarios() {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync('SELECT id, nome, cpf FROM usuarios ORDER BY nome');
    return rows.map((r) => ({
      id: r.id,
      nome: r.nome || '',
      cpf: r.cpf || undefined,
    }));
  } catch (e) {
    console.warn('loadUsuarios:', e);
    return [];
  }
}

export async function saveUsuarios(usuarios) {
  try {
    const db = await getDb();
    await db.runAsync('DELETE FROM usuarios');
    for (const u of usuarios || []) {
      await db.runAsync(
        'INSERT INTO usuarios (id, nome, cpf) VALUES (?, ?, ?)',
        u.id,
        u.nome || '',
        u.cpf ?? null
      );
    }
  } catch (e) {
    console.warn('saveUsuarios:', e);
  }
}

export async function addUsuario(id, nome, cpf) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO usuarios (id, nome, cpf) VALUES (?, ?, ?)',
    id,
    (nome || '').trim() || 'Usuário',
    cpf ?? null
  );
}

export async function updateUsuario(id, payload) {
  const db = await getDb();
  if (payload.nome !== undefined) {
    await db.runAsync('UPDATE usuarios SET nome = ? WHERE id = ?', payload.nome, id);
  }
  if (payload.cpf !== undefined) {
    await db.runAsync('UPDATE usuarios SET cpf = ? WHERE id = ?', payload.cpf || null, id);
  }
}

export async function removeUsuario(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM usuarios WHERE id = ?', id);
}

// --- KV (contas, cartões, transações, etc. em JSON) ---
async function kvGet(key) {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT value FROM kv WHERE key = ?', key);
  return row?.value ?? null;
}

async function kvSet(key, value) {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)',
    key,
    value == null ? '' : (typeof value === 'string' ? value : JSON.stringify(value))
  );
}

export async function loadCategorias() {
  const raw = await kvGet(kvKey('categorias'));
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {}
  }
  return null;
}

export async function saveCategorias(categorias) {
  await kvSet(kvKey('categorias'), categorias);
}

export async function loadCardsTelaInicial() {
  const raw = await kvGet(kvKey('cards_tela_inicial'));
  if (raw) {
    try {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        if (Array.isArray(data.order)) return { enabled: data.enabled || data, order: data.order };
        return { enabled: data, order: null };
      }
    } catch (_) {}
  }
  return null;
}

export async function saveCardsTelaInicial(data) {
  await kvSet(kvKey('cards_tela_inicial'), data);
}

export async function loadContas() {
  const raw = await kvGet(kvKey('contas'));
  if (raw) {
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : null;
    } catch (_) {}
  }
  return null;
}

export async function saveContas(contas) {
  await kvSet(kvKey('contas'), contas);
}

export async function loadCartoes() {
  const raw = await kvGet(kvKey('cartoes'));
  if (raw) {
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (_) {}
  }
  return null;
}

export async function saveCartoes(cartoes) {
  await kvSet(kvKey('cartoes'), cartoes);
}

export async function loadTransacoes() {
  const raw = await kvGet(kvKey('transacoes'));
  if (raw) {
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (_) {}
  }
  return null;
}

export async function saveTransacoes(transacoes) {
  await kvSet(kvKey('transacoes'), transacoes);
}

export async function loadOrcamentoMensal() {
  const raw = await kvGet(kvKey('orcamento_mensal'));
  if (raw) {
    try {
      const data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : {};
    } catch (_) {}
  }
  return null;
}

export async function saveOrcamentoMensal(orcamentoMensal) {
  await kvSet(kvKey('orcamento_mensal'), orcamentoMensal || {});
}

export async function loadFinanciamentos() {
  const raw = await kvGet(kvKey('financiamentos'));
  if (raw) {
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (_) {}
  }
  return [];
}

export async function saveFinanciamentos(financiamentos) {
  await kvSet(kvKey('financiamentos'), financiamentos);
}

export async function loadObjetivos() {
  const raw = await kvGet(kvKey('objetivos'));
  if (raw) {
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (_) {}
  }
  return [];
}

export async function saveObjetivos(objetivos) {
  await kvSet(kvKey('objetivos'), objetivos);
}

export async function loadRecebimentosUsuarios() {
  const raw = await kvGet(kvKey('recebimentos_usuarios'));
  if (raw) {
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (_) {}
  }
  return [];
}

export async function saveRecebimentosUsuarios(recebimentos) {
  await kvSet(kvKey('recebimentos_usuarios'), recebimentos);
}

export async function loadCobrancasRecebidas() {
  const raw = await kvGet(kvKey('cobrancas_recebidas'));
  if (raw) {
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (_) {}
  }
  return [];
}

export async function saveCobrancasRecebidas(cobrancas) {
  await kvSet(kvKey('cobrancas_recebidas'), cobrancas);
}

export async function clearAllFluxAppData() {
  try {
    const db = await getDb();
    await db.runAsync('DELETE FROM kv');
    await db.runAsync('UPDATE perfil SET nome_completo = NULL, cpf = NULL WHERE id = 1');
    await db.runAsync('DELETE FROM usuarios');
  } catch (e) {
    console.warn('clearAllFluxAppData:', e);
  }
}
