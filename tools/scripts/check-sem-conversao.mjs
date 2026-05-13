// Verificar quem são os 5 pacientes "sem conversão"
import { dbQuery, closePool } from '../db-query.js';

const S = 'br_distrito_federal';

async function main() {
  try {
    // Buscar última carga
    const cargas = await dbQuery(`SELECT id FROM ${S}.oci_carga_sisreg ORDER BY id DESC LIMIT 1`);
    if (cargas.rowCount === 0) {
      console.log('Nenhuma carga encontrada');
      await closePool();
      return;
    }
    const lastId = cargas.rows[0].id;
    console.log(`Carga id=${lastId}\n`);

    // Contagem por status/erro
    console.log('=== Distribuição por ds_erro (agrupado por paciente) ===');
    const dist = await dbQuery(`
      SELECT ds_erro, COUNT(DISTINCT COALESCE(nu_cns_pac, nu_cpf_pac)) as pacientes, COUNT(*) as registros
      FROM ${S}.oci_dados_carga_sisreg
      WHERE id_carga_sisreg = $1
      GROUP BY ds_erro
      ORDER BY pacientes DESC
    `, [lastId]);
    for (const r of dist.rows) {
      console.log(`  "${r.ds_erro || 'NULL (sucesso)'}": ${r.pacientes} pacientes, ${r.registros} registros`);
    }

    // Pacientes que NÃO foram convertidos (co_oci_importada IS NULL) e NÃO são óbito e NÃO são pendente
    console.log('\n=== Pacientes sem conversão (não convertidos, não óbito, não pendente) ===');
    const semConversao = await dbQuery(`
      SELECT DISTINCT nu_cns_pac, nu_cpf_pac, no_cidadao, ds_erro
      FROM ${S}.oci_dados_carga_sisreg
      WHERE id_carga_sisreg = $1
        AND co_oci_importada IS NULL
        AND (ds_erro NOT ILIKE '%obito%' OR ds_erro IS NULL)
        AND (ds_erro NOT ILIKE '%classific%' OR ds_erro IS NULL)
        AND (ds_erro NOT ILIKE '%multipla%' OR ds_erro IS NULL)
        AND (ds_erro NOT ILIKE '%duplicad%' OR ds_erro IS NULL)
      GROUP BY nu_cns_pac, nu_cpf_pac, no_cidadao, ds_erro
    `, [lastId]);
    console.log(`Total: ${semConversao.rowCount}`);
    for (const r of semConversao.rows) {
      console.log(`  ${(r.no_cidadao||'').substring(0,30)} | CNS=${r.nu_cns_pac} | erro="${r.ds_erro || 'NULL'}"`);
    }

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await closePool();
  }
}

main();
