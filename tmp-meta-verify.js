const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const envText = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const env = envText.split(/\r?\n/).reduce((acc, line) => {
  const m = line.match(/^([^=#]+)=(.*)$/);
  if (m) {
    acc[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
  }
  return acc;
}, {});

(async () => {
  const { WHATSAPP_ACCESS_TOKEN: token, WHATSAPP_PHONE_NUMBER_ID: phoneNumberId, META_GRAPH_API_VERSION } = env;
  const apiVersion = (META_GRAPH_API_VERSION || 'v23.0').trim();
  if (!token || !phoneNumberId) {
    console.error('Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID in .env');
    process.exit(1);
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`;
  console.log('GET', url);
  const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  console.log('status', res.status);
  const text = await res.text();
  console.log(text);
})();
