import { dbQuery } from '../db-query.js';

const SCHEMA = 'mg_vicosa';

async function main() {
  const r = await dbQuery(
    `SELECT (ds_recurso->'basedOn'->0->>'reference') AS pai, COUNT(*) AS qt
     FROM oci_fhir_recurso
     WHERE tp_recurso = 'ServiceRequest'
       AND ds_recurso ? 'basedOn'
     GROUP BY pai
     ORDER BY qt DESC
     LIMIT 10;`,
    [], SCHEMA
  );
  console.log('--- Top 10 "pais" com mais secundarios (por referencia basedOn) ---');
  console.log(r.rows);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
