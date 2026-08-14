import { dbQuery, describeTable } from '../db-query.js';

const SCHEMA = 'mg_vicosa';

async function main() {
  const t1 = await describeTable('oci_fhir_recurso', SCHEMA);
  console.log('--- oci_fhir_recurso ---');
  console.log(t1.map(c => c.column_name).join(', '));

  const t2 = await describeTable('oci_integracao_resposta', SCHEMA);
  console.log('\n--- oci_integracao_resposta ---');
  console.log(t2.map(c => c.column_name).join(', '));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
