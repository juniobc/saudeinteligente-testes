import { dbQuery } from '../db-query.js';

const SCHEMA = 'mg_vicosa';

async function main() {
  const protocolos = await dbQuery(
    `SELECT nr_protocolo, identificador_oci
     FROM oci_tb_fila_espera_oci
     WHERE co_cnes_solicitante = ''
     ORDER BY random()
     LIMIT 8;`,
    [], SCHEMA
  );

  for (const p of protocolos.rows) {
    const idExterno = p.identificador_oci.split(':')[1];
    const r = await dbQuery(
      `SELECT ds_recurso
       FROM oci_fhir_recurso
       WHERE tp_recurso = 'ServiceRequest' AND id_externo = $1
         AND NOT (ds_recurso ? 'basedOn')
       ORDER BY nu_versao DESC LIMIT 1;`,
      [idExterno], SCHEMA
    );
    const rec = r.rows[0]?.ds_recurso;
    const temExtensaoUnidade = (rec?.extension || []).some(e =>
      (e.url || '').includes('unidade-solicitante')
    );
    const temPerformer = !!(rec?.performer && rec.performer.length);
    const temRequester = !!rec?.requester;
    console.log(`protocolo=${p.nr_protocolo} id_externo=${idExterno} | extensao_unidade=${temExtensaoUnidade} performer=${temPerformer} requester=${temRequester}`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
