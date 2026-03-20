import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import type { Server } from "http";
import { createTestApp } from "./setup";

let app: Express;
let httpServer: Server;

beforeAll(async () => {
  const result = await createTestApp();
  app = result.app;
  httpServer = result.httpServer;
});

afterAll(() => {
  httpServer.close();
});

describe("Refund API", () => {
  let closedOrderId: number;
  let orderTotal: number;
  let menuItemId: number;

  beforeAll(async () => {
    // Get menu item
    const menuRes = await request(app).get("/api/menu/items");
    menuItemId = menuRes.body[0].id;

    // Create a closed order for refund testing
    const res = await request(app)
      .post("/api/orders")
      .send({
        locationId: 1,
        source: "pos",
        type: "dine_in",
        items: [{ menuItemId, quantity: 2, modifiers: [] }],
        paymentMethod: "cash",
      });
    closedOrderId = res.body.id;
    orderTotal = res.body.total;
  });

  describe("POST /api/orders/:id/refund", () => {
    it("should process a partial refund", async () => {
      const refundAmount = Math.round(orderTotal / 2 * 100) / 100;
      const res = await request(app)
        .post(`/api/orders/${closedOrderId}/refund`)
        .send({
          amount: refundAmount,
          reason: "Customer complaint",
          refundedBy: "Manager Mike",
        });
      expect(res.status).toBe(200);
      expect(res.body.refundAmount).toBeCloseTo(refundAmount, 2);
      expect(res.body.refundReason).toBe("Customer complaint");
      expect(res.body.refundedBy).toBe("Manager Mike");
      // Partial refund should keep original status
      expect(res.body.status).toBe("closed");
    });

    it("should process a full refund and set status to cancelled", async () => {
      // Create another closed order
      const createRes = await request(app)
        .post("/api/orders")
        .send({
          locationId: 1,
          source: "pos",
          type: "dine_in",
          items: [{ menuItemId, quantity: 1, modifiers: [] }],
          paymentMethod: "cash",
        });
      const orderId = createRes.body.id;
      const total = createRes.body.total;

      const res = await request(app)
        .post(`/api/orders/${orderId}/refund`)
        .send({ amount: total, reason: "Full refund", refundedBy: "Admin" });
      expect(res.status).toBe(200);
      expect(res.body.refundAmount).toBeCloseTo(total, 2);
      expect(res.body.status).toBe("cancelled");
    });

    it("should reject refund exceeding order total", async () => {
      // Create a fresh order
      const createRes = await request(app)
        .post("/api/orders")
        .send({
          locationId: 1,
          source: "pos",
          type: "dine_in",
          items: [{ menuItemId, quantity: 1, modifiers: [] }],
          paymentMethod: "cash",
        });
      const orderId = createRes.body.id;
      const total = createRes.body.total;

      const res = await request(app)
        .post(`/api/orders/${orderId}/refund`)
        .send({ amount: total + 10, reason: "Over-refund" });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain("exceeds");
    });

    it("should reject refund on non-closed order", async () => {
      // Create an open order (no payment)
      const createRes = await request(app)
        .post("/api/orders")
        .send({
          locationId: 1,
          source: "pos",
          type: "dine_in",
          items: [{ menuItemId, quantity: 1, modifiers: [] }],
        });
      const orderId = createRes.body.id;

      const res = await request(app)
        .post(`/api/orders/${orderId}/refund`)
        .send({ amount: 5, reason: "Test" });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain("closed/completed");
    });

    it("should reject refund with zero or negative amount", async () => {
      const res = await request(app)
        .post(`/api/orders/${closedOrderId}/refund`)
        .send({ amount: 0, reason: "Test" });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain("positive");
    });

    it("should return 404 for nonexistent order", async () => {
      const res = await request(app)
        .post("/api/orders/99999/refund")
        .send({ amount: 5, reason: "Test" });
      expect(res.status).toBe(404);
    });

    it("should create an audit log entry for refund", async () => {
      // Check audit logs for the refund we did earlier
      const res = await request(app).get("/api/audit-logs?action=refund");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const refundLogs = res.body.filter(
        (l: any) => l.action === "refund" && l.targetId === closedOrderId
      );
      expect(refundLogs.length).toBeGreaterThan(0);
    });
  });
});
