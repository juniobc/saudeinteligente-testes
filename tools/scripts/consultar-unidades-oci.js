// Script utilitário — Consultar unidades solicitantes, executantes e reguladoras
// Uso: node tools/scripts/consultar-unidades-oci.js

import { dbQuery, closePool } from '../db-query.js';

const SCHEMA = 'go_luziania';

async function main() {
  try {
    // 1. Estrutura da tabela oci_unidade_solicitante
    console.log('=== Estrutura: oci_unidade_solicitante ===');
    const colsSol = await dbQuery(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'oci_unidade_solicitante' ORDER BY ordinal_position`,
      [SCHEMA]
    );
    console.log(colsSol.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));

    // 2. Amostra de unidades solicitantes
    console.log('\n=== Unidades Solicitantes (amostra) ===');
    const solicitantes = await dbQuery(`SELECT * FROM ${SCHEMA}.oci_unidade_solicitante LIMIT 5`);
    console.log(JSON.stringify(solicitantes.rows, null, 2));
    const totalSol = await dbQuery(`SELECT COUNT(*) as total FROM ${SCHEMA}.oci_unidade_solicitante`);
    console.log(`Total: ${totalSol.rows[0].total}`);

    // 3. Estrutura da tabela oci_unidade_executante
    console.log('\n=== Estrutura: oci_unidade_executante ===');
    const colsExec = await dbQuery(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'oci_unidade_executante' ORDER BY ordinal_position`,
      [SCHEMA]
    );
    console.log(colsExec.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));

    // 4. Amostra de unidades executantes
    console.log('\n=== Unidades Executantes (amostra) ===');
    const executantes = await dbQuery(`SELECT * FROM ${SCHEMA}.oci_unidade_executante LIMIT 5`);
    console.log(JSON.stringify(executantes.rows, null, 2));
    const totalExec = await dbQuery(`SELECT COUNT(*) as total FROM ${SCHEMA}.oci_unidade_executante`);
    console.log(`Total: ${totalExec.rows[0].total}`);

    // 5. Unidades solicitantes com profissionais vinculados
    console.log('\n=== Unidades SOLICITANTES com profissionais vinculados ===');
    const solComProf = await dbQuery(`
      SELECT us.co_cnes, est.no_fantasia, COUNT(DISTINCT otv.co_profs) as total_profissionais
      FROM ${SCHEMA}.oci_unidade_solicitante us
      INNER JOIN ${SCHEMA}.oci_tb_vinculo otv ON otv.co_cnes::text = us.co_cnes::text
      INNER JOIN ${SCHEMA}.oci_tb_profissionais otp ON otv.co_profs = otp.co_profs
      LEFT JOIN ${SCHEMA}.cnes_base_estabelecimentos est ON est.co_cnes = us.co_cnes::text
      WHERE (otv.dt_ini IS NULL OR otv.dt_ini <= CURRENT_DATE)
        AND (otv.dt_fim IS NULL OR otv.dt_fim >= CURRENT_DATE)
      GROUP BY us.co_cnes, est.no_fantasia
      ORDER BY total_profissionais DESC
      LIMIT 10
    `);
    console.log(JSON.stringify(solComProf.rows, null, 2));

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await closePool();
  }
}

main();
