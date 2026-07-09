import { dbQuery, closePool } from '../db-query.js';
const SCHEMA = 'br_amapa';
async function main() {
  const cols = await dbQuery(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema=$1 AND table_name='oci_tb_linha_cuidado'
    ORDER BY ordinal_position
  `, [SCHEMA], SCHEMA);
  console.log(cols.rows.map(r=>r.column_name).join(', '));
  await closePool();
}
main();
