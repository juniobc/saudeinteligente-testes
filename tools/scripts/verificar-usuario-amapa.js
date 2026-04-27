// Script de investigação — Verificar usuário no tenant br_amapa
// Guardian — Agente de Testes E2E

import { dbQuery, listTables, describeTable, closePool } from '../db-query.js';

async function verificar() {
  const SCHEMA = 'br_amapa';
  const CPF_USUARIO = '47818111085';

  try {
    // 1. Verificar se o schema br_amapa existe
    console.log(`\n=== VERIFICANDO SCHEMA ${SCHEMA} ===`);
    const schemas = await dbQuery(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
      [SCHEMA]
    );
    if (schemas.rowCount === 0) {
      console.log(`❌ Schema "${SCHEMA}" NÃO EXISTE no banco!`);
      await closePool();
      return;
    }
    console.log(`✅ Schema "${SCHEMA}" existe.`);

    // 2. Verificar se existe tabela de usuários no schema
    console.log(`\n=== TABELAS NO SCHEMA ${SCHEMA} ===`);
    const tabelas = await listTables(SCHEMA);
    const tabelasUsuario = tabelas.filter(t => t.includes('usuario') || t.includes('user'));
    console.log(`Total de tabelas: ${tabelas.length}`);
    console.log(`Tabelas com "usuario" ou "user": ${JSON.stringify(tabelasUsuario)}`);

    if (tabelasUsuario.length === 0) {
      console.log('⚠️ Nenhuma tabela de usuário encontrada. Listando todas:');
      console.log(tabelas.join(', '));
      await closePool();
      return;
    }

    // 3. Descrever a tabela de usuários (usar "usuario" que é a tabela principal do microservicoAcesso)
    const tabelaAlvo = 'usuario';
    console.log(`\n=== ESTRUTURA DA TABELA ${tabelaAlvo} ===`);
    const colunas = await describeTable(tabelaAlvo, SCHEMA);
    colunas.forEach(c => console.log(`  ${c.column_name} (${c.data_type}) ${c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`));

    // 4. Buscar o usuário pelo CPF
    console.log(`\n=== BUSCANDO USUÁRIO CPF=${CPF_USUARIO} ===`);
    const usuario = await dbQuery(
      `SELECT * FROM ${tabelaAlvo} WHERE cpf = $1`,
      [CPF_USUARIO],
      SCHEMA
    );

    if (usuario.rowCount === 0) {
      console.log(`❌ Usuário com CPF ${CPF_USUARIO} NÃO ENCONTRADO no schema ${SCHEMA}!`);

      // Verificar quantos usuários existem
      const total = await dbQuery(`SELECT COUNT(*) as total FROM ${tabelaAlvo}`, [], SCHEMA);
      console.log(`Total de usuários no schema: ${total.rows[0].total}`);

      // Listar alguns usuários para referência (sem expor dados sensíveis)
      const amostra = await dbQuery(
        `SELECT id, cpf, username, nome, email FROM ${tabelaAlvo} LIMIT 5`,
        [],
        SCHEMA
      );
      console.log('\nAmostra de usuários existentes:');
      amostra.rows.forEach(u => console.log(`  id=${u.id} cpf=${u.cpf} username=${u.username} nome=${u.nome}`));
    } else {
      const user = usuario.rows[0];
      console.log(`✅ Usuário ENCONTRADO!`);
      console.log(`  id: ${user.id}`);
      console.log(`  cpf: ${user.cpf}`);
      console.log(`  username: ${user.username}`);
      console.log(`  nome: ${user.nome}`);
      console.log(`  email: ${user.email}`);
      console.log(`  hashed_password: ${user.hashed_password ? user.hashed_password.substring(0, 20) + '...' : 'NULL/VAZIO'}`);
      console.log(`  ativo: ${user.ativo !== undefined ? user.ativo : 'campo não existe'}`);
    }

    // 5. Comparar com o schema go_luziania (onde funciona)
    console.log(`\n=== COMPARANDO COM go_luziania ===`);
    const userLuziania = await dbQuery(
      `SELECT id, cpf, username, nome, hashed_password FROM usuario WHERE cpf = $1`,
      [CPF_USUARIO],
      'go_luziania'
    );
    if (userLuziania.rowCount > 0) {
      const ul = userLuziania.rows[0];
      console.log(`✅ Usuário existe em go_luziania: id=${ul.id} cpf=${ul.cpf} nome=${ul.nome}`);
      console.log(`  hashed_password (luziania): ${ul.hashed_password ? ul.hashed_password.substring(0, 20) + '...' : 'NULL'}`);

      if (usuario.rowCount > 0) {
        const ua = usuario.rows[0];
        const senhasIguais = ul.hashed_password === ua.hashed_password;
        console.log(`  hashed_password (amapa):    ${ua.hashed_password ? ua.hashed_password.substring(0, 20) + '...' : 'NULL'}`);
        console.log(`  Hashes iguais? ${senhasIguais ? '✅ SIM' : '❌ NÃO'}`);
      }
    } else {
      console.log(`⚠️ Usuário NÃO encontrado em go_luziania (estranho, deveria existir)`);
    }

    // 6. Verificar tenant na tabela de tenants
    console.log(`\n=== VERIFICANDO TENANT br_amapa NA TABELA DE TENANTS ===`);
    const tenant = await dbQuery(
      `SELECT id, nome, schema, host, ativo FROM tenant WHERE schema = $1`,
      [SCHEMA],
      'public'
    );
    if (tenant.rowCount > 0) {
      const t = tenant.rows[0];
      console.log(`✅ Tenant encontrado: id=${t.id} nome=${t.nome} schema=${t.schema} host=${t.host} ativo=${t.ativo}`);
    } else {
      console.log(`❌ Tenant "${SCHEMA}" NÃO encontrado na tabela de tenants!`);
    }

  } catch (error) {
    console.error(`\n❌ ERRO: ${error.message}`);
    if (error.message.includes('does not exist')) {
      console.log('Possível causa: tabela ou schema não existe no banco.');
    }
  } finally {
    await closePool();
  }
}

verificar();
