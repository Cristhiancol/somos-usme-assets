import "dotenv/config";
import { exchangeCodeForTokens } from "../server/gdrive-oauth";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: npx tsx scripts/exchange-code.ts <code> <redirectUri>");
    process.exit(1);
  }

  const code = args[0];
  const redirectUri = args[1];

  console.log("=== MANUAL TOKEN EXCHANGE ===");
  console.log("Using code:", code.substring(0, 15) + "...");
  console.log("Using redirectUri:", redirectUri);

  const client_id = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || process.env.GDRIVE_CLIENT_ID || "";
  const client_secret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || process.env.GDRIVE_CLIENT_SECRET || "";

  console.log("Client ID:", client_id.substring(0, 15) + "...");
  console.log("Client Secret length:", client_secret.length);

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id,
        client_secret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    console.log("Response status:", res.status, res.statusText);
    const text = await res.text();
    console.log("Response body:", text);

    if (res.ok) {
      console.log("\nTrying database upsert...");
      const success = await exchangeCodeForTokens(code, redirectUri);
      console.log("exchangeCodeForTokens returned:", success);
    }
  } catch (err: any) {
    console.error("Error during manual exchange:", err.message);
  }
}

main().catch(console.error);
