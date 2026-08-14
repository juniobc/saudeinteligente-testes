import { dbQuery } from '../db-query.js';
const SCHEMA = 'mg_vicosa';
async function main() {
  const r = await dbQuery(
    `SELECT no_sistema_origem, COUNT(*) AS qt FROM oci_fhir_recurso WHERE st_processamento = 0 GROUP BY no_sistema_origem;`,
    [], SCHEMA
  );
  console.log('Pendentes (st_processamento=0) por sistema:', r.rows);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
