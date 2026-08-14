import { dbQuery } from '../db-query.js';

const SCHEMA = 'mg_vicosa';

async function main() {
  const porStatus = await dbQuery(
    `SELECT f.st_fila, sf.nm_status, COUNT(*) AS qt
     FROM oci_tb_fila_espera_oci f
     LEFT JOIN oci_tb_status_fila sf ON sf.cd_status = f.st_fila
     WHERE f.co_cnes_solicitante = ''
     GROUP BY f.st_fila, sf.nm_status
     ORDER BY qt DESC;`,
    [], SCHEMA
  );
  console.log('--- Distribuicao por status (st_fila) ---');
  console.log(porStatus.rows);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
