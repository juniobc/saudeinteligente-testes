import { dbQuery, closePool } from './tools/db-query.js';
const schema = 'mg_vicosa';
async function main() {
  const r = await dbQuery(
    `SELECT o.ds_origem, f.st_fila, COUNT(*) as qtd
     FROM oci_tb_fila_espera_oci f
     JOIN oci_tb_origem_solicitacao o ON o.id = f.st_origem
     GROUP BY o.ds_origem, f.st_fila
     ORDER BY o.ds_origem, f.st_fila`,
    [], schema);
  console.log('=== Distribuição st_fila por origem (mg_vicosa) ===');
  console.table(r.rows);

  // Exemplo concreto: protocolos REGFACIL com st_fila=1 (default da tela Consulta e Cadastro)
  const r2 = await dbQuery(
    `SELECT f.nr_protocolo, p.no_pac, f.st_fila, f.dt_cadastro, f.ds_justificativa
     FROM oci_tb_fila_espera_oci f
     JOIN oci_tb_origem_solicitacao o ON o.id = f.st_origem
     LEFT JOIN oci_tb_paciente p ON p.co_paciente = f.co_pac
     WHERE o.ds_origem = 'REGFACIL' AND f.st_fila = 1
     LIMIT 5`,
    [], schema);
  console.log('=== Exemplos REGFACIL com st_fila=1 (apareceriam na tela padrão) ===');
  console.table(r2.rows);
  await closePool();
}
main().catch(e=>{console.error(e); process.exit(1);});
