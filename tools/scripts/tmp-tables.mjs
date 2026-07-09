import { dbQuery, closePool } from '../db-query.js';
const SCHEMA = 'br_amapa';
async function main() {
  const t = await dbQuery(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema=$1 AND table_name LIKE 'oci_tb%'
    ORDER BY table_name
  `, [SCHEMA], SCHEMA);
  console.log(t.rows.map(r=>r.table_name).join('\n'));
  await closePool();
}
main();
