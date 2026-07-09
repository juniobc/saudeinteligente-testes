import { dbQuery, closePool } from '../db-query.js';
const SCHEMA = 'br_amapa';
async function main() {
  const codes = ['0903010020','0205020062','0301010072'];
  const agenda = await dbQuery(`
    SELECT co_procd_medc, cd_st_agenda, COUNT(*) as total, MIN(dt_hr_agen) as primeira, MAX(dt_hr_agen) as ultima
    FROM oci_tb_agenda
    WHERE co_procd_medc = ANY($1::text[])
      AND dt_hr_agen > NOW()
    GROUP BY co_procd_medc, cd_st_agenda
    ORDER BY co_procd_medc
  `, [codes], SCHEMA);
  console.log(JSON.stringify(agenda.rows, null, 2));
  await closePool();
}
main();
