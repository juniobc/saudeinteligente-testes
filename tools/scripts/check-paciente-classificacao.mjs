// Verificar se pacientes pendentes de classificação existem na oci_tb_paciente
import { dbQuery, closePool } from '../db-query.js';

const SCHEMA = 'br_distrito_federal';

async function main() {
  try {
    // 1. Buscar paciente DANIELA GOMES SOUZA na oci_tb_paciente
    console.log('=== Buscando DANIELA GOMES SOUZA na oci_tb_paciente ===');
    const pac = await dbQuery(
      `SELECT co_paciente, no_pac, nu_cns, nu_cpf 
       FROM ${SCHEMA}.oci_tb_paciente 
       WHERE UPPER(no_pac) LIKE '%DANIELA%GOMES%SOUZA%'
       LIMIT 5`
    );
    console.log(`Encontrados: ${pac.rowCount}`);
    for (const r of pac.rows) {
      console.log(`  co_paciente=${r.co_paciente} nome=${r.no_pac} cns=${r.nu_cns} cpf=${r.nu_cpf}`);
    }

    // 2. Verificar dados na oci_dados_carga_sisreg (última carga)
    console.log('\n=== Última carga no oci_carga_sisreg ===');
    const ultimaCarga = await dbQuery(
      `SELECT id, dt_hr_inicio_carga, st_status, qt_registros_importados, qt_pacientes_criados
       FROM ${SCHEMA}.oci_carga_sisreg 
       ORDER BY id DESC LIMIT 3`
    );
    for (const r of ultimaCarga.rows) {
      console.log(`  id=${r.id} status=${r.st_status} importados=${r.qt_registros_importados} pac_criados=${r.qt_pacientes_criados} dt=${r.dt_hr_inicio_carga}`);
    }

    // 3. Buscar registros pendentes na última carga
    if (ultimaCarga.rows.length > 0) {
      const lastId = ultimaCarga.rows[0].id;
      console.log(`\n=== Registros pendentes na carga ${lastId} (ds_erro LIKE '%classific%') ===`);
      const pendentes = await dbQuery(
        `SELECT id, no_cidadao, nu_cns_pac, nu_cpf_pac, co_paciente_vinculado, ds_erro
         FROM ${SCHEMA}.oci_dados_carga_sisreg 
         WHERE id_carga_sisreg = ${lastId} AND (ds_erro ILIKE '%classific%' OR ds_erro ILIKE '%multipla%' OR ds_erro ILIKE '%múltipla%')
         LIMIT 10`
      );
      console.log(`Encontrados: ${pendentes.rowCount}`);
      for (const r of pendentes.rows) {
        console.log(`  id=${r.id} nome=${r.no_cidadao} cns=${r.nu_cns_pac} cpf=${r.nu_cpf_pac} co_pac_vinculado=${r.co_paciente_vinculado}`);
        console.log(`    ds_erro: ${(r.ds_erro || '').substring(0, 100)}`);
      }

      // 4. Para cada pendente, verificar se co_paciente_vinculado existe na oci_tb_paciente
      if (pendentes.rows.length > 0) {
        console.log('\n=== Verificando se co_paciente_vinculado existe na oci_tb_paciente ===');
        for (const r of pendentes.rows) {
          if (r.co_paciente_vinculado) {
            const exists = await dbQuery(
              `SELECT co_paciente, nu_cns, nu_cpf FROM ${SCHEMA}.oci_tb_paciente WHERE co_paciente = ${r.co_paciente_vinculado}`
            );
            console.log(`  co_pac=${r.co_paciente_vinculado}: ${exists.rowCount > 0 ? 'EXISTE' : 'NÃO EXISTE'} ${exists.rows[0] ? `(cns=${exists.rows[0].nu_cns}, cpf=${exists.rows[0].nu_cpf})` : ''}`);
          } else {
            console.log(`  ${r.no_cidadao}: co_paciente_vinculado é NULL — paciente NÃO foi criado!`);
          }
        }
      }

      // 5. Verificar CNS dos pendentes diretamente na oci_tb_paciente
      if (pendentes.rows.length > 0) {
        console.log('\n=== Buscando CNS dos pendentes na oci_tb_paciente ===');
        for (const r of pendentes.rows) {
          const cns = (r.nu_cns_pac || '').trim();
          const cpf = (r.nu_cpf_pac || '').trim();
          if (cns) {
            const found = await dbQuery(
              `SELECT co_paciente FROM ${SCHEMA}.oci_tb_paciente WHERE nu_cns = '${cns}' LIMIT 1`
            );
            console.log(`  CNS ${cns} (${r.no_cidadao}): ${found.rowCount > 0 ? 'ENCONTRADO co_pac=' + found.rows[0].co_paciente : 'NÃO ENCONTRADO'}`);
          } else if (cpf) {
            const found = await dbQuery(
              `SELECT co_paciente FROM ${SCHEMA}.oci_tb_paciente WHERE nu_cpf = '${cpf}' LIMIT 1`
            );
            console.log(`  CPF ${cpf} (${r.no_cidadao}): ${found.rowCount > 0 ? 'ENCONTRADO co_pac=' + found.rows[0].co_paciente : 'NÃO ENCONTRADO'}`);
          } else {
            console.log(`  ${r.no_cidadao}: SEM CNS E SEM CPF`);
          }
        }
      }
    }

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await closePool();
  }
}

main();
