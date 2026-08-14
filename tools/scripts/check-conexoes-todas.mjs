import { dbQuery } from '../db-query.js';

async function main() {
  const r = await dbQuery(
    `SELECT pid, state, wait_event_type, wait_event, backend_start,
            now() - backend_start AS idade, now() - state_change AS tempo_no_estado,
            left(query, 200) AS query
     FROM pg_stat_activity
     WHERE datname = current_database() AND pid != pg_backend_pid()
     ORDER BY backend_start;`,
    [], 'mg_vicosa'
  );
  console.log(JSON.stringify(r.rows, null, 2));

  const locks = await dbQuery(
    `SELECT locktype, relation::regclass AS tabela, mode, granted, pid
     FROM pg_locks
     WHERE relation IS NOT NULL
     ORDER BY relation;`,
    [], 'mg_vicosa'
  );
  console.log('\n--- LOCKS ---');
  console.log(JSON.stringify(locks.rows, null, 2));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
