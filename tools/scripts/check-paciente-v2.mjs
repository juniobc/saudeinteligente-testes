// Verificar pacientes pendentes — usando search_path via dbQuery com schema param
import { dbQuery, closePool } from '../db-query.js';

async function main() {
  try {
    // Usar o schema param do dbQuery que faz SET search_path
    const SCHEMA = 'br_distrito_federal';

    // 1. Buscar DANIELA na oci_tb_paciente
    console.log('=== Buscando DANIELA na oci_tb_paciente ===');
    const pac = await dbQuery(
      `SELECT co_paciente, no_pac, nu_cns, nu_cpf 
       FROM oci_tb_paciente 
       WHERE UPPER(no_pac) LIKE '%DANIELA%GOMES%'
       LIMIT 5`,
      [], SCHEMA
    );
    console.log(`Encontrados: ${pac.rowCount}`);
    for (const r of pac.rows) {
      console.log(`  co_paciente=${r.co_paciente} nome=${r.no_pac} cns=${r.nu_cns} cpf=${r.nu_cpf}`);
    }

    // 2. Última carga
    console.log('\n=== Últimas cargas ===');
    const cargas = await dbQuery(
      `SELECT id, dt_hr_inicio_carga, st_status, qt_registros_importados, qt_pacientes_criados, dry_run
       FROM oci_carga_sisreg ORDER BY id DESC LIMIT 5`,
      [], SCHEMA
    );
    for (const r of cargas.rows) {
      console.log(`  id=${r.id} status=${r.st_status} importados=${r.qt_registros_importados} pac_criados=${r.qt_pacientes_criados} dry_run=${r.dry_run}`);
    }

    // 3. Registros pendentes na última carga real (não dry_run)
    const cargaReal = cargas.rows.find(c => c.dry_run === false && c.st_status === 1);
    if (cargaReal) {
      console.log(`\n=== Pendentes na carga real id=${cargaReal.id} ===`);
      const pendentes = await dbQuery(
        `SELECT id, no_cidadao, nu_cns_pac, nu_cpf_pac, co_paciente_vinculado, ds_erro
         FROM oci_dados_carga_sisreg 
         WHERE id_carga_sisreg = $1 AND (ds_erro ILIKE '%classific%' OR ds_erro ILIKE '%multipla%' OR ds_erro ILIKE '%múltipla%' OR ds_erro ILIKE '%pendente%')
         LIMIT 10`,
        [cargaReal.id], SCHEMA
      );
      console.log(`Encontrados: ${pendentes.rowCount}`);
      for (const r of pendentes.rows) {
        console.log(`  id=${r.id} nome=${r.no_cidadao} cns=${r.nu_cns_pac} cpf=${r.nu_cpf_pac} co_pac=${r.co_paciente_vinculado}`);
        console.log(`    erro: ${(r.ds_erro || '').substring(0, 120)}`);
      }

      // 4. Para cada pendente, verificar se CNS existe na oci_tb_paciente
      if (pendentes.rows.length > 0) {
        console.log('\n=== Verificando CNS/CPF dos pendentes na oci_tb_paciente ===');
        for (const r of pendentes.rows) {
          const cns = (r.nu_cns_pac || '').trim();
          const cpf = (r.nu_cpf_pac || '').trim();
          
          if (cns) {
            const found = await dbQuery(
              `SELECT co_paciente FROM oci_tb_paciente WHERE TRIM(nu_cns) = $1 LIMIT 1`,
              [cns], SCHEMA
            );
            console.log(`  CNS "${cns}" (${(r.no_cidadao || '').substring(0, 20)}): ${found.rowCount > 0 ? '✅ ENCONTRADO co_pac=' + found.rows[0].co_paciente : '❌ NÃO ENCONTRADO'}`);
          }
          if (cpf) {
            const found = await dbQuery(
              `SELECT co_paciente FROM oci_tb_paciente WHERE TRIM(nu_cpf) = $1 LIMIT 1`,
              [cpf], SCHEMA
            );
            console.log(`  CPF "${cpf}" (${(r.no_cidadao || '').substring(0, 20)}): ${found.rowCount > 0 ? '✅ ENCONTRADO co_pac=' + found.rows[0].co_paciente : '❌ NÃO ENCONTRADO'}`);
          }
          if (!cns && !cpf) {
            console.log(`  ${(r.no_cidadao || '').substring(0, 20)}: SEM CNS E SEM CPF`);
          }
        }
      }
    } else {
      console.log('\n⚠️ Nenhuma carga real (não dry_run) com status=1 encontrada');
      
      // Verificar se há alguma carga
      if (cargas.rows.length > 0) {
        const lastId = cargas.rows[0].id;
        console.log(`\n=== Todos os registros da última carga id=${lastId} (primeiros 5) ===`);
        const todos = await dbQuery(
          `SELECT id, no_cidadao, nu_cns_pac, nu_cpf_pac, co_paciente_vinculado, st_status, ds_erro
           FROM oci_dados_carga_sisreg 
           WHERE id_carga_sisreg = $1
           ORDER BY id
           LIMIT 5`,
          [lastId], SCHEMA
        );
        for (const r of todos.rows) {
          console.log(`  id=${r.id} nome=${(r.no_cidadao||'').substring(0,25)} cns=${r.nu_cns_pac} cpf=${r.nu_cpf_pac} co_pac=${r.co_paciente_vinculado} status=${r.st_status}`);
          if (r.ds_erro) console.log(`    erro: ${r.ds_erro.substring(0, 100)}`);
        }
      }
    }

    // 5. Total de pacientes na oci_tb_paciente
    console.log('\n=== Total de pacientes na oci_tb_paciente ===');
    const totalPac = await dbQuery(
      `SELECT COUNT(*) as total FROM oci_tb_paciente`,
      [], SCHEMA
    );
    console.log(`Total: ${totalPac.rows[0].total}`);

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await closePool();
  }
}

main();
