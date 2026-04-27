import pg from 'pg';

const pool = new pg.Pool({
  host: '10.8.0.1', port: 5432, database: 'app_db_desv',
  user: 'guardian', password: 'K8#v2$mP9!zL5*qN',
  connectionTimeoutMillis: 10000,
});

try {
  const client = await pool.connect();

  // Estrutura da oci_tb_fila_espera_oci
  const cols = await client.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'br_amapa' AND table_name = 'oci_tb_fila_espera_oci' ORDER BY ordinal_position"
  );
  console.log('Colunas de oci_tb_fila_espera_oci:');
  cols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

  // Quantos registros ativos
  const count = await client.query(
    "SELECT st_fila, COUNT(*) as total FROM br_amapa.oci_tb_fila_espera_oci GROUP BY st_fila ORDER BY st_fila"
  );
  console.log('\nDistribuição por st_fila:');
  count.rows.forEach(r => console.log(`  st_fila=${r.st_fila}: ${r.total}`));

  // Amostra de 3 registros
  const sample = await client.query(
    "SELECT nr_protocolo, co_pac, id_especialidade, st_fila, co_procd_medc FROM br_amapa.oci_tb_fila_espera_oci LIMIT 3"
  );
  console.log('\nAmostra:');
  sample.rows.forEach(r => console.log(`  `, JSON.stringify(r)));

  // Verificar oci_tb_paciente
  const pacs = await client.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'br_amapa' AND table_name = 'oci_tb_paciente' AND column_name IN ('co_paciente', 'nu_cns', 'nu_cpf') ORDER BY ordinal_position"
  );
  console.log('\nColunas chave de oci_tb_paciente:');
  pacs.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

  client.release();
} catch(e) {
  console.error('ERRO:', e.message);
} finally {
  await pool.end();
}
