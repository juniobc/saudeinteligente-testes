import { dbQuery, closePool } from './tools/db-query.js';
const schema = 'mg_vicosa';
let last = null;
while (true) {
  const r = await dbQuery(`SELECT no_fase_atual, st_status, qt_ocis_criadas, qt_recursos_fhir, ds_erro FROM oci_integracao_carga WHERE no_sistema='REGFACIL' ORDER BY id DESC LIMIT 1`, [], schema);
  const row = r.rows[0];
  if (!row) { console.log('sem carga encontrada'); break; }
  const key = `${row.no_fase_atual}|${row.st_status}|${Math.floor((row.qt_ocis_criadas||0)/100)}`;
  if (key !== last) {
    console.log(`fase=${row.no_fase_atual} status=${row.st_status} ocis=${row.qt_ocis_criadas} fhir=${row.qt_recursos_fhir} erro=${row.ds_erro || ''}`);
    last = key;
  }
  if (row.st_status !== 0) {
    console.log('FINALIZADO status=' + row.st_status + (row.ds_erro ? (' erro=' + row.ds_erro) : ''));
    break;
  }
  await new Promise(res => setTimeout(res, 10000));
}
await closePool();
