import { dbQuery, closePool } from '../db-query.js';
const SCHEMA = 'br_amapa';
async function main() {
  const p = await dbQuery(`SELECT co_paciente, no_pac FROM oci_tb_paciente ORDER BY co_paciente DESC LIMIT 5`, [], SCHEMA);
  console.log(JSON.stringify(p.rows, null, 2));
  await closePool();
}
main();
