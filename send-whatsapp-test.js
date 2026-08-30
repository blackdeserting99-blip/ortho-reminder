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

if (!env.VONAGE_APPLICATION_ID) {
  throw new Error("Missing VONAGE_APPLICATION_ID");
}

if (!env.VONAGE_PRIVATE_KEY) {
  throw new Error("Missing VONAGE_PRIVATE_KEY");
}

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

async function main() {
  const endpoint = "https://api.nexmo.com/v1/messages";

  const body = {
    to: "9647738361523",
    from: "15554701667",
    channel: "whatsapp",
    message_type: "template",

    whatsapp: {
      policy: "deterministic",
      locale: "en"
    },

    template: {
      name: "clinic_appointment_notice",
      parameters: []
    }
  };

  console.log("Endpoint:", endpoint);
  console.log("From:", body.from);
  console.log("To:", body.to);
  console.log("Template:", body.template.name);
  console.log("\nSending WhatsApp template...");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  });

  const responseText = await response.text();

  console.log("\nHTTP:", response.status);
  console.log(responseText);

  if (response.status === 202) {
    console.log("\nVonage accepted the message request.");
    console.log(
      "If WhatsApp does not deliver it, the next error will normally be available through the Messages status callback/webhook."
    );
  }
}

main().catch(error => {
  console.error("\nERROR:", error.message);
});