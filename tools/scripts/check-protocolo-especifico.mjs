import { dbQuery } from '../db-query.js';

const SCHEMA = 'mg_vicosa';
const ID_EXTERNO = process.argv[2] || '100948';

async function main() {
  const fila = await dbQuery(
    `SELECT nr_protocolo, identificador_oci FROM oci_tb_fila_espera_oci WHERE identificador_oci = $1;`,
    [`REGFACIL:${ID_EXTERNO}`], SCHEMA
  );
  console.log('fila:', fila.rows);
  if (!fila.rows.length) return process.exit(0);
  const nrProtocolo = fila.rows[0].nr_protocolo;

  const principal = await dbQuery(
    `SELECT id_recurso, ds_recurso FROM oci_fhir_recurso
     WHERE tp_recurso='ServiceRequest' AND id_externo=$1 AND NOT (ds_recurso ? 'basedOn')
     ORDER BY nu_versao DESC LIMIT 1;`,
    [ID_EXTERNO], SCHEMA
  );
  console.log('\n--- Principal ---');
  console.log(JSON.stringify(principal.rows[0]?.ds_recurso, null, 2));

  const secundarios = await dbQuery(
    `SELECT DISTINCT ON (id_recurso) id_recurso, id_externo, ds_recurso
     FROM oci_fhir_recurso
     WHERE tp_recurso='ServiceRequest' AND ds_recurso @> $1::jsonb
     ORDER BY id_recurso, nu_versao DESC;`,
    [JSON.stringify({basedOn: [{reference: `ServiceRequest/regfacil-fila-${ID_EXTERNO}`}]})], SCHEMA
  );
  console.log(`\n--- Secundarios (${secundarios.rows.length}) ---`);
  for (const s of secundarios.rows) {
    console.log(JSON.stringify(s.ds_recurso, null, 2));
  }

  const tratado = await dbQuery(
    `SELECT nr_protocolo, co_procd_medc, no_procd_medc, st_principal, dt_marcado, tp_situacao
     FROM oci_integracao_procedimento_tratado WHERE nr_protocolo = $1 ORDER BY co_procd_medc, dt_marcado;`,
    [nrProtocolo], SCHEMA
  );
  console.log(`\n--- Tratado atual (${tratado.rows.length} linhas) ---`);
  console.log(tratado.rows);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
