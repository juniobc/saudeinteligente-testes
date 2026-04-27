import { dbQuery, closePool } from '../db-query.js';

async function main() {
  try {
    const r = await dbQuery(
      `SELECT id, cpf, username, nome, email, ativo, criado_em, alterado_em, hashed_password 
       FROM usuario WHERE cpf = $1`,
      ['47818111085'],
      'br_amapa'
    );
    console.log('Usuário Amapá:');
    console.log(JSON.stringify(r.rows[0], null, 2));

    // Verificar se existem outros usuários admin
    const admins = await dbQuery(
      `SELECT id, cpf, username, nome, email, ativo FROM usuario ORDER BY id LIMIT 10`,
      [],
      'br_amapa'
    );
    console.log('\nPrimeiros 10 usuários no Amapá:');
    admins.rows.forEach(u => console.log(`  id=${u.id} cpf=${u.cpf} user=${u.username} nome=${u.nome} ativo=${u.ativo}`));
  } finally {
    await closePool();
  }
}
main();
