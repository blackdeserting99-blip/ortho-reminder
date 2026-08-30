const fs = require("fs");
const crypto = require("crypto");

// Read environment variables
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

// Create JWT
const now = Math.floor(Date.now() / 1000);

const header = Buffer.from(
  JSON.stringify({
    alg: "RS256",
    typ: "JWT"
  })
).toString("base64url");

const payload = Buffer.from(
  JSON.stringify({
    application_id: env.VONAGE_APPLICATION_ID,
    iat: now,
    exp: now + 300,
    jti: crypto.randomUUID()
  })
).toString("base64url");

const input = `${header}.${payload}`;

const key = crypto.createPrivateKey(
  env.VONAGE_PRIVATE_KEY.replace(/\\n/g, "\n")
);

const signature = crypto
  .sign("RSA-SHA256", Buffer.from(input), key)
  .toString("base64url");

const jwt = `${input}.${signature}`;


// Create template
async function main() {

  const body = {
    name: "clinic_appointment_notice",
    language: "en",
    category: "UTILITY",

    components: [
      {
        type: "BODY",

        text: "This is an informational notice regarding a scheduled orthodontic appointment with our clinic. Please contact the clinic if you require additional information regarding your scheduled visit. Thank you."
      }
    ]
  };


  const response = await fetch(
    "https://api.nexmo.com/v2/whatsapp-manager/wabas/1029051956596248/templates",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },

      body: JSON.stringify(body),

      signal: AbortSignal.timeout(15000)
    }
  );


  console.log("HTTP:", response.status);
  console.log(await response.text());
}


main().catch(error => {
  console.log("ERROR:", error.message);
});