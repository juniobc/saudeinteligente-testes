import { dbQuery } from '../db-query.js';

const SCHEMA = 'mg_vicosa';
const ID_CARGA = 38;

async function main() {
  const porTipo = await dbQuery(
    `SELECT tp_recurso, st_processamento, COUNT(*) AS qt
     FROM oci_fhir_recurso
     WHERE id_carga = $1
     GROUP BY tp_recurso, st_processamento
     ORDER BY tp_recurso, st_processamento;`,
    [ID_CARGA], SCHEMA
  );
  console.log('--- Estado final por tipo/status (carga #38) ---');
  console.log(porTipo.rows);

  const errosRestantes = await dbQuery(
    `SELECT DISTINCT ds_erro_processamento, COUNT(*) AS qt
     FROM oci_fhir_recurso
     WHERE id_carga = $1 AND st_processamento = 2
     GROUP BY ds_erro_processamento;`,
    [ID_CARGA], SCHEMA
  );
  console.log('\n--- Motivos de erro restantes ---');
  console.log(errosRestantes.rows);

  const pacientesRestantes = await dbQuery(
    `SELECT COUNT(*) AS qt FROM oci_fhir_recurso
     WHERE id_carga = $1 AND tp_recurso = 'Patient' AND st_processamento = 2;`,
    [ID_CARGA], SCHEMA
  );
  console.log('\n--- Pacientes (tp_recurso=Patient) ainda em erro ---');
  console.log(pacientesRestantes.rows);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
