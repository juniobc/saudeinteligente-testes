// Verificar se DANIELA GOMES SOUZA já tem OCI aberta
import { dbQuery, closePool } from '../db-query.js';

const S = 'br_distrito_federal';

async function main() {
  try {
    // 1. Buscar paciente por CNS
    console.log('=== Buscando DANIELA por CNS 709551566979615 ===');
    const pac = await dbQuery(
      `SELECT co_paciente, no_pac, nu_cns, nu_cpf FROM ${S}.oci_tb_paciente WHERE TRIM(nu_cns) = $1`,
      ['709551566979615']
    );
    console.log(`Encontrados: ${pac.rowCount}`);
    for (const r of pac.rows) {
      console.log(`  co_paciente=${r.co_paciente} nome=${r.no_pac} cns=${r.nu_cns} cpf=${r.nu_cpf}`);
      
      // 2. Verificar OCIs abertas desse paciente
      console.log(`\n=== OCIs de co_paciente=${r.co_paciente} ===`);
      const ocis = await dbQuery(
        `SELECT nr_protocolo, id_linha_cuidado, st_fila, dt_solicitacao, st_origem
         FROM ${S}.oci_tb_fila_espera_oci WHERE co_pac = $1`,
        [r.co_paciente]
      );
      console.log(`  Total OCIs: ${ocis.rowCount}`);
      for (const o of ocis.rows) {
        console.log(`    protocolo=${o.nr_protocolo} linha=${o.id_linha_cuidado} st_fila=${o.st_fila} origem=${o.st_origem} dt=${o.dt_solicitacao}`);
      }
    }

    // 3. Verificar linhas de cuidado disponíveis (para entender os IDs)
    console.log('\n=== Linhas de cuidado (Oftalmologia) ===');
    const linhas = await dbQuery(
      `SELECT lc.id_linha_cuidado, g.no_linha, lc.no_grupo, lc.co_procd_medc
       FROM ${S}.oci_tb_linha_cuidado lc
       JOIN ${S}.oci_tb_gp_linha_cuidado g ON lc.co_grupo = g.id_linha
       WHERE g.no_linha ILIKE '%oftalmo%'
       ORDER BY lc.id_linha_cuidado`,
      []
    );
    for (const r of linhas.rows) {
      console.log(`  id=${r.id_linha_cuidado} grupo=${r.no_linha} nome=${r.no_grupo} proc=${r.co_procd_medc}`);
    }

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await closePool();
  }
}

main();
