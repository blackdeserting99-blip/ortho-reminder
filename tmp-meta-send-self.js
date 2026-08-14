const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const envText = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const env = envText.split(/\r?\n/).reduce((acc, line) => {
  const m = line.match(/^([^=#]+)=(.*)$/);
  if (m) acc[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
  return acc;
}, {});

const apiVersion = (env.META_GRAPH_API_VERSION || 'v23.0').trim();
const token = env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;

if (!token || !phoneNumberId) {
  console.error('Missing token or phone number id');
  process.exit(1);
}

async function main() {
  const detailsUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`;
  console.log('Details URL:', detailsUrl);
  const detailsRes = await fetch(detailsUrl, { headers: { Authorization: `Bearer ${token}` } });
  console.log('Details status', detailsRes.status);
  console.log(await detailsRes.text());

  const sendUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  console.log('\nSend URL:', sendUrl);
  const payload = {
    messaging_product: 'whatsapp',
    to: '+15556614570',
    type: 'text',
    text: {
      preview_url: false,
      body: 'Self-send test from local env',
    },
  };
  console.log('Payload', JSON.stringify(payload, null, 2));
  const sendRes = await fetch(sendUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  console.log('Send status', sendRes.status);
  console.log(await sendRes.text());
}

main().catch((err) => { console.error(err); process.exit(1); });