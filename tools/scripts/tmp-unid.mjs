import { dbQuery, closePool } from '../db-query.js';
const SCHEMA = 'br_amapa';
async function main() {
  const cols = await dbQuery(`SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='oci_tb_unidade_oferta_linha_cuidado' ORDER BY ordinal_position`, [SCHEMA], SCHEMA);
  console.log('cols:', cols.rows.map(r=>r.column_name).join(', '));
  const u = await dbQuery(`
    SELECT * FROM oci_tb_unidade_oferta_linha_cuidado WHERE id_linha_cuidado = 25
  `, [], SCHEMA);
  console.log(JSON.stringify(u.rows, null, 2));
  await closePool();
}
main();
