// Ferramenta de consulta ao banco de dados PostgreSQL — Guardian
// Permite ao agente consultar tabelas do sistema para entender dados disponíveis,
// validar regras de negócio e descobrir dados de teste válidos.
// SOMENTE LEITURA — nunca executa INSERT, UPDATE, DELETE ou DDL.

import pg from 'pg';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carrega credenciais do banco a partir do .env.postgres
dotenv.config({ path: resolve(__dirname, '../knowledge/base_dados/.env.postgres') });

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Timeout de conexão: 10 segundos
  connectionTimeoutMillis: 10000,
  // Timeout de query: 30 segundos (evita queries longas)
  statement_timeout: 30000,
});

/**
 * Executa uma query SELECT no banco de dados.
 * SOMENTE LEITURA — rejeita qualquer comando que não seja SELECT.
 *
 * @param {string} query - Query SQL (deve começar com SELECT ou WITH)
 * @param {any[]} [params=[]] - Parâmetros para query parametrizada ($1, $2, etc.)
 * @param {string} [schema='public'] - Schema do banco (tenant/município)
 * @returns {Promise<{rows: any[], rowCount: number, fields: string[]}>}
 */
export async function dbQuery(query, params = [], schema = 'public') {
  // Validação de segurança: somente SELECT permitido
  const trimmed = query.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) {
    throw new Error('[db-query] BLOQUEADO: Somente queries SELECT são permitidas. O Guardian tem permissão apenas de leitura.');
  }

  // Bloqueia comandos perigosos mesmo dentro de subqueries
  const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE'];
  for (const cmd of forbidden) {
    if (trimmed.includes(cmd + ' ')) {
      throw new Error(`[db-query] BLOQUEADO: Comando ${cmd} detectado. O Guardian tem permissão apenas de leitura.`);
    }
  }

  const client = await pool.connect();
  try {
    // Define o search_path para o schema do município (tenant)
    await client.query(`SET search_path TO ${schema}, public`);
    const result = await client.query(query, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map(f => f.name) || [],
    };
  } finally {
    client.release();
  }
}

/**
 * Lista as tabelas disponíveis em um schema.
 *
 * @param {string} [schema='public'] - Schema do banco
 * @returns {Promise<string[]>} Lista de nomes de tabelas
 */
export async function listTables(schema = 'public') {
  const result = await dbQuery(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
    [schema]
  );
  return result.rows.map(r => r.table_name);
}

/**
 * Descreve as colunas de uma tabela.
 *
 * @param {string} tableName - Nome da tabela
 * @param {string} [schema='public'] - Schema do banco
 * @returns {Promise<{column_name: string, data_type: string, is_nullable: string}[]>}
 */
export async function describeTable(tableName, schema = 'public') {
  const result = await dbQuery(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [schema, tableName]
  );
  return result.rows;
}

/**
 * Fecha o pool de conexões. Chamar ao final dos testes.
 */
export async function closePool() {
  await pool.end();
}
