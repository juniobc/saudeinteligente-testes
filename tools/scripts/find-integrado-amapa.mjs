// Script utilitário temporário — achar linha Integrada com agenda p/ as 3 fases (Amapá)
import { dbQuery, closePool } from '../db-query.js';

const SCHEMA = 'br_amapa';

async function main() {
  try {
    console.log('=== Linhas de cuidado Integrado (id_progressao=1), Amapá ===');
    const linhas = await dbQuery(`
      SELECT id_linha_cuidado, ds_linha_cuidado, id_progressao, st_exige_regulacao
      FROM oci_tb_linha_cuidado
      WHERE id_progressao = 1
      ORDER BY id_linha_cuidado
    `, [], SCHEMA);
    console.log(JSON.stringify(linhas.rows, null, 2));
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await closePool();
  }
}

main();
