const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const envText = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const env = envText.split(/\r?\n/).reduce((acc, line) => {
  const m = line.match(/^([^=#]+)=(.*)$/);
  if (m) acc[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
  return acc;
}, {});
const token = env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
const apiVersion = (env.META_GRAPH_API_VERSION || 'v23.0').trim();

if (!token || !phoneNumberId) {
  console.error('Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID');
  process.exit(1);
}

const candidates = [
  '+15556614570',
  '+9647738361523',
  '+9647807576657',
  '+9647751533282',
  '+9647760033397',
  '+9647701234567',
  '+9647714957505',
  '+9647751533282',
  '+9647739566405',
  '+9998079019',
  '+9998090165',
  '+9647506392464',
];

async function checkContact(phone) {
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/contacts`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ contacts: [phone] }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  console.log('PHONE:', phone);
  console.log('STATUS:', res.status);
  console.log(JSON.stringify(json, null, 2));
  console.log('---');
}

(async () => {
  for (const phone of candidates) {
    await checkContact(phone);
  }
})();
