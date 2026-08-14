const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const base = 'http://127.0.0.1:3000';
(async () => {
  const email = `tmp.user.${Date.now()}@example.com`;
  const password = 'TempPass123!';
  console.log('registering', email);

  const res = await fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Temp User', email, password }),
  });
  console.log('register status', res.status);
  const body = await res.text();
  console.log('register body', body);
  console.log('cookies', res.headers.raw()['set-cookie']);

  if (res.status !== 200) {
    console.log('register failed, trying login');
    const res2 = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    console.log('login status', res2.status);
    console.log('login body', await res2.text());
    console.log('login cookies', res2.headers.raw()['set-cookie']);
  }
})();