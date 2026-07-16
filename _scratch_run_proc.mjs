import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'D:/m1031007/Projetos/Prosystema/SaudeInteligente/python/saudeinteligente-api/.env' });

const competencia = process.argv[2];
if (!competencia) {
  console.error('Uso: node run_proc.mjs YYYY-MM');
  process.exit(1);
}

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_APP_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 10000,
  statement_timeout: 1200000, // 20 min por competencia
});

const client = await pool.connect();
try {
  await client.query(`SET search_path TO mg_vicosa, public`);
  const t0 = Date.now();
  await client.query('CALL sp_c5_processar_individual_competencia($1)', [competencia]);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const r = await client.query(
    `SELECT count(*) FROM aps_c5_hipertensao_individual_mes WHERE competencia = $1`, [competencia]
  );
  console.log(`OK ${competencia} — ${elapsed}s — ${r.rows[0].count} linhas inseridas`);
} catch (e) {
  console.error(`ERRO ${competencia}:`, e.message);
} finally {
  client.release();
  await pool.end();
}
