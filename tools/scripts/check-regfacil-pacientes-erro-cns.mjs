import { dbQuery } from '../db-query.js';

const SCHEMA = 'mg_vicosa';
const ID_CARGA = 38;

async function main() {
  const pacientes = await dbQuery(
    `SELECT id_externo, ds_recurso, dt_processamento
     FROM oci_fhir_recurso
     WHERE id_carga = $1 AND tp_recurso = 'Patient' AND st_processamento = 2
     ORDER BY dt_processamento;`,
    [ID_CARGA], SCHEMA
  );

  console.log(`Total de Patients em erro na carga #${ID_CARGA}: ${pacientes.rows.length}`);

  const resumo = pacientes.rows.map(p => {
    const rec = p.ds_recurso;
    const identifiers = rec.identifier || [];
    const cns = identifiers.find(i => (i.system || '').includes('236') || (i.type?.text || '').toLowerCase().includes('cns'));
    const cpf = identifiers.find(i => (i.system || '').includes('237') || (i.type?.text || '').toLowerCase().includes('cpf'));
    return {
      id_externo: p.id_externo,
      nome: rec.name?.[0]?.text || null,
      birthDate: rec.birthDate || null,
      identifiers_raw: identifiers,
      tem_cns: !!(cns && cns.value),
      cns_value: cns ? cns.value : null,
      tem_cpf: !!(cpf && cpf.value),
    };
  });

  console.log(JSON.stringify(resumo, null, 2));

  const comCns = resumo.filter(r => r.tem_cns).length;
  const semCns = resumo.length - comCns;
  console.log(`\nCom CNS na origem: ${comCns} | Sem CNS na origem: ${semCns}`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
