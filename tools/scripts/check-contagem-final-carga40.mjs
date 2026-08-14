import { dbQuery } from '../db-query.js';
const SCHEMA = 'mg_vicosa';
async function main() {
  const pac = await dbQuery(`SELECT COUNT(*) AS qt FROM oci_tb_paciente;`, [], SCHEMA);
  const oci = await dbQuery(`SELECT COUNT(*) AS qt FROM oci_tb_fila_espera_oci;`, [], SCHEMA);
  console.log('pacientes:', pac.rows[0].qt, '| ocis:', oci.rows[0].qt);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
