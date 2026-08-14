import { dbQuery } from '../db-query.js';

const SCHEMA = 'mg_vicosa';
const ID_CARGA = 38;

async function main() {
  const pacientes = await dbQuery(
    `SELECT id_externo, ds_recurso
     FROM oci_fhir_recurso
     WHERE id_carga = $1 AND tp_recurso = 'Patient' AND st_processamento = 2
     ORDER BY id_externo;`,
    [ID_CARGA], SCHEMA
  );

  const linhas = pacientes.rows.map(p => {
    const rec = p.ds_recurso;
    const cns = (rec.identifier || []).find(i => (i.system || '').toLowerCase().includes('cns'));
    return `${p.id_externo}|${rec.name?.[0]?.text || ''}|${cns ? cns.value : ''}`;
  });

  console.log(linhas.join('\n'));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
