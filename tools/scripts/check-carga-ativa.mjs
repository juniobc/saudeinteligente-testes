import { dbQuery } from '../db-query.js';

async function checarTenant(schema) {
  const r = await dbQuery(
    `SELECT id, no_sistema, dt_hr_inicio_carga, dt_hr_fim_carga, st_status, no_fase_atual, tp_disparo
     FROM oci_integracao_carga
     WHERE st_status = 0
     ORDER BY id DESC;`,
    [], schema
  );
  if (r.rows.length) {
    console.log(`[${schema}] CARGA(S) EM ANDAMENTO:`, r.rows);
  } else {
    console.log(`[${schema}] nenhuma carga em andamento.`);
  }
}

const tenants = ['mg_vicosa', 'br_distrito_federal', 'br_amapa'];
for (const t of tenants) {
  await checarTenant(t);
}
process.exit(0);
