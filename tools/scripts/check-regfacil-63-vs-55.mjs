import { dbQuery } from '../db-query.js';

const SCHEMA = 'mg_vicosa';
const ID_CARGA = 38;

async function main() {
  const porTipo = await dbQuery(
    `SELECT tp_recurso, COUNT(*) AS qt, COUNT(DISTINCT id_externo) AS qt_distintos
     FROM oci_fhir_recurso
     WHERE id_carga = $1 AND st_processamento = 2
     GROUP BY tp_recurso
     ORDER BY tp_recurso;`,
    [ID_CARGA], SCHEMA
  );
  console.log('--- Erros por tipo de recurso (carga #38) ---');
  console.log(porTipo.rows);

  const sr = await dbQuery(
    `SELECT COUNT(DISTINCT id_externo) AS qt_service_requests_distintos
     FROM oci_fhir_recurso
     WHERE id_carga = $1 AND st_processamento = 2 AND tp_recurso = 'ServiceRequest';`,
    [ID_CARGA], SCHEMA
  );
  console.log('\n--- ServiceRequests (protocolos) distintos em erro ---');
  console.log(sr.rows);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
