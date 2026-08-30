const fs = require("fs");
const crypto = require("crypto");

const env = {};

for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;

  const i = line.indexOf("=");

  if (i > 0) {
    let value = line.slice(i + 1).trim();
    value = value.replace(/^["']|["']$/g, "");
    env[line.slice(0, i).trim()] = value;
  }
}

const now = Math.floor(Date.now() / 1000);

const header = Buffer.from(JSON.stringify({
  alg: "RS256",
  typ: "JWT"
})).toString("base64url");

const payload = Buffer.from(JSON.stringify({
  application_id: env.VONAGE_APPLICATION_ID,
  iat: now,
  exp: now + 300,
  jti: crypto.randomUUID()
})).toString("base64url");

const input = `${header}.${payload}`;

const key = crypto.createPrivateKey(
  env.VONAGE_PRIVATE_KEY.replace(/\\n/g, "\n")
);

const signature = crypto
  .sign("RSA-SHA256", Buffer.from(input), key)
  .toString("base64url");

const jwt = `${input}.${signature}`;

async function main() {
  const wabaId = "1029051956596248";
  const templateId = "1051122791049475";

  const endpoint =
    `https://api.nexmo.com/v2/whatsapp-manager/wabas/${wabaId}/templates/${templateId}`;

  console.log("Checking rejected template...");

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/json"
    }
  });

  console.log("HTTP:", response.status);
  console.log(await response.text());
}

main().catch(error => {
  console.error("ERROR:", error.message);
});