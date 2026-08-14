import { dbQuery } from '../db-query.js';

const SCHEMA = 'mg_vicosa';

async function main() {
  const carga = await dbQuery(
    `SELECT id, dt_hr_inicio_carga, dt_hr_fim_carga, st_status,
            qt_registros_extraidos, qt_recursos_fhir, qt_pacientes_criados,
            qt_ocis_criadas, qt_ocis_atualizadas, qt_registros_erro
     FROM oci_integracao_carga WHERE no_sistema='REGFACIL' ORDER BY id DESC LIMIT 1;`,
    [], SCHEMA
  );
  console.log('--- Carga final ---');
  console.log(carga.rows);

  const cnesVazio = await dbQuery(
    `SELECT COUNT(*) AS qt FROM oci_tb_fila_espera_oci WHERE co_cnes_solicitante = '';`,
    [], SCHEMA
  );
  console.log('\n--- OCIs com CNES solicitante vazio (deveria ser 0 com o gate ativo) ---');
  console.log(cnesVazio.rows);

  const errosPendentes = await dbQuery(
    `SELECT ds_erro_processamento, COUNT(*) AS qt
     FROM oci_fhir_recurso WHERE st_processamento = 2
     GROUP BY ds_erro_processamento ORDER BY qt DESC;`,
    [], SCHEMA
  );
  console.log('\n--- Erros pendentes por motivo ---');
  console.log(errosPendentes.rows);

  const totalOcis = await dbQuery(
    `SELECT COUNT(*) AS qt FROM oci_tb_fila_espera_oci;`,
    [], SCHEMA
  );
  console.log('\n--- Total de OCIs na fila ---');
  console.log(totalOcis.rows);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
