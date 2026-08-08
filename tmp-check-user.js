const { neon } = require('@neondatabase/serverless');
const conn = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_M5PJnpdroe9L@ep-summer-moon-avf91ipg.c-11.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(conn);
(async () => {
  const rows = await sql`SELECT id, email, "isDisabled", "passwordResetRequestedAt" FROM "User" ORDER BY id DESC LIMIT 10`;
  console.log(JSON.stringify(rows, null, 2));
})();
