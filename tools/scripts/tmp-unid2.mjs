import { dbQuery, closePool } from '../db-query.js';
const SCHEMA = 'br_amapa';
async function main() {
  const lines = [2,5,6,7,20,21,22,24,25,26,27,28,29,30,31,32,35];
  const u = await dbQuery(`
    SELECT id_linha_cuidado, co_cnes, COUNT(*) OVER (PARTITION BY id_linha_cuidado) as n
    FROM oci_tb_unidade_oferta_linha_cuidado
    WHERE id_linha_cuidado = ANY($1::int[])
    ORDER BY id_linha_cuidado
  `, [lines], SCHEMA);
  console.log(JSON.stringify(u.rows, null, 2));
  await closePool();
}
main();
