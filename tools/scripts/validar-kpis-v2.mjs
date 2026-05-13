// Validação dos KPIs — verificar estado atual do banco
import { dbQuery, closePool } from '../db-query.js';

const S = 'br_distrito_federal';

async function main() {
  try {
    // 1. Cargas existentes
    console.log('=== CARGAS EXISTENTES ===');
    const cargas = await dbQuery(
      `SELECT id, st_status, qt_registros_extraidos, qt_registros_importados, 
              qt_registros_duplicados, qt_registros_sem_mapeamento,
              qt_pacientes_criados, dry_run, dt_hr_inicio_carga
       FROM ${S}.oci_carga_sisreg ORDER BY id DESC LIMIT 5`
    );
    console.log(`Total cargas: ${cargas.rowCount}`);
    for (const r of cargas.rows) {
      console.log(`  id=${r.id} status=${r.st_status} extraidos=${r.qt_registros_extraidos} importados=${r.qt_registros_importados} pac_criados=${r.qt_pacientes_criados} dry_run=${r.dry_run} dt=${r.dt_hr_inicio_carga}`);
    }

    // 2. Total registros em oci_dados_carga_sisreg
    console.log('\n=== oci_dados_carga_sisreg ===');
    const totalDados = await dbQuery(`SELECT COUNT(*) as total FROM ${S}.oci_dados_carga_sisreg`);
    console.log(`Total registros: ${totalDados.rows[0].total}`);

    if (parseInt(totalDados.rows[0].total) === 0) {
      console.log('\n⚠️ TABELA VAZIA — o Preview (dry_run) NÃO persiste dados na oci_dados_carga_sisreg!');
      console.log('O KPI Service busca dados dessa tabela. Se está vazia, retorna tudo zerado.');
      console.log('');
      console.log('EXPLICAÇÃO DO PROBLEMA:');
      console.log('- O Preview (dry_run=true) calcula tudo em memória e retorna no response');
      console.log('- MAS NÃO grava na oci_dados_carga_sisreg (porque é simulação)');
      console.log('- O endpoint /kpis busca dados da oci_dados_carga_sisreg');
      console.log('- Como a tabela está vazia, retorna taxa=0%, convertidos=0, etc.');
      console.log('');
      console.log('Os valores que aparecem no frontend (214, 65, 160, 20) vêm do');
      console.log('response do Preview (dados.stats), NÃO do endpoint /kpis.');
      console.log('');
      console.log('SOLUÇÃO: Os KPIs do Resumo Executivo devem usar dados.stats quando');
      console.log('disponível (preview/importação), e só chamar /kpis quando não há dados locais.');
    }

    // 3. OCIs existentes
    console.log('\n=== OCIs SISREG (st_origem=3) ===');
    const ocis = await dbQuery(`SELECT COUNT(*) as total FROM ${S}.oci_tb_fila_espera_oci WHERE st_origem = 3`);
    console.log(`Total: ${ocis.rows[0].total}`);

    // 4. Total pacientes
    console.log('\n=== PACIENTES ===');
    const pacs = await dbQuery(`SELECT COUNT(*) as total FROM ${S}.oci_tb_paciente`);
    console.log(`Total: ${pacs.rows[0].total}`);

    // 5. Transmissões
    console.log('\n=== TRANSMISSÕES ===');
    const trans = await dbQuery(`SELECT COUNT(*) as total FROM ${S}.oci_transmissao_regulacao`);
    console.log(`Total: ${trans.rows[0].total}`);

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await closePool();
  }
}

main();
