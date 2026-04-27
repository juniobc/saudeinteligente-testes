// Script de investigação — Verificar hash de senha e tenant
// Guardian — Agente de Testes E2E

import { dbQuery, closePool } from '../db-query.js';
import { createHash } from 'crypto';

async function verificar() {
  try {
    // 1. Encontrar a tabela de tenants (pode estar em outro schema)
    console.log('=== PROCURANDO TABELA DE TENANTS ===');
    const busca = await dbQuery(
      `SELECT table_schema, table_name FROM information_schema.tables 
       WHERE table_name = 'tenant' OR table_name = 'tenants' OR table_name = 'municipio' OR table_name = 'municipios'
       ORDER BY table_schema`,
      []
    );
    console.log('Tabelas encontradas:');
    busca.rows.forEach(r => console.log(`  ${r.table_schema}.${r.table_name}`));

    // 2. Verificar o hash — a senha é #12admin34$
    // O backend usa bcrypt (passlib com scheme bcrypt)
    // Vamos verificar se o hash do amapa é válido para a senha conhecida
    console.log('\n=== HASHES COMPLETOS ===');
    
    const hashAmapa = await dbQuery(
      `SELECT hashed_password FROM usuario WHERE cpf = '47818111085'`,
      [],
      'br_amapa'
    );
    const hashLuziania = await dbQuery(
      `SELECT hashed_password FROM usuario WHERE cpf = '47818111085'`,
      [],
      'go_luziania'
    );

    console.log(`Hash Amapá:   ${hashAmapa.rows[0]?.hashed_password}`);
    console.log(`Hash Luziânia: ${hashLuziania.rows[0]?.hashed_password}`);

    // 3. Verificar se o tenant br_amapa está ativo
    // Procurar no schema público ou no schema do microservicoAcesso
    if (busca.rowCount > 0) {
      const schemaT = busca.rows[0].table_schema;
      const nomeT = busca.rows[0].table_name;
      console.log(`\n=== TENANT br_amapa em ${schemaT}.${nomeT} ===`);
      const tenant = await dbQuery(
        `SELECT * FROM ${schemaT}.${nomeT} WHERE schema = 'br_amapa'`,
        []
      );
      if (tenant.rowCount > 0) {
        const t = tenant.rows[0];
        console.log('Tenant encontrado:');
        Object.entries(t).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
      } else {
        console.log('❌ Tenant br_amapa NÃO encontrado!');
        // Listar todos os tenants
        const todos = await dbQuery(`SELECT id, nome, schema, ativo FROM ${schemaT}.${nomeT} ORDER BY id`, []);
        console.log('\nTodos os tenants:');
        todos.rows.forEach(t => console.log(`  id=${t.id} schema=${t.schema} nome=${t.nome} ativo=${t.ativo}`));
      }
    }

  } catch (error) {
    console.error(`❌ ERRO: ${error.message}`);
  } finally {
    await closePool();
  }
}

verificar();
