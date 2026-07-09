import { dbQuery, closePool } from '../db-query.js';
const SCHEMA = 'br_amapa';
async function main() {
  const cols = await dbQuery(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema=$1 AND table_name='oci_tb_procedimentos_linha'
    ORDER BY ordinal_position
  `, [SCHEMA], SCHEMA);
  console.log('cols:', cols.rows.map(r=>r.column_name).join(', '));

  const lines = [2,5,6,7,24,25,26,28,31,32];
  const procs = await dbQuery(`
    SELECT id_linha_cuidado, co_procd_medc, st_opcional, tp_proc_linha
    FROM oci_tb_procedimentos_linha
    WHERE id_linha_cuidado = ANY($1::int[])
      AND co_procd_medc NOT IN ('0301010072','0301010307')
      AND co_procd_medc NOT LIKE '09%'
    ORDER BY id_linha_cuidado
  `, [lines], SCHEMA);
  console.log(JSON.stringify(procs.rows, null, 2));
  await closePool();
}
main();
