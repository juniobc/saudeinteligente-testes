import { dbQuery, closePool } from '../db-query.js';
const SCHEMA = 'br_amapa';
async function main() {
  const procs = await dbQuery(`
    SELECT id_linha_cuidado, co_procd_medc, st_opcional, tp_proc_linha, st_obrigatorio
    FROM oci_tb_procedimentos_linha
    WHERE id_linha_cuidado IN (6,7)
    ORDER BY id_linha_cuidado, tp_proc_linha
  `, [], SCHEMA);
  console.log(JSON.stringify(procs.rows, null, 2));
  await closePool();
}
main();
