const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const envText = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const env = {};
envText.split(/\r?\n/).forEach(line => {
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
  const query = await db`
    SELECT 'user' as source, id, whatsappphone as phone
    FROM "User"
    WHERE whatsappphone IS NOT NULL
    UNION ALL
    SELECT 'patient' as source, id::text, phone
    FROM "Patient"
    WHERE phone IS NOT NULL
    ORDER BY source, phone
  `;
  console.log(JSON.stringify(query, null, 2));
  process.exit(0);
})();