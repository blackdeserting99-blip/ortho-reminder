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
const businessAccountId = env.WHATSAPP_BUSINESS_ACCOUNT_ID;

if (!token || !phoneNumberId || !businessAccountId) {
  console.error('Missing required env values');
  process.exit(1);
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  try { return JSON.parse(text); } catch (err) { return text; }
}

(async () => {
  const urls = [
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,owned_by`,
    `https://graph.facebook.com/${apiVersion}/${businessAccountId}?fields=id,name,owned_phone_numbers{display_phone_number,id},phone_numbers{display_phone_number,id}`,
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/metadata?fields=display_phone_number,quality_rating,verified_name`,
    `https://graph.facebook.com/${apiVersion}/${businessAccountId}/phone_numbers?fields=display_phone_number,id,verified_name,quality_rating`
  ];
  for (const url of urls) {
    console.log('URL:', url);
    const result = await getJson(url);
    console.log(JSON.stringify(result, null, 2));
    console.log('---');
  }
})();
