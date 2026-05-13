// Verificar OCIs abertas que deveriam estar no set ocis_abertas
import { dbQuery, closePool } from '../db-query.js';

const S = 'br_distrito_federal';

async function main() {
  try {
    // Simular o que _carregar_contexto faz: SELECT co_pac, id_linha_cuidado WHERE st_fila NOT IN (7, 8)
    console.log('=== OCIs abertas (st_fila NOT IN 7,8) — simulando ocis_abertas ===');
    const ocis = await dbQuery(
      `SELECT co_pac, id_linha_cuidado, nr_protocolo, st_fila 
       FROM ${S}.oci_tb_fila_espera_oci 
       WHERE st_fila NOT IN (7, 8)
       ORDER BY co_pac, id_linha_cuidado`
    );
    console.log(`Total: ${ocis.rowCount}`);
    for (const r of ocis.rows) {
      console.log(`  co_pac=${r.co_pac} linha=${r.id_linha_cuidado} protocolo=${r.nr_protocolo} st_fila=${r.st_fila}`);
    }

    // Verificar especificamente DANIELA (co_pac=41)
    console.log('\n=== DANIELA (co_pac=41) ===');
    const daniela = ocis.rows.filter(r => r.co_pac == 41);
    if (daniela.length > 0) {
      console.log(`✅ DANIELA tem ${daniela.length} OCI(s) aberta(s):`);
      for (const r of daniela) {
        console.log(`  linha=${r.id_linha_cuidado} protocolo=${r.nr_protocolo} st_fila=${r.st_fila}`);
      }
      console.log('→ Essas linhas NÃO devem aparecer como candidatas no modal de classificação');
    } else {
      console.log('❌ DANIELA NÃO tem OCIs abertas — o set ocis_abertas não a incluiria');
    }

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await closePool();
  }
}

main();
