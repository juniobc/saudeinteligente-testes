import { dbQuery, closePool } from '../db-query.js';
const SCHEMA = 'br_amapa';
async function main() {
  const f = await dbQuery(`SELECT nr_protocolo, st_fila, co_pac, id_linha_cuidado FROM oci_tb_fila_espera_oci WHERE nr_protocolo=37604`, [], SCHEMA);
  console.log('fila:', JSON.stringify(f.rows));
  const ag = await dbQuery(`SELECT nr_item, co_procd_medc, cd_tp_agenda, cd_st_agenda, dt_hr_agen, chave_verif, st_comparecimento FROM oci_tb_agenda WHERE nr_protocolo=37604 ORDER BY dt_hr_agen`, [], SCHEMA);
  console.log('agenda:', JSON.stringify(ag.rows, null, 2));
  await closePool();
}
main();
