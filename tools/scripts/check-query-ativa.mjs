import { dbQuery } from '../db-query.js';

async function main() {
  const r = await dbQuery(
    `SELECT pid, now() - query_start AS duracao, state, wait_event_type, wait_event,
            left(query, 400) AS query
     FROM pg_stat_activity
     WHERE datname = current_database()
       AND state != 'idle'
       AND pid != pg_backend_pid()
     ORDER BY duracao DESC;`,
    [], 'mg_vicosa'
  );
  console.log(JSON.stringify(r.rows, null, 2));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
