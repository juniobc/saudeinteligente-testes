import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'D:/m1031007/Projetos/Prosystema/SaudeInteligente/python/saudeinteligente-api/.env' });

const competencias = [
  '2025-03','2025-04','2025-05','2025-06','2025-07','2025-08',
  '2025-09','2025-10','2025-11','2025-12',
  '2026-01','2026-02','2026-03','2026-04'
];

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_APP_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 10000,
  statement_timeout: 0, // sem limite
});

for (const comp of competencias) {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO mg_vicosa, public`);
    const t0 = Date.now();
    console.log(`[${new Date().toISOString()}] Iniciando ${comp}...`);
    await client.query('CALL sp_c5_processar_individual_competencia($1)', [comp]);
    const elapsed = ((Date.now() - t0) / 1000 / 60).toFixed(1);
    const r = await client.query(
      `SELECT count(*) FROM aps_c5_hipertensao_individual_mes WHERE competencia = $1`, [comp]
    );
    console.log(`OK ${comp} — ${elapsed} min — ${r.rows[0].count} linhas`);
  } catch (e) {
    console.error(`ERRO ${comp}:`, e.message);
  } finally {
    client.release();
  }
}

await pool.end();
console.log('BACKFILL COMPLETO.');
