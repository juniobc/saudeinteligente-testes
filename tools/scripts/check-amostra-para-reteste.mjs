import { dbQuery } from '../db-query.js';

const SCHEMA = 'mg_vicosa';

async function main() {
  // Pega 300 protocolos processados com secundarios (grupos "normais", nao triviais)
  const r = await dbQuery(
    `SELECT DISTINCT f.nr_protocolo, f.identificador_oci
     FROM oci_tb_fila_espera_oci f
     WHERE f.st_origem = (SELECT id FROM oci_tb_origem_solicitacao WHERE ds_origem = 'REGFACIL')
     ORDER BY f.nr_protocolo
     LIMIT 300;`,
    [], SCHEMA
  );
  console.log(r.rows.map(x => x.identificador_oci.split(':')[1]).join(','));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
