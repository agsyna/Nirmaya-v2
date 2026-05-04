import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const sheetId = Deno.env.get("GOOGLE_SHEETS_ID") || "";
const serviceAccountEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") || "";
const privateKey = (Deno.env.get("GOOGLE_PRIVATE_KEY") || "").replace(/\\n/g, "\n");

const supabase = createClient(supabaseUrl, serviceKey);

const getAccessToken = async () => {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(
    JSON.stringify({
      iss: serviceAccountEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );

  const toSign = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    decodePem(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(toSign)
  );

  const jwt = `${toSign}.${base64UrlEncode(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error_description || "Failed to get access token");
  }

  return data.access_token as string;
};

const decodePem = (pem: string) => {
  const contents = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(contents);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const base64UrlEncode = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

Deno.serve(async () => {
  if (!supabaseUrl || !serviceKey || !sheetId || !serviceAccountEmail || !privateKey) {
    return new Response("Missing Google Sheets configuration", { status: 500 });
  }

  const { data: logs, error } = await supabase
    .from("sms_delivery_logs")
    .select("*")
    .eq("synced_to_sheets", false)
    .limit(100);

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  if (!logs || logs.length === 0) {
    return new Response("No logs to sync", { status: 200 });
  }

  const token = await getAccessToken();

  const values = logs.map((log: any) => [
    log.created_at,
    log.recipient,
    log.status,
    log.message_preview,
    log.error_details || "",
    log.clinic_id,
    log.notification_id,
  ]);

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:G:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!appendRes.ok) {
    const errText = await appendRes.text();
    return new Response(`Sheets append failed: ${errText}`, { status: 500 });
  }

  const ids = logs.map((l: any) => l.id);
  await supabase
    .from("sms_delivery_logs")
    .update({ synced_to_sheets: true, sync_timestamp: new Date().toISOString() })
    .in("id", ids);

  return new Response("OK", { status: 200 });
});
