import { dbQuery } from '../db-query.js';
const r = await dbQuery(`SELECT NOW() AS agora, current_setting('TIMEZONE') AS tz;`, [], 'mg_vicosa');
console.log(r.rows);
process.exit(0);
