import { dbQuery, closePool } from './tools/db-query.js';

(async () => {
  try {
    console.log('✅ DADOS CONSOLIDADOS PARA TESTES\n');
    
    // Status das OCIs
    const ocis = await dbQuery(
      'SELECT st_fila, COUNT(*) as qty FROM oci_tb_fila_espera_oci GROUP BY st_fila ORDER BY st_fila',
      [],
      'br_amapa'
    );
    
    console.log('📊 OCIs EXISTENTES POR STATUS:');
    const statusNames = ['Aguard. Autorizacao', 'Aguard. Fase1', 'Agendada F1', 'Aguard. Fase2', 'Agendada F2', 'Aguard. Fase3', 'Agendada F3', 'Finalizada', 'Cancelada', 'Devolvida'];
    ocis.rows.forEach(row => console.log('  ' + statusNames[row.st_fila] + ' (status=' + row.st_fila + '): ' + row.qty + ' OCIs'));
    
    // Linhas de cuidado com procedimentos
    const linhas = await dbQuery(
      'SELECT * FROM oci_tb_linha_cuidado LIMIT 3',
      [],
      'br_amapa'
    );
    
    console.log('\n📋 PRIMEIRAS 3 LINHAS DE CUIDADO:');
    if (linhas.rows.length > 0) {
      console.log('  Colunas: ' + linhas.fields.join(', '));
      linhas.rows.forEach((row, idx) => {
        const keys = Object.keys(row).slice(0, 5);
        console.log('  ' + (idx+1) + '. ' + keys.map(k => k + '=' + row[k]).join(', '));
      });
    }
    
    console.log('\n✅ Base de dados consultada com sucesso');
    await closePool();
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
})();
