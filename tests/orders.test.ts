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

describe("Orders API", () => {
  let createdOrderId: number;
  let menuItemId: number;

  beforeAll(async () => {
    // Get a valid menu item ID for creating orders
    const menuRes = await request(app).get("/api/menu/items");
    if (menuRes.body.length > 0) {
      menuItemId = menuRes.body[0].id;
    }
  });

  describe("GET /api/orders", () => {
    it("should return an array of orders", async () => {
      const res = await request(app).get("/api/orders");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should filter by locationId", async () => {
      const res = await request(app).get("/api/orders?locationId=1");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const order of res.body) {
        expect(order.locationId).toBe(1);
      }
    });
  });

  describe("POST /api/orders", () => {
    it("should create an order with items", async () => {
      const res = await request(app)
        .post("/api/orders")
        .send({
          locationId: 1,
          source: "pos",
          type: "dine_in",
          items: [
            { menuItemId, quantity: 2, modifiers: [] },
          ],
          paymentMethod: "cash",
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("orderNumber");
      expect(res.body).toHaveProperty("items");
      expect(res.body.items.length).toBe(1);
      expect(res.body.subtotal).toBeGreaterThan(0);
      expect(res.body.tax).toBeGreaterThan(0);
      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.status).toBe("closed"); // paid POS order
      createdOrderId = res.body.id;
    });

    it("should create an unpaid POS order with open status", async () => {
      const res = await request(app)
        .post("/api/orders")
        .send({
          locationId: 1,
          source: "pos",
          type: "takeout",
          items: [
            { menuItemId, quantity: 1, modifiers: [] },
          ],
        });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe("open");
    });

    it("should reject order with no items", async () => {
      const res = await request(app)
        .post("/api/orders")
        .send({
          locationId: 1,
          items: [],
        });
      expect(res.status).toBe(400);
    });

    it("should reject order with invalid menu item", async () => {
      const res = await request(app)
        .post("/api/orders")
        .send({
          locationId: 1,
          items: [{ menuItemId: 99999, quantity: 1, modifiers: [] }],
          paymentMethod: "cash",
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain("not found");
    });

    it("should calculate modifiers in total", async () => {
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
              modifiers: [
                { name: "Boba Pearls", price: 0.75 },
                { name: "Cheese Foam", price: 1.25 },
              ],
            },
          ],
          paymentMethod: "cash",
        });
      expect(res.status).toBe(201);
      // Subtotal should be item price + 0.75 + 1.25
      const menuRes = await request(app).get("/api/menu/items");
      const item = menuRes.body.find((i: any) => i.id === menuItemId);
      const expectedSubtotal = item.price + 0.75 + 1.25;
      expect(res.body.subtotal).toBeCloseTo(expectedSubtotal, 2);
    });
  });

  describe("GET /api/orders/:id", () => {
    it("should return a single order with items", async () => {
      const res = await request(app).get(`/api/orders/${createdOrderId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdOrderId);
      expect(res.body).toHaveProperty("items");
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it("should return 404 for nonexistent order", async () => {
      const res = await request(app).get("/api/orders/99999");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/orders/:id/status", () => {
    it("should update order status", async () => {
      // First create an open order
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
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "preparing" });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("preparing");
    });

    it("should reject invalid status", async () => {
      const res = await request(app)
        .patch(`/api/orders/${createdOrderId}/status`)
        .send({ status: "invalid_status" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/orders/queue/:locationId", () => {
    it("should return kitchen queue orders", async () => {
      const res = await request(app).get("/api/orders/queue/1");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const order of res.body) {
        expect(["preparing", "ready"]).toContain(order.status);
        expect(order).toHaveProperty("items");
      }
    });
  });
});
