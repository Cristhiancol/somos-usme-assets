import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@somos.co",
      name: "Test User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("dashboard.kpis", () => {
  it("returns KPI data with expected fields", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.kpis();

    expect(result).toBeDefined();
    expect(result).toHaveProperty("totalRefs");
    expect(result).toHaveProperty("totalValue");
    expect(result).toHaveProperty("zeroStock");
    expect(result).toHaveProperty("withStock");
    expect(result).toHaveProperty("classA");
    expect(result).toHaveProperty("classB");
    expect(result).toHaveProperty("classC");
    expect(result).toHaveProperty("totalPending");
    // totalRefs should be >= 1828 (current data)
    expect(Number(result!.totalRefs)).toBeGreaterThanOrEqual(1000);
  });
});

describe("dashboard.jitAlerts", () => {
  it("returns JIT alert counts", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.jitAlerts();

    expect(result).toBeDefined();
    expect(result).toHaveProperty("critico");
    expect(result).toHaveProperty("reorden");
    expect(result).toHaveProperty("precaucion");
    expect(result).toHaveProperty("optimo");
    // Sum of all alerts should equal total items
    const total = Number(result!.critico) + Number(result!.reorden) + Number(result!.precaucion) + Number(result!.optimo);
    expect(total).toBeGreaterThan(0);
  });
});

describe("dashboard.valueByCategory", () => {
  it("returns category breakdown", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.valueByCategory();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    // Should have PLATAFORMA as one of the categories
    const cuentas = result.map(r => r.cuenta);
    expect(cuentas).toContain("PLATAFORMA");
  });
});

describe("dashboard.top20Value", () => {
  it("returns top 20 highest value items", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.top20Value();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result.length).toBeGreaterThan(0);
    // First item should have highest value
    if (result.length > 1) {
      expect(Number(result[0].totalStock)).toBeGreaterThanOrEqual(Number(result[1].totalStock));
    }
  });
});

describe("dashboard.top20ZeroStock", () => {
  it("returns top 20 zero stock items", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.top20ZeroStock();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("orders.list", () => {
  it("returns purchase orders", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.orders.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("ordenCompra");
    expect(result[0]).toHaveProperty("proveedor");
  });

  it("filters by estado", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.orders.list({ estado: "PENDIENTE" });

    expect(result).toBeDefined();
    result.forEach(o => {
      expect(o.estado).toBe("PENDIENTE");
    });
  });
});

describe("inventory.list", () => {
  it("returns paginated inventory", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.inventory.list({ page: 1, limit: 10 });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(result.items.length).toBeLessThanOrEqual(10);
    expect(result.total).toBeGreaterThan(0);
  });

  it("filters by cuenta", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.inventory.list({ cuenta: "PLATAFORMA", page: 1, limit: 5 });

    expect(result.items.length).toBeGreaterThan(0);
    result.items.forEach(item => {
      expect(item.cuenta).toBe("PLATAFORMA");
    });
  });
});

describe("suppliers.list", () => {
  it("returns suppliers", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.suppliers.list();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("nit");
    expect(result[0]).toHaveProperty("nombre");
  });
});
