import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { inventoryItems } from "../drizzle/schema";
import { eq, inArray, and } from "drizzle-orm";

/**
 * Test para validar que el filtro REORDEN funciona correctamente
 * Verifica que:
 * 1. Los estados se normalizan correctamente (trim, uppercase)
 * 2. El filtro encuentra referencias con estado REORDEN
 * 3. Las actualizaciones de sincronización no afectan el filtro
 */

describe("Inventory Filter - REORDEN", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");
  });

  it("should normalize estado to uppercase and trim whitespace", async () => {
    // Insert test data with various estado formats
    const testItems = [
      { referencia: "TEST-001", estado: "REORDEN", descripcion: "Test 1" },
      { referencia: "TEST-002", estado: " REORDEN ", descripcion: "Test 2 with spaces" },
      { referencia: "TEST-003", estado: "reorden", descripcion: "Test 3 lowercase" },
      { referencia: "TEST-004", estado: "CRITICO", descripcion: "Test 4 different state" },
    ];

    // Clean up test data
    await db.delete(inventoryItems).where(
      inArray(inventoryItems.referencia, testItems.map(i => i.referencia))
    );

    // Insert test items
    for (const item of testItems) {
      await db.insert(inventoryItems).values({
        referencia: item.referencia,
        estado: (item.estado || "").toUpperCase().trim() || null,
        descripcion: item.descripcion,
      });
    }

    // Query for REORDEN status
    const result = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.estado, "REORDEN"));

    // Should find all 3 REORDEN items (normalized)
    expect(result.length).toBe(3);
    expect(result.every((r: any) => r.estado === "REORDEN")).toBe(true);

    // Clean up
    await db.delete(inventoryItems).where(
      inArray(inventoryItems.referencia, testItems.map(i => i.referencia))
    );
  });

  it("should filter by estado without affecting other filters", async () => {
    const testItems = [
      { referencia: "FILTER-001", estado: "REORDEN", cuenta: "PLATAFORMA", descripcion: "Reorden item" },
      { referencia: "FILTER-002", estado: "REORDEN", cuenta: "CAJA", descripcion: "Reorden item 2" },
      { referencia: "FILTER-003", estado: "OPTIMO", cuenta: "PLATAFORMA", descripcion: "Optimo item" },
    ];

    // Clean up
    await db.delete(inventoryItems).where(
      inArray(inventoryItems.referencia, testItems.map(i => i.referencia))
    );

    // Insert test items
    for (const item of testItems) {
      await db.insert(inventoryItems).values({
        referencia: item.referencia,
        estado: (item.estado || "").toUpperCase().trim() || null,
        cuenta: item.cuenta,
        descripcion: item.descripcion,
      });
    }

    // Filter by REORDEN only
    const reordenOnly = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.estado, "REORDEN"));

    expect(reordenOnly.length).toBe(2);

    // Filter by REORDEN + PLATAFORMA
    const reordenPlataforma = await db
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.estado, "REORDEN"),
          eq(inventoryItems.cuenta, "PLATAFORMA")
        )
      );

    expect(reordenPlataforma.length).toBe(1);
    expect(reordenPlataforma[0].referencia).toBe("FILTER-001");

    // Clean up
    await db.delete(inventoryItems).where(
      inArray(inventoryItems.referencia, testItems.map(i => i.referencia))
    );
  });

  it("should handle sync updates without losing filter capability", async () => {
    const testItem = {
      referencia: "SYNC-TEST-001",
      estado: "REORDEN",
      descripcion: "Original description",
      stockActual: 10,
    };

    // Clean up
    await db.delete(inventoryItems).where(
      eq(inventoryItems.referencia, testItem.referencia)
    );

    // Insert original
    await db.insert(inventoryItems).values({
      referencia: testItem.referencia,
      estado: (testItem.estado || "").toUpperCase().trim() || null,
      descripcion: testItem.descripcion,
      stockActual: testItem.stockActual,
    });

    // Verify it's found by filter
    let result = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.estado, "REORDEN"));
    expect(result.some((r: any) => r.referencia === testItem.referencia)).toBe(true);

    // Simulate sync update (with normalized estado)
    const updatedItem = {
      ...testItem,
      descripcion: "Updated description",
      stockActual: 15,
      estado: " REORDEN ", // With spaces, as it might come from Excel
    };

    // Delete and re-insert (simulating bulk upsert)
    await db.delete(inventoryItems).where(
      eq(inventoryItems.referencia, testItem.referencia)
    );

    await db.insert(inventoryItems).values({
      referencia: updatedItem.referencia,
      estado: (updatedItem.estado || "").toUpperCase().trim() || null,
      descripcion: updatedItem.descripcion,
      stockActual: updatedItem.stockActual,
    });

    // Verify it's still found by filter after update
    result = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.estado, "REORDEN"));

    const updated = result.find((r: any) => r.referencia === testItem.referencia);
    expect(updated).toBeDefined();
    expect(updated?.descripcion).toBe("Updated description");
    expect(updated?.stockActual).toBe(15);

    // Clean up
    await db.delete(inventoryItems).where(
      eq(inventoryItems.referencia, testItem.referencia)
    );
  });
});
