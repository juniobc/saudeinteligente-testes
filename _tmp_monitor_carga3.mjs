import { dbQuery, closePool } from './tools/db-query.js';
const schema = 'mg_vicosa';
let last = null;
while (true) {
  const r = await dbQuery(`SELECT no_fase_atual, st_status, qt_ocis_criadas, qt_recursos_fhir, ds_erro FROM oci_integracao_carga WHERE no_sistema='REGFACIL' ORDER BY id DESC LIMIT 1`, [], schema);
  const row = r.rows[0];
  if (!row) { console.log('sem carga encontrada'); break; }
  const r2 = await dbQuery(`SELECT count(*) AS qt FROM oci_fhir_recurso WHERE no_sistema_origem='REGFACIL' AND st_processamento=1`, [], schema);
  const processados = r2.rows[0].qt;
  const key = `${row.no_fase_atual}|${row.st_status}|${Math.floor(processados/50)}`;
  if (key !== last) {
    console.log(`fase=${row.no_fase_atual} status=${row.st_status} processados=${processados} ocis=${row.qt_ocis_criadas} erro=${row.ds_erro || ''}`);
    last = key;
  }
  if (row.st_status !== 0) {
    console.log('FINALIZADO status=' + row.st_status + (row.ds_erro ? (' erro=' + row.ds_erro) : ''));
    break;
  }
  await new Promise(res => setTimeout(res, 15000));
}
await closePool();
