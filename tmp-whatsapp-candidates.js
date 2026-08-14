const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const base = 'http://127.0.0.1:3000';

async function getCookie() {
  const email = `tmp.user.${Date.now()}@example.com`;
  const password = 'TempPass123!';

  let res = await fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Temp User', email, password }),
  });

  if (res.status !== 200) {
    console.error('Register failed', res.status, await res.text());
  }

  res = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (res.status !== 200) {
    console.error('Login failed', res.status, await res.text());
    process.exit(1);
  }

  const cookies = [];
  for (const cookie of res.headers.raw()['set-cookie'] || []) {
    const [pair] = cookie.split(';');
    cookies.push(pair);
  }
  const cookieHeader = cookies.join('; ');
  if (!cookieHeader) {
    console.error('No cookies returned from login');
    process.exit(1);
  }
  return cookieHeader;
}

async function testPhones(cookies, phones) {
  for (const phone of phones) {
    console.log(`\n=== Sending to ${phone} ===`);
    const res = await fetch(`${base}/api/whatsapp/test-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
      body: JSON.stringify({ phone }),
    });
    const text = await res.text();
    console.log('status', res.status);
    try {
      const json = JSON.parse(text);
      console.log(JSON.stringify(json, null, 2));
    } catch {
      console.log(text);
    }
  }
}

(async () => {
  const cookies = await getCookie();
  const phones = [
    '9647738361523',
    '9647807576657',
    '9647751533282',
    '9647760033397',
    '9647701234567',
    '0770 123 4567',
    '0773 836 1523',
    '0776 003 3397',
    '0775 153 3282',
  ];
  await testPhones(cookies, phones);
})();
