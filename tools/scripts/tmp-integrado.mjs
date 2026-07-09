import { dbQuery, closePool } from '../db-query.js';
const SCHEMA = 'br_amapa';
async function main() {
  const linhas = await dbQuery(`
    SELECT DISTINCT id_linha_cuidado, no_grupo, id_progressao, st_exige_regulacao
    FROM oci_tb_linha_cuidado
    WHERE id_progressao = 1
    ORDER BY id_linha_cuidado
  `, [], SCHEMA);
  console.log(JSON.stringify(linhas.rows, null, 2));
  await closePool();
}
main();
