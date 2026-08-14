const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const envText = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const env = {};
envText.split(/\r?\n/).forEach((line) => {
  const m = line.match(/^([^=#]+)=(.*)$/);
  if (m) {
    env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
  }
});

if (!env.DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const db = neon(env.DATABASE_URL);
(async () => {
  const rows = await db`
    SELECT DISTINCT phone
    FROM "Patient"
    WHERE phone IS NOT NULL
    ORDER BY phone
    LIMIT 200
  `;
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
})();