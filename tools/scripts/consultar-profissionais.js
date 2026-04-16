// Script utilitário — Consultar unidades com profissionais cadastrados
// Query baseada em: saudeinteligente-api/microservicoSisrega/service/comuns_service.py → get_profissionais_por_unidade
// Tabelas: oci_tb_vinculo JOIN oci_tb_profissionais (vínculo profissional-unidade)
// Uso: node tools/scripts/consultar-profissionais.js

import { dbQuery, closePool } from '../db-query.js';

const SCHEMA = 'go_luziania';

async function main() {
  try {
    console.log('=== Unidades com profissionais vinculados (oci_tb_vinculo) ===');
    const unidades = await dbQuery(`
      SELECT otv.co_cnes, COUNT(DISTINCT otv.co_profs) as total_profissionais
      FROM ${SCHEMA}.oci_tb_vinculo otv
      INNER JOIN ${SCHEMA}.oci_tb_profissionais otp ON otv.co_profs = otp.co_profs
      WHERE (otv.dt_ini IS NULL OR otv.dt_ini <= CURRENT_DATE)
        AND (otv.dt_fim IS NULL OR otv.dt_fim >= CURRENT_DATE)
      GROUP BY otv.co_cnes
      ORDER BY total_profissionais DESC
      LIMIT 10
    `);
    console.log(JSON.stringify(unidades.rows, null, 2));

    if (unidades.rows.length > 0) {
      const topCnes = unidades.rows[0].co_cnes;
      console.log(`\n=== Profissionais da unidade ${topCnes} (top 5) ===`);
      const profs = await dbQuery(`
        SELECT otp.nr_cns AS value, otp.nm_profs AS label, otv.cd_cbo AS cbo
        FROM ${SCHEMA}.oci_tb_vinculo otv
        INNER JOIN ${SCHEMA}.oci_tb_profissionais otp ON otv.co_profs = otp.co_profs
        WHERE otv.co_cnes::text = $1
          AND (otv.dt_ini IS NULL OR otv.dt_ini <= CURRENT_DATE)
          AND (otv.dt_fim IS NULL OR otv.dt_fim >= CURRENT_DATE)
        ORDER BY otp.nm_profs
        LIMIT 5
      `, [topCnes]);
      console.log(JSON.stringify(profs.rows, null, 2));

      console.log(`\n=== Nome da unidade ${topCnes} ===`);
      const nomeUnidade = await dbQuery(`
        SELECT co_cnes, no_fantasia, no_razao_social
        FROM ${SCHEMA}.cnes_base_estabelecimentos
        WHERE co_cnes = $1
      `, [topCnes]);
      console.log(JSON.stringify(nomeUnidade.rows, null, 2));
    }

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await closePool();
  }
}

main();
