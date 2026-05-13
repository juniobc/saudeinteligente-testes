// Verificar pacientes pendentes — usando schema qualificado
import { dbQuery, closePool } from '../db-query.js';

const S = 'br_distrito_federal';

async function main() {
  try {
    // 1. Buscar DANIELA na oci_tb_paciente
    console.log('=== Buscando DANIELA na oci_tb_paciente ===');
    const pac = await dbQuery(
      `SELECT co_paciente, no_pac, nu_cns, nu_cpf 
       FROM ${S}.oci_tb_paciente 
       WHERE UPPER(no_pac) LIKE '%DANIELA%GOMES%'
       LIMIT 5`
    );
    console.log(`Encontrados: ${pac.rowCount}`);
    for (const r of pac.rows) {
      console.log(`  co_paciente=${r.co_paciente} nome=${r.no_pac} cns=${r.nu_cns} cpf=${r.nu_cpf}`);
    }

    // 2. Últimas cargas
    console.log('\n=== Últimas cargas ===');
    const cargas = await dbQuery(
      `SELECT id, dt_hr_inicio_carga, st_status, qt_registros_importados, qt_pacientes_criados, dry_run
       FROM ${S}.oci_carga_sisreg ORDER BY id DESC LIMIT 5`
    );
    for (const r of cargas.rows) {
      console.log(`  id=${r.id} status=${r.st_status} importados=${r.qt_registros_importados} pac_criados=${r.qt_pacientes_criados} dry_run=${r.dry_run}`);
    }

    // 3. Registros pendentes na última carga real
    const cargaReal = cargas.rows.find(c => c.dry_run === false && c.st_status === 1);
    const targetCarga = cargaReal || cargas.rows[0];
    
    if (targetCarga) {
      console.log(`\n=== Pendentes na carga id=${targetCarga.id} (dry_run=${targetCarga.dry_run}) ===`);
      const pendentes = await dbQuery(
        `SELECT id, no_cidadao, nu_cns_pac, nu_cpf_pac, co_paciente_vinculado, ds_erro
         FROM ${S}.oci_dados_carga_sisreg 
         WHERE id_carga_sisreg = $1 
         AND (ds_erro ILIKE '%classific%' OR ds_erro ILIKE '%multipla%' OR ds_erro ILIKE '%múltipla%' OR ds_erro ILIKE '%pendente%' OR ds_erro ILIKE '%ambig%')
         LIMIT 10`,
        [targetCarga.id]
      );
      console.log(`Encontrados: ${pendentes.rowCount}`);
      for (const r of pendentes.rows) {
        console.log(`  id=${r.id} nome=${(r.no_cidadao||'').substring(0,30)} cns=${r.nu_cns_pac} cpf=${r.nu_cpf_pac} co_pac_vinculado=${r.co_paciente_vinculado}`);
        console.log(`    erro: ${(r.ds_erro || '').substring(0, 150)}`);
      }

      // 4. Verificar se CNS/CPF dos pendentes existem na oci_tb_paciente
      if (pendentes.rows.length > 0) {
        console.log('\n=== Verificando CNS/CPF na oci_tb_paciente ===');
        for (const r of pendentes.rows) {
          const cns = (r.nu_cns_pac || '').trim();
          const cpf = (r.nu_cpf_pac || '').trim();
          
          if (cns) {
            const found = await dbQuery(
              `SELECT co_paciente FROM ${S}.oci_tb_paciente WHERE TRIM(nu_cns) = $1 LIMIT 1`,
              [cns]
            );
            console.log(`  CNS "${cns}" (${(r.no_cidadao||'').substring(0,20)}): ${found.rowCount > 0 ? '✅ co_pac=' + found.rows[0].co_paciente : '❌ NÃO ENCONTRADO'}`);
          }
          if (cpf) {
            const found = await dbQuery(
              `SELECT co_paciente FROM ${S}.oci_tb_paciente WHERE TRIM(nu_cpf) = $1 LIMIT 1`,
              [cpf]
            );
            console.log(`  CPF "${cpf}" (${(r.no_cidadao||'').substring(0,20)}): ${found.rowCount > 0 ? '✅ co_pac=' + found.rows[0].co_paciente : '❌ NÃO ENCONTRADO'}`);
          }
          if (!cns && !cpf) {
            console.log(`  ${(r.no_cidadao||'').substring(0,20)}: SEM CNS E SEM CPF`);
          }
        }
      } else {
        // Tentar buscar com outro padrão de erro
        console.log('\n=== Buscando com padrão alternativo (co_paciente_vinculado IS NULL) ===');
        const semVinculo = await dbQuery(
          `SELECT id, no_cidadao, nu_cns_pac, nu_cpf_pac, co_paciente_vinculado, st_status, ds_erro
           FROM ${S}.oci_dados_carga_sisreg 
           WHERE id_carga_sisreg = $1 AND co_paciente_vinculado IS NULL
           LIMIT 10`,
          [targetCarga.id]
        );
        console.log(`Sem vínculo: ${semVinculo.rowCount}`);
        for (const r of semVinculo.rows) {
          console.log(`  id=${r.id} nome=${(r.no_cidadao||'').substring(0,30)} cns=${r.nu_cns_pac} cpf=${r.nu_cpf_pac} status=${r.st_status}`);
          if (r.ds_erro) console.log(`    erro: ${(r.ds_erro||'').substring(0, 120)}`);
        }
      }
    }

    // 5. Total pacientes
    console.log('\n=== Total pacientes na oci_tb_paciente ===');
    const total = await dbQuery(`SELECT COUNT(*) as total FROM ${S}.oci_tb_paciente`);
    console.log(`Total: ${total.rows[0].total}`);

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await closePool();
  }
}

main();
