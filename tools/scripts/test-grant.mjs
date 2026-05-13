import pg from 'pg';

const client = new pg.Client({
  host: '10.8.0.1',
  port: 5432,
  database: 'app_db_desv',
  user: 'guardian',
  password: 'K8#v2$mP9!zL5*qN'
});

await client.connect();
console.log('Conectado!');

const r1 = await client.query('SELECT current_user, session_user');
console.log('User:', r1.rows[0]);

const r2 = await client.query("SELECT has_schema_privilege('guardian', 'br_distrito_federal', 'USAGE') as has_usage");
console.log('Has USAGE on br_distrito_federal:', r2.rows[0].has_usage);

try {
  const r3 = await client.query('SELECT COUNT(*) as total FROM br_distrito_federal.oci_tb_paciente');
  console.log('Total pacientes:', r3.rows[0].total);
} catch (e) {
  console.log('Erro ao consultar oci_tb_paciente:', e.message);
}

await client.end();
