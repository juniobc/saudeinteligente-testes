import { dbQuery } from '../db-query.js';

const SCHEMA = 'mg_vicosa';

async function main() {
  const config = await dbQuery(
    `SELECT no_sistema, tp_protocolo, st_ativo, dt_atualizacao FROM oci_integracao_config ORDER BY no_sistema;`,
    [], SCHEMA
  );
  console.log('--- Configs ---');
  console.log(config.rows);

  const ultima = await dbQuery(
    `SELECT id, no_sistema, dt_hr_inicio_carga, dt_hr_fim_carga, st_status,
            qt_chamadas, qt_registros_extraidos, qt_registros_importados, qt_recursos_fhir,
            qt_pacientes_criados, qt_ocis_criadas, qt_ocis_atualizadas,
            qt_registros_erro, tp_disparo, ds_erro, no_fase_atual, qt_total_estimado
     FROM oci_integracao_carga
     WHERE no_sistema = 'REGFACIL'
     ORDER BY id DESC LIMIT 1;`,
    [], SCHEMA
  );
  console.log('\n--- Última carga REGFACIL ---');
  console.log(JSON.stringify(ultima.rows, null, 2));

  if (ultima.rows.length === 0) {
    console.log('Nenhuma carga encontrada.');
    process.exit(0);
  }

  const idCarga = ultima.rows[0].id;

  const totalErros = await dbQuery(
    `SELECT COUNT(*) AS qt FROM oci_fhir_recurso WHERE id_carga = $1 AND st_processamento = 2;`,
    [idCarga], SCHEMA
  );
  console.log(`\n--- Total de erros nessa carga #${idCarga}: ${totalErros.rows[0].qt} ---`);

  const agrupado = await dbQuery(
    `SELECT ds_erro_processamento, COUNT(*) AS qt
     FROM oci_fhir_recurso
     WHERE id_carga = $1 AND st_processamento = 2
     GROUP BY ds_erro_processamento
     ORDER BY qt DESC;`,
    [idCarga], SCHEMA
  );
  console.log('\n--- Erros agrupados por motivo ---');
  console.log(JSON.stringify(agrupado.rows, null, 2));

  const erros = await dbQuery(
    `SELECT tp_recurso, id_recurso, id_externo, no_sistema_origem,
            ds_erro_processamento, dt_processamento
     FROM oci_fhir_recurso
     WHERE id_carga = $1 AND st_processamento = 2
     ORDER BY dt_processamento DESC NULLS LAST
     LIMIT 50;`,
    [idCarga], SCHEMA
  );
  console.log(`\n--- Amostra de até 50 erros individuais ---`);
  console.log(JSON.stringify(erros.rows, null, 2));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
