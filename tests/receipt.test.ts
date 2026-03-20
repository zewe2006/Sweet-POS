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

describe("Receipt API", () => {
  let orderId: number;

  beforeAll(async () => {
    // Create a test order
    const menuRes = await request(app).get("/api/menu/items");
    const menuItemId = menuRes.body[0].id;
    const res = await request(app)
      .post("/api/orders")
      .send({
        locationId: 1,
        source: "pos",
        type: "dine_in",
        items: [
          {
            menuItemId,
            quantity: 1,
            modifiers: [{ name: "Boba Pearls", price: 0.75 }],
          },
        ],
        paymentMethod: "cash",
      });
    orderId = res.body.id;
  });

  describe("GET /api/orders/:id/receipt", () => {
    it("should return formatted receipt data", async () => {
      const res = await request(app).get(`/api/orders/${orderId}/receipt`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("storeName");
      expect(res.body).toHaveProperty("storeAddress");
      expect(res.body).toHaveProperty("storePhone");
      expect(res.body).toHaveProperty("orderNumber");
      expect(res.body).toHaveProperty("date");
      expect(res.body).toHaveProperty("type");
      expect(res.body).toHaveProperty("items");
      expect(res.body).toHaveProperty("subtotal");
      expect(res.body).toHaveProperty("tax");
      expect(res.body).toHaveProperty("total");
      expect(res.body).toHaveProperty("paymentMethod");
      expect(res.body).toHaveProperty("header");
      expect(res.body).toHaveProperty("footer");
    });

    it("should include item details with modifiers", async () => {
      const res = await request(app).get(`/api/orders/${orderId}/receipt`);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0]).toHaveProperty("name");
      expect(res.body.items[0]).toHaveProperty("quantity");
      expect(res.body.items[0]).toHaveProperty("unitPrice");
      expect(res.body.items[0]).toHaveProperty("modifiers");
      expect(res.body.items[0]).toHaveProperty("total");
    });

    it("should return 404 for nonexistent order", async () => {
      const res = await request(app).get("/api/orders/99999/receipt");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/orders/:id/send-receipt", () => {
    it("should send digital receipt by email", async () => {
      const res = await request(app)
        .post(`/api/orders/${orderId}/send-receipt`)
        .send({ email: "test@example.com" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("emailed");
    });

    it("should send digital receipt by phone", async () => {
      const res = await request(app)
        .post(`/api/orders/${orderId}/send-receipt`)
        .send({ phone: "+14045551234" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("texted");
    });

    it("should create audit log for receipt send", async () => {
      const logsRes = await request(app).get("/api/audit-logs?action=receipt_sent");
      expect(logsRes.status).toBe(200);
      const relevant = logsRes.body.filter((l: any) => l.targetId === orderId);
      expect(relevant.length).toBeGreaterThan(0);
    });

    it("should return 404 for nonexistent order", async () => {
      const res = await request(app)
        .post("/api/orders/99999/send-receipt")
        .send({ email: "test@example.com" });
      expect(res.status).toBe(404);
    });
  });
});
