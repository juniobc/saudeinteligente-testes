import { dbQuery } from '../db-query.js';

const SCHEMA = 'mg_vicosa';

async function main() {
  const distintos = await dbQuery(
    `SELECT co_cnes_solicitante, COUNT(*) AS qt
     FROM oci_tb_fila_espera_oci
     WHERE co_cnes_solicitante IS NULL OR co_cnes_solicitante IN ('', '-', ' ')
     GROUP BY co_cnes_solicitante;`,
    [], SCHEMA
  );
  console.log('--- Valores nulos/vazios/traço distintos ---');
  console.log(distintos.rows);

  const amostraVazio = await dbQuery(
    `SELECT nr_protocolo, co_cnes_solicitante, st_origem, dt_cadastro, identificador_oci
     FROM oci_tb_fila_espera_oci
     WHERE co_cnes_solicitante = ''
     ORDER BY dt_cadastro DESC NULLS LAST
     LIMIT 20;`,
    [], SCHEMA
  );
  console.log("\n--- Amostra co_cnes_solicitante = '' (mais recentes primeiro) ---");
  console.log(JSON.stringify(amostraVazio.rows, null, 2));

  const contagemPorOrigem = await dbQuery(
    `SELECT og.ds_origem, COUNT(*) AS qt
     FROM oci_tb_fila_espera_oci f
     LEFT JOIN oci_tb_origem_solicitacao og ON og.id = f.st_origem
     WHERE f.co_cnes_solicitante = ''
     GROUP BY og.ds_origem;`,
    [], SCHEMA
  );
  console.log('\n--- Por origem ---');
  console.log(contagemPorOrigem.rows);

  const maisRecente = await dbQuery(
    `SELECT MAX(dt_cadastro) AS mais_recente, MIN(dt_cadastro) AS mais_antiga, COUNT(*) AS total
     FROM oci_tb_fila_espera_oci
     WHERE co_cnes_solicitante = '';`,
    [], SCHEMA
  );
  console.log('\n--- Intervalo de datas ---');
  console.log(maisRecente.rows);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
