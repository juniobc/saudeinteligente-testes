import { dbQuery, closePool } from '../db-query.js';

async function verificar() {
  const SCHEMA = 'mg_vicosa';
  try {
    const cpfs = await dbQuery(
      `SELECT id, cpf, username, nome, email FROM usuario WHERE cpf IN ($1, $2) OR username LIKE $3`,
      ['11144477735', '52998224725', 'teste.e2e.claude%'],
      SCHEMA
    );
    console.log('Conflitos encontrados:', cpfs.rowCount);
    cpfs.rows.forEach(u => console.log(u));

    const total = await dbQuery(`SELECT COUNT(*) as total FROM usuario`, [], SCHEMA);
    console.log('Total usuarios em mg_vicosa:', total.rows[0].total);
  } catch (e) {
    console.error('ERRO:', e.message);
  } finally {
    await closePool();
  }
}

verificar();
