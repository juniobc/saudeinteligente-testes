import { dbQuery, closePool } from '../db-query.js';
const SCHEMA = 'br_amapa';
async function main() {
  const lines = [25,31,32];
  const procs = await dbQuery(`
    SELECT id_linha_cuidado, co_procd_medc, st_opcional, tp_proc_linha, st_obrigatorio
    FROM oci_tb_procedimentos_linha
    WHERE id_linha_cuidado = ANY($1::int[])
    ORDER BY id_linha_cuidado, co_ordem
  `, [lines], SCHEMA);
  console.log(JSON.stringify(procs.rows, null, 2));
  await closePool();
}
main();
