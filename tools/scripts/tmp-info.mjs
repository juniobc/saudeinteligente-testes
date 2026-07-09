import { dbQuery, closePool } from '../db-query.js';
const SCHEMA = 'br_amapa';
async function main() {
  const tipos = await dbQuery(`SELECT cd_tp_agenda, ds_tp_agenda FROM oci_tp_agenda`, [], SCHEMA);
  console.log('tipos agenda:', JSON.stringify(tipos.rows));

  const linha6 = await dbQuery(`SELECT id_linha_cuidado, co_grupo, no_grupo, id_progressao FROM oci_tb_linha_cuidado WHERE id_linha_cuidado=6`, [], SCHEMA);
  console.log('linha6:', JSON.stringify(linha6.rows));

  const profs = await dbQuery(`
    SELECT otp.nr_cns, otp.nm_profs, otv.cd_cbo, otv.co_cnes
    FROM oci_tb_vinculo otv
    INNER JOIN oci_tb_profissionais otp ON otv.co_profs = otp.co_profs
    WHERE otv.co_cnes::text = '3523845'
      AND (otv.dt_ini IS NULL OR otv.dt_ini <= CURRENT_DATE)
      AND (otv.dt_fim IS NULL OR otv.dt_fim >= CURRENT_DATE)
    LIMIT 10
  `, [], SCHEMA);
  console.log('profs 3523845:', JSON.stringify(profs.rows, null, 2));

  await closePool();
}
main();
