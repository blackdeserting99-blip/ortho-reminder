const fs = require("fs");
const crypto = require("crypto");

const envText = fs.readFileSync(".env","utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  let v = line.slice(i+1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v=v.slice(1,-1);
  env[line.slice(0,i).trim()] = v;
}

const b64url = x => Buffer.from(x).toString("base64url");

(async () => {
  const now = Math.floor(Date.now()/1000);
  const header = b64url(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const payload = b64url(JSON.stringify({
    application_id: env.VONAGE_APPLICATION_ID,
    iat: now,
    exp: now + 300,
    jti: crypto.randomUUID()
  }));

  const input = `${header}.${payload}`;
  const key = crypto.createPrivateKey(env.VONAGE_PRIVATE_KEY.replace(/\\n/g,"\n"));
  const sig = crypto.sign("RSA-SHA256",Buffer.from(input),key).toString("base64url");
  const jwt = `${input}.${sig}`;

  const body = {
    name: "orthodontic_appointment_reminder_v2",
    language: "en",
    category: "UTILITY",
    components: [{
      type: "BODY",
      text: "Hello {{1}}, this is an appointment reminder from {{2}}. According to our clinic schedule, your orthodontic appointment is scheduled for {{3}} at {{4}}. This message provides information about your scheduled visit. If you cannot attend the appointment, please contact the clinic so that appropriate arrangements can be made. Thank you."
    }]
  };

  const r = await fetch(
    "https://api.nexmo.com/v2/whatsapp-manager/wabas/1029051956596248/templates",
    {
      method:"POST",
      headers:{
        Authorization:`Bearer ${jwt}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify(body)
    }
  );

  console.log("HTTP:",r.status);
  console.log(await r.text());
})();
