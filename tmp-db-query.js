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
  const users = await db`SELECT id,email,name,role,"isDisabled","whatsappPhone","whatsappBusinessAccountId","whatsappPhoneNumberId","whatsappConnectedAt" FROM "User" ORDER BY id DESC LIMIT 20`;
  const patients = await db`SELECT id,name,phone,metadata,"userId" FROM "Patient" WHERE phone IS NOT NULL ORDER BY id DESC LIMIT 20`;
  const appointments = await db`SELECT id,"patientId",status,"scheduledAt","reminderStatus","reminderSentAt",metadata FROM "Appointment" WHERE status='SCHEDULED' ORDER BY "scheduledAt" DESC LIMIT 20`;
  console.log(JSON.stringify({users,patients,appointments},null,2));
  process.exit(0);
})();
