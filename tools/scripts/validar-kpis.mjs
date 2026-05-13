// Validação completa dos KPIs — comparar banco vs o que o frontend mostra
import { dbQuery, closePool } from '../db-query.js';

const S = 'br_distrito_federal';

async function main() {
  try {
    // 1. Última carga real
    console.log('=== ÚLTIMA CARGA ===');
    const cargas = await dbQuery(
      `SELECT id, st_status, qt_registros_extraidos, qt_registros_importados, 
              qt_registros_erro, qt_registros_duplicados, qt_registros_sem_mapeamento,
              qt_pacientes_criados, dry_run
       FROM ${S}.oci_carga_sisreg ORDER BY id DESC LIMIT 3`
    );
    for (const r of cargas.rows) {
      console.log(`  id=${r.id} status=${r.st_status} extraidos=${r.qt_registros_extraidos} importados=${r.qt_registros_importados} duplicados=${r.qt_registros_duplicados} sem_map=${r.qt_registros_sem_mapeamento} pac_criados=${r.qt_pacientes_criados} dry_run=${r.dry_run}`);
    }

    if (cargas.rows.length === 0) {
      console.log('⚠️ Nenhuma carga encontrada — pode ter sido resetado. Verificando todas as tabelas...');
      
      const totalAll = await dbQuery(`SELECT COUNT(*) as total FROM ${S}.oci_dados_carga_sisreg`);
      console.log(`Total registros em oci_dados_carga_sisreg (todas cargas): ${totalAll.rows[0].total}`);
      
      const totalOcis = await dbQuery(`SELECT COUNT(*) as total FROM ${S}.oci_tb_fila_espera_oci WHERE st_origem = 3`);
      console.log(`Total OCIs SISREG (st_origem=3): ${totalOcis.rows[0].total}`);
      
      const totalPac = await dbQuery(`SELECT COUNT(*) as total FROM ${S}.oci_tb_paciente`);
      console.log(`Total pacientes: ${totalPac.rows[0].total}`);
      
      await closePool();
      return;
    }

    const lastCarga = cargas.rows[0];
    const lastId = lastCarga.id;
    console.log(`\nAnalisando carga id=${lastId}...`);

    // 2. Total de registros na oci_dados_carga_sisreg para essa carga
    console.log('\n=== REGISTROS NA oci_dados_carga_sisreg ===');
    const totalRegs = await dbQuery(
      `SELECT COUNT(*) as total FROM ${S}.oci_dados_carga_sisreg WHERE id_carga_sisreg = $1`,
      [lastId]
    );
    console.log(`Total registros: ${totalRegs.rows[0].total}`);

    // 3. Registros com co_oci_importada (convertidos)
    const convertidos = await dbQuery(
      `SELECT COUNT(*) as total FROM ${S}.oci_dados_carga_sisreg 
       WHERE id_carga_sisreg = $1 AND co_oci_importada IS NOT NULL`,
      [lastId]
    );
    console.log(`Com co_oci_importada (convertidos): ${convertidos.rows[0].total}`);

    // 4. Registros com st_status = true
    const statusTrue = await dbQuery(
      `SELECT COUNT(*) as total FROM ${S}.oci_dados_carga_sisreg 
       WHERE id_carga_sisreg = $1 AND st_status = true`,
      [lastId]
    );
    console.log(`st_status=true: ${statusTrue.rows[0].total}`);

    // 5. Registros com st_status = false
    const statusFalse = await dbQuery(
      `SELECT COUNT(*) as total FROM ${S}.oci_dados_carga_sisreg 
       WHERE id_carga_sisreg = $1 AND st_status = false`,
      [lastId]
    );
    console.log(`st_status=false: ${statusFalse.rows[0].total}`);

    // 6. Distribuição por ds_erro
    console.log('\n=== DISTRIBUIÇÃO POR ds_erro ===');
    const erros = await dbQuery(
      `SELECT ds_erro, COUNT(*) as total 
       FROM ${S}.oci_dados_carga_sisreg 
       WHERE id_carga_sisreg = $1
       GROUP BY ds_erro ORDER BY total DESC`,
      [lastId]
    );
    for (const r of erros.rows) {
      console.log(`  "${r.ds_erro || 'NULL'}": ${r.total}`);
    }

    // 7. Pacientes únicos (co_paciente_vinculado)
    console.log('\n=== PACIENTES ===');
    const pacDistinct = await dbQuery(
      `SELECT COUNT(DISTINCT co_paciente_vinculado) as total 
       FROM ${S}.oci_dados_carga_sisreg 
       WHERE id_carga_sisreg = $1 AND co_paciente_vinculado IS NOT NULL`,
      [lastId]
    );
    console.log(`Pacientes com co_paciente_vinculado: ${pacDistinct.rows[0].total}`);

    const pacNull = await dbQuery(
      `SELECT COUNT(*) as total 
       FROM ${S}.oci_dados_carga_sisreg 
       WHERE id_carga_sisreg = $1 AND co_paciente_vinculado IS NULL`,
      [lastId]
    );
    console.log(`Registros com co_paciente_vinculado NULL: ${pacNull.rows[0].total}`);

    // 8. Registros com cid_obito (óbitos)
    const obitos = await dbQuery(
      `SELECT COUNT(*) as total FROM ${S}.oci_dados_carga_sisreg 
       WHERE id_carga_sisreg = $1 AND (cid_obito IS NOT NULL OR ds_erro ILIKE '%obito%')`,
      [lastId]
    );
    console.log(`\nÓbitos (cid_obito NOT NULL ou ds_erro LIKE obito): ${obitos.rows[0].total}`);

    // 9. Registros duplicados
    const duplicados = await dbQuery(
      `SELECT COUNT(*) as total FROM ${S}.oci_dados_carga_sisreg 
       WHERE id_carga_sisreg = $1 AND ds_erro ILIKE '%duplicad%'`,
      [lastId]
    );
    console.log(`Duplicados (ds_erro LIKE duplicad): ${duplicados.rows[0].total}`);

    // 10. Pendentes classificação
    const pendentes = await dbQuery(
      `SELECT COUNT(*) as total FROM ${S}.oci_dados_carga_sisreg 
       WHERE id_carga_sisreg = $1 AND (ds_erro ILIKE '%classific%' OR ds_erro ILIKE '%multipla%' OR ds_erro ILIKE '%múltipla%')`,
      [lastId]
    );
    console.log(`Pendentes classificação: ${pendentes.rows[0].total}`);

    // 11. Sem mapeamento
    const semMap = await dbQuery(
      `SELECT COUNT(*) as total FROM ${S}.oci_dados_carga_sisreg 
       WHERE id_carga_sisreg = $1 AND ds_erro ILIKE '%mapeamento%'`,
      [lastId]
    );
    console.log(`Sem mapeamento: ${semMap.rows[0].total}`);

    // 12. Amostra de registros para entender a estrutura
    console.log('\n=== AMOSTRA (5 primeiros registros) ===');
    const amostra = await dbQuery(
      `SELECT id, no_cidadao, st_status, co_oci_importada, co_paciente_vinculado, ds_erro
       FROM ${S}.oci_dados_carga_sisreg 
       WHERE id_carga_sisreg = $1
       ORDER BY id LIMIT 5`,
      [lastId]
    );
    for (const r of amostra.rows) {
      console.log(`  id=${r.id} nome=${(r.no_cidadao||'').substring(0,25)} status=${r.st_status} oci=${r.co_oci_importada} pac=${r.co_paciente_vinculado} erro=${(r.ds_erro||'').substring(0,50)}`);
    }

    // 13. RESUMO — O que o KPI Service deveria calcular
    console.log('\n========================================');
    console.log('RESUMO — VALORES ESPERADOS DOS KPIs');
    console.log('========================================');
    const totalSolic = parseInt(totalRegs.rows[0].total);
    const totalConvertidos = parseInt(convertidos.rows[0].total);
    const totalObitos = parseInt(obitos.rows[0].total);
    const totalDuplicados = parseInt(duplicados.rows[0].total);
    const totalPendentes = parseInt(pendentes.rows[0].total);
    const totalSemMap = parseInt(semMap.rows[0].total);
    const totalPacVinculados = parseInt(pacDistinct.rows[0].total);

    const taxaConversao = totalSolic > 0 ? (totalConvertidos / totalSolic * 100).toFixed(1) : 0;
    
    console.log(`Total Solicitações: ${totalSolic}`);
    console.log(`Total Pacientes (vinculados): ${totalPacVinculados}`);
    console.log(`Convertidos (co_oci_importada NOT NULL): ${totalConvertidos}`);
    console.log(`Taxa Conversão: ${taxaConversao}%`);
    console.log(`Óbitos: ${totalObitos}`);
    console.log(`Duplicados: ${totalDuplicados}`);
    console.log(`Pendentes: ${totalPendentes}`);
    console.log(`Sem Mapeamento: ${totalSemMap}`);
    console.log(`\n⚠️ Se convertidos=0 mas o frontend mostra 160, o problema é que co_oci_importada não está sendo preenchido na oci_dados_carga_sisreg`);

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await closePool();
  }
}

main();
