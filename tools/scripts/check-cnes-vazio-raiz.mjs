import { dbQuery } from '../db-query.js';

const SCHEMA = 'mg_vicosa';

async function main() {
  const recurso = await dbQuery(
    `SELECT id_recurso, ds_recurso, st_processamento
     FROM oci_fhir_recurso
     WHERE tp_recurso = 'ServiceRequest' AND id_externo = '439559'
       AND NOT (ds_recurso ? 'basedOn')
     ORDER BY nu_versao DESC
     LIMIT 1;`,
    [], SCHEMA
  );
  console.log('\n--- ServiceRequest principal (id_externo=439559) ---');
  console.log(JSON.stringify(recurso.rows[0], null, 2));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
