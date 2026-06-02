import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('No database connection');
    process.exit(1);
  }

  console.log('Creando tabla inventory_items_v3...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inventory_items_v3 (
      id INT AUTO_INCREMENT PRIMARY KEY,
      referencia VARCHAR(64) NOT NULL,
      descripcion TEXT,
      parteFabricante VARCHAR(128),
      stockActual DOUBLE DEFAULT 0,
      costoUnitario DOUBLE DEFAULT 0,
      totalStock DOUBLE DEFAULT 0,
      cuenta VARCHAR(64),
      puntoPedido DOUBLE DEFAULT 0,
      minimo DOUBLE DEFAULT 0,
      maximo DOUBLE DEFAULT 0,
      umEmision VARCHAR(16),
      claseAbc VARCHAR(4),
      usoAnno DOUBLE DEFAULT 0,
      usoAnnoAnt DOUBLE DEFAULT 0,
      leadTimeProm DOUBLE DEFAULT 0,
      rotacionAnno DOUBLE DEFAULT 0,
      rotacionAnt DOUBLE DEFAULT 0,
      quiebresAnno DOUBLE DEFAULT 0,
      quiebresAnt DOUBLE DEFAULT 0,
      costoPromedio DOUBLE DEFAULT 0,
      ultimoCosto DOUBLE DEFAULT 0,
      nitProveedor VARCHAR(32),
      bodega VARCHAR(32),
      proveedor TEXT,
      consumoAnual DOUBLE DEFAULT 0,
      consumoDiario DOUBLE DEFAULT 0,
      leadTimeDias DOUBLE DEFAULT 0,
      stockSeguridad DOUBLE DEFAULT 0,
      puntoReorden DOUBLE DEFAULT 0,
      inventarioDias DOUBLE DEFAULT 0,
      estado VARCHAR(32),
      accionRequerida VARCHAR(64),
      cantidadAPedir DOUBLE DEFAULT 0,
      valorAPedir DOUBLE DEFAULT 0,
      prioridad VARCHAR(16),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      UNIQUE KEY idx_inv_ref_unique (referencia)
    );
  `);

  console.log('Creando tabla purchase_orders_v3...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS purchase_orders_v3 (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ordenCompra VARCHAR(32),
      descripcion VARCHAR(255),
      qtyOrdenada DOUBLE DEFAULT 0,
      um VARCHAR(16),
      qtyRecibida DOUBLE DEFAULT 0,
      qtyPendiente DOUBLE DEFAULT 0,
      costoUnitario DOUBLE DEFAULT 0,
      proveedor TEXT,
      parteFabricante VARCHAR(128),
      comprador VARCHAR(128),
      mainsaver VARCHAR(64),
      fechaPromesa TIMESTAMP NULL,
      fechaRequerida TIMESTAMP NULL,
      valorImpuesto DOUBLE DEFAULT 0,
      valorPendiente DOUBLE DEFAULT 0,
      diasRetraso INT DEFAULT 0,
      estado VARCHAR(32),
      cumplimiento DOUBLE DEFAULT 0,
      prioridad VARCHAR(32),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      UNIQUE KEY idx_po_line_unique (ordenCompra, descripcion, mainsaver)
    );
  `);

  console.log('Creando tabla suppliers_v3...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS suppliers_v3 (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nit VARCHAR(32) NOT NULL,
      nombre TEXT,
      tipoImpuesto VARCHAR(16),
      email VARCHAR(320),
      telefono VARCHAR(32),
      contacto VARCHAR(128),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      UNIQUE KEY idx_sup_nit_unique (nit)
    );
  `);

  console.log('Tablas _v3 creadas exitosamente evadiendo Drizzle!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
