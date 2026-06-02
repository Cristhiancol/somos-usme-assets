import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "./server/db";

async function fix() {
  const db = await getDb();
  if (!db) {
    console.error("No database connection");
    return;
  }
  console.log("Conectado a la base de datos.");
  
  try {
    console.log("Truncando tabla consumo_mensual...");
    await db.execute(sql`TRUNCATE TABLE consumo_mensual;`);
    console.log("✅ Tabla truncada");
  } catch (e: any) {
    console.error("Error truncando:", e.message);
  }

  try {
    console.log("Agregando índice único...");
    await db.execute(sql`ALTER TABLE consumo_mensual ADD UNIQUE INDEX idx_ref_mes_unique (referencia, mes);`);
    console.log("✅ Índice agregado");
  } catch (e: any) {
    console.error("Error agregando índice (tal vez ya existe):", e.message);
  }

  console.log("Iniciando sincronización desde Drive...");
  try {
    // We try to fetch the local API if the app is running
    const res = await fetch("http://localhost:3000/api/sync-drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "consumo_mensual", force: true })
    });
    const data = await res.json();
    console.log("✅ Respuesta de sync:", data);
  } catch (e: any) {
    console.error("Error al disparar sync. Asegúrate de iniciar la sincronización desde el panel web.");
  }
  process.exit(0);
}

fix();
