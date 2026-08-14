import { dbQuery, closePool } from './tools/db-query.js';
const schema = 'mg_vicosa';
let lastFase = null, lastStatus = null;
while (true) {
  const r = await dbQuery(`SELECT no_fase_atual, st_status, qt_registros_extraidos, qt_ocis_criadas, qt_recursos_fhir, ds_erro FROM oci_integracao_carga WHERE no_sistema='REGFACIL' ORDER BY id DESC LIMIT 1`, [], schema);
  const row = r.rows[0];
  if (!row) { console.log('sem carga encontrada'); break; }
  if (row.no_fase_atual !== lastFase || row.st_status !== lastStatus) {
    console.log(`fase=${row.no_fase_atual} status=${row.st_status} extraidos=${row.qt_registros_extraidos} ocis=${row.qt_ocis_criadas} fhir=${row.qt_recursos_fhir} erro=${row.ds_erro || ''}`);
    lastFase = row.no_fase_atual; lastStatus = row.st_status;
  }
  if (row.st_status !== 0) {
    console.log('FINALIZADO status=' + row.st_status);
    break;
  }
  await new Promise(res => setTimeout(res, 5000));
}
await closePool();
