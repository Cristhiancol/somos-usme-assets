import "dotenv/config";
import { serverLogger } from "../server/logger";

const client_id = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || process.env.GDRIVE_CLIENT_ID || "";
const client_secret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || process.env.GDRIVE_CLIENT_SECRET || "";

console.log("=== OAUTH DIAGNOSTICS ===");
console.log("GOOGLE_DRIVE_CLIENT_ID loaded:", client_id ? "YES" : "NO");
if (client_id) {
  console.log("  Length:", client_id.length);
  console.log("  Starts with:", client_id.substring(0, 10) + "...");
}

console.log("GOOGLE_DRIVE_CLIENT_SECRET loaded:", client_secret ? "YES" : "NO");
if (client_secret) {
  console.log("  Length:", client_secret.length);
  console.log("  Masked:", client_secret.substring(0, 8) + "..." + client_secret.substring(client_secret.length - 4));
} else {
  console.log("  CRITICAL ERROR: GOOGLE_DRIVE_CLIENT_SECRET is empty!");
}

console.log("DATABASE_URL loaded:", process.env.DATABASE_URL ? "YES" : "NO");
console.log("=========================");
