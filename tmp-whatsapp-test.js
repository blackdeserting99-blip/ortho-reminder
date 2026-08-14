const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function main() {
  const base = 'http://127.0.0.1:3000';
  const email = `tmp.user.${Date.now()}@example.com`;
  const password = 'TempPass123!';

  console.log('registering', email);
  let res = await fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Temp User', email, password }),
  });
  const registerBody = await res.text();
  console.log('register status', res.status);
  console.log('register body', registerBody);

  if (res.status !== 200) {
    throw new Error('Register failed');
  }

  const cookies = [];
  const setCookie = res.headers.raw()['set-cookie'] || [];
  for (const cookie of setCookie) {
    const [pair] = cookie.split(';');
    cookies.push(pair);
  }

  if (!cookies.length) {
    console.log('no cookies from register, attempting login');
    res = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const loginBody = await res.text();
    console.log('login status', res.status);
    console.log('login body', loginBody);
    if (res.status !== 200) {
      throw new Error('Login failed');
    }
    const loginCookie = res.headers.raw()['set-cookie'] || [];
    for (const cookie of loginCookie) {
      const [pair] = cookie.split(';');
      cookies.push(pair);
    }
  }

  const cookieHeader = cookies.join('; ');
  console.log('cookie header', cookieHeader);

  const candidatePhones = [
    '0770 123 4567',
    '0773 836 1523',
    '0776 003 3397',
    '0775 153 3282',
    '9647701234567',
    '+9647701234567',
  ];
  const message = 'WhatsApp test from local dev at ' + new Date().toISOString();

  for (const phone of candidatePhones) {
    console.log('\n=== Sending to', phone, '===');
    const response = await fetch(`${base}/api/whatsapp/test-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ phone, message }),
    });
    const body = await response.text();
    console.log('status', response.status);
    console.log(body);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
