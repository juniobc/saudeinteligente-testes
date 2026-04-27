import pg from 'pg';

const pool = new pg.Pool({
  host: '10.8.0.1', port: 5432, database: 'app_db_desv',
  user: 'guardian', password: 'K8#v2$mP9!zL5*qN',
  connectionTimeoutMillis: 10000,
});

// CIDs de indicação por especialidade (extraídos da Matriz OCI oficial do Amapá)
// Usamos prefixo do CID (ex: "H00" bate com "H001", "H009", etc.)
const CID_PARA_ESPECIALIDADE = {
  // OFTALMOLOGIA (H00-H59, C69)
  "Oftalmologia": [
    "H00","H01","H02","H03","H04","H05","H06","H10","H11","H13",
    "H15","H16","H17","H18","H19","H20","H21","H22","H25","H26",
    "H27","H28","H30","H31","H32","H33","H34","H35","H36","H40",
    "H42","H43","H44","H45","H46","H47","H48","H49","H50","H51",
    "H52","H53","H54","H55","H57","H58","H59","C69"
  ],
  // OTORRINO (H60-H95, J30-J39)
  "Otorrino": [
    "H60","H61","H62","H65","H66","H67","H68","H69","H70","H71",
    "H72","H73","H74","H75","H80","H81","H82","H83","H90","H91",
    "H92","H93","H94","H95",
    "J30","J31","J32","J33","J34","J35","J36","J37","J38","J39"
  ],
  // ORTOPEDIA (M-series, Q65-Q78, S-series, T90-T93)
  "Ortopedia": [
    "M12","M15","M16","M17","M18","M19","M25","M42","M43","M53",
    "M65","M66","M67","M68","M70","M75","M86","M87","M91","M92",
    "M93","M94","M95","M96","M11","M22","M23","M24","M40",
    "Q65","Q66","Q67","Q77","Q78",
    "S43","S48","S53","S63","S83","S93",
    "T90","T91","T93",
    "D16","D48","C40","C41"
  ],
  // CARDIOLOGIA (I-series)
  "Cardiologia": [
    "I00","I01","I02","I05","I10","I11","I20","I21","I22","I23",
    "I24","I25","I26","I27","I28","I30","I31","I32","I33","I34",
    "I35","I36","I38","I40","I42","I44","I46","I48","I50","I51",
    "I60","I61","I62","I63","I64","I65","I66","I67","I69","I70",
    "I71","I72","I73","I74","I77","I78","I79","I80","I81","I82",
    "I83","I84","I85","I86","I87","I88","I89","I90","I91","I95",
    "I97","I99","Z13"
  ],
  // ONCOLOGIA
  "Oncologia": [
    "C50","D48","D24","N60","N61","N62","N63","N64",  // mama
    "C53","D06","N87","N88",                           // colo útero
    "C61","D29","N40","N41","N42",                     // próstata
    "C15","C16","K20","K21","K22","K25","K26","K27","K28","K29","K30","K31", // gástrico
    "C17","C18","C19","C20","C21","D12","D37","K62","K63", // colorretal
    "C69"  // oncologia oftalmológica (já coberto em oftalmo, mas CID específico)
  ],
  // GINECOLOGIA (não está na Matriz oficial mas está na planilha da Dra)
  "Ginecologia": [
    "N80","N81","N82","N83","N84","N85","N86","N87","N88","N89",
    "N90","N91","N92","N93","N94","N95","N96","N97","N98",
    "D25","D26","D27","D28"
  ],
};

try {
  const client = await pool.connect();

  const totalFila = parseInt((await client.query("SELECT COUNT(*) as t FROM br_amapa.fila_sisreg")).rows[0].t);

  // Construir CASE WHEN SQL para classificar por CID
  let caseWhen = "CASE\n";
  for (const [esp, cids] of Object.entries(CID_PARA_ESPECIALIDADE)) {
    const conditions = cids.map(c => `UPPER(TRIM(cod_cid)) LIKE '${c}%'`).join(' OR ');
    caseWhen += `  WHEN (${conditions}) THEN '${esp}'\n`;
  }
  caseWhen += "  ELSE 'Não classificado'\nEND";

  // 1. Classificar TODOS os registros (consultas + exames) por CID
  const porCID = await client.query(`
    SELECT 
      ${caseWhen} as especialidade,
      COUNT(*) as registros,
      COUNT(DISTINCT cns_usuario) as pacientes,
      COUNT(*) FILTER (WHERE TRIM(cod_sigtap) = '0301010072') as consultas,
      COUNT(*) FILTER (WHERE TRIM(cod_sigtap) != '0301010072') as exames
    FROM br_amapa.fila_sisreg
    WHERE cns_usuario != ''
    GROUP BY 1
    ORDER BY registros DESC
  `);

  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  RELATÓRIO v3: FILA SISREG vs MATRIZ OCI — COM CLASSIFICAÇÃO CID  ║');
  console.log('║  Cada registro classificado pela especialidade do CID              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  console.log('\n═══ CLASSIFICAÇÃO POR CID (todos os registros) ═══');
  let totalClassificado = 0;
  let totalNaoClass = 0;
  porCID.rows.forEach(r => {
    const reg = parseInt(r.registros);
    const pac = parseInt(r.pacientes);
    const cons = parseInt(r.consultas);
    const ex = parseInt(r.exames);
    const pct = (100 * reg / totalFila).toFixed(1);
    if (r.especialidade === 'Não classificado') {
      totalNaoClass = reg;
    } else {
      totalClassificado += reg;
    }
    console.log(`  ${r.especialidade}: ${reg.toLocaleString()} reg (${pct}%) | ${pac.toLocaleString()} pac | ${cons.toLocaleString()} consultas + ${ex.toLocaleString()} exames`);
  });

  console.log(`\n  TOTAL CLASSIFICADO POR CID: ${totalClassificado.toLocaleString()} (${(100*totalClassificado/totalFila).toFixed(1)}%)`);
  console.log(`  NÃO CLASSIFICADO:           ${totalNaoClass.toLocaleString()} (${(100*totalNaoClass/totalFila).toFixed(1)}%)`);

  // 2. Detalhe dos CIDs não classificados
  const cidsNaoClass = await client.query(`
    SELECT UPPER(TRIM(cod_cid)) as cid, desc_cid, COUNT(*) as reg
    FROM br_amapa.fila_sisreg
    WHERE ${caseWhen} = 'Não classificado'
      AND cod_cid IS NOT NULL AND cod_cid != ''
    GROUP BY UPPER(TRIM(cod_cid)), desc_cid
    ORDER BY reg DESC
    LIMIT 20
  `);
  console.log('\n═══ TOP 20 CIDs NÃO CLASSIFICADOS (oportunidade) ═══');
  cidsNaoClass.rows.forEach((r, i) => {
    console.log(`  ${i+1}. ${r.cid} - ${r.desc_cid}: ${parseInt(r.reg).toLocaleString()} reg`);
  });

  // 3. Resumo final
  console.log('\n═══ RESUMO PARA A DRA ANDRADE ═══');
  console.log(`  Total na fila SISREG:                    ${totalFila.toLocaleString()}`);
  console.log(`  Classificáveis em ciclo OCI (por CID):   ${totalClassificado.toLocaleString()} (${(100*totalClassificado/totalFila).toFixed(1)}%)`);
  console.log(`  Fora da Matriz OCI atual:                ${totalNaoClass.toLocaleString()} (${(100*totalNaoClass/totalFila).toFixed(1)}%)`);

  client.release();
} catch(e) {
  console.error('ERRO:', e.message);
}


// ============================================================
// PARTE 2: Pacientes com consulta + exame na mesma especialidade
// ============================================================

// Procedimentos específicos por especialidade (exames, sem consulta genérica)
const EXAMES_POR_ESP = {
  "Oftalmologia": ["0211060232","0211060127","0211060020","0211060259","0211060100","0211060178","0211060038","0211060224","0205020089","0417010060"],
  "Otorrino": ["0211070041","0211070203","0211070262","0209040041","0209040025"],
  "Ortopedia": ["0205020062"],
  "Cardiologia": ["0211020036","0205010032","0211020060","0205010016","0208010033","0208010025","0211020044","0204030153"],
  "Oncologia": ["0204030030","0205020097","0201010607","0203020065","0201010569","0201010585","0203010043","0211040029","0201010666","0203020081","0409060089","0409060305","0203020022","0205020119","0201010410","0209010037","0209010029","0203020030"],
  "Ginecologia": ["0205020186","0205020160","0207030022"],
};

async function analisarCiclosCompletos(client) {
  console.log('\n\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  PARTE 2: PACIENTES COM CICLO OCI COMPLETO (CONSULTA + EXAME)     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  // Pacientes que têm consulta médica (0301010072)
  const pacComConsulta = await client.query(`
    SELECT DISTINCT cns_usuario FROM br_amapa.fila_sisreg 
    WHERE TRIM(cod_sigtap) = '0301010072' AND cns_usuario != ''
  `);
  const cnsConsulta = new Set(pacComConsulta.rows.map(r => r.cns_usuario));
  console.log(`\nPacientes com consulta médica na fila: ${cnsConsulta.size.toLocaleString()}`);

  for (const [esp, exames] of Object.entries(EXAMES_POR_ESP)) {
    if (exames.length === 0) continue;
    const ph = exames.map((_, i) => `$${i+1}`).join(',');

    // Pacientes que têm exame dessa especialidade
    const pacComExame = await client.query(`
      SELECT DISTINCT cns_usuario FROM br_amapa.fila_sisreg 
      WHERE TRIM(cod_sigtap) IN (${ph}) AND cns_usuario != ''
    `, exames);

    const cnsExame = new Set(pacComExame.rows.map(r => r.cns_usuario));

    // Interseção: têm consulta E exame
    let comAmbos = 0;
    for (const cns of cnsExame) {
      if (cnsConsulta.has(cns)) comAmbos++;
    }
    const soExame = cnsExame.size - comAmbos;

    // Detalhe dos exames
    const detalheExames = await client.query(`
      SELECT TRIM(cod_sigtap) as cod, desc_sigtap, 
             COUNT(*) as reg, COUNT(DISTINCT cns_usuario) as pac
      FROM br_amapa.fila_sisreg
      WHERE TRIM(cod_sigtap) IN (${ph}) AND cns_usuario != ''
      GROUP BY TRIM(cod_sigtap), desc_sigtap
      ORDER BY reg DESC
    `, exames);

    console.log(`\n  ▸ ${esp.toUpperCase()}`);
    console.log(`    Pacientes com exame dessa especialidade: ${cnsExame.size.toLocaleString()}`);
    console.log(`    Com CONSULTA + EXAME (ciclo completo):   ${comAmbos.toLocaleString()} (${cnsExame.size > 0 ? (100*comAmbos/cnsExame.size).toFixed(1) : 0}%)`);
    console.log(`    Só exame (sem consulta na fila):         ${soExame.toLocaleString()}`);
    detalheExames.rows.forEach(r => {
      console.log(`      ${r.cod} - ${r.desc_sigtap}: ${parseInt(r.reg).toLocaleString()} reg, ${parseInt(r.pac).toLocaleString()} pac`);
    });
  }

  // Resumo geral de ciclos completos
  console.log('\n═══ RESUMO CICLOS COMPLETOS ═══');
  let totalCiclos = 0;
  for (const [esp, exames] of Object.entries(EXAMES_POR_ESP)) {
    if (exames.length === 0) continue;
    const ph = exames.map((_, i) => `$${i+1}`).join(',');
    const res = await client.query(`
      SELECT COUNT(DISTINCT f1.cns_usuario) as pac
      FROM br_amapa.fila_sisreg f1
      WHERE TRIM(f1.cod_sigtap) IN (${ph})
        AND f1.cns_usuario != ''
        AND EXISTS (
          SELECT 1 FROM br_amapa.fila_sisreg f2 
          WHERE f2.cns_usuario = f1.cns_usuario 
            AND TRIM(f2.cod_sigtap) = '0301010072'
        )
    `, exames);
    const pac = parseInt(res.rows[0].pac);
    totalCiclos += pac;
    console.log(`  ${esp}: ${pac.toLocaleString()} pacientes com ciclo completo`);
  }
  console.log(`  TOTAL (pode ter sobreposição entre especialidades): ${totalCiclos.toLocaleString()}`);
}

// Executar parte 2
const client2 = await pool.connect();
await analisarCiclosCompletos(client2);
client2.release();
await pool.end();
