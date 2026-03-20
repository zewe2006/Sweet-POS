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

describe("Customers API", () => {
  let customerId: number;
  const phone = `404${Date.now().toString().slice(-7)}`;

  describe("POST /api/customers", () => {
    it("should create a customer", async () => {
      const res = await request(app)
        .post("/api/customers")
        .send({ name: "Test Customer", phone, email: `test${Date.now()}@example.com` });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.name).toBe("Test Customer");
      customerId = res.body.id;
    });
  });

  describe("GET /api/customers", () => {
    it("should return array of customers", async () => {
      const res = await request(app).get("/api/customers");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/customers/:id", () => {
    it("should return a specific customer", async () => {
      const res = await request(app).get(`/api/customers/${customerId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(customerId);
    });
  });

  describe("Customer lookup", () => {
    it("should find customer by phone", async () => {
      const res = await request(app).get(`/api/customers/lookup/phone/${phone}`);
      expect(res.status).toBe(200);
      expect(res.body.phone).toBe(phone);
    });

    it("should return 404 for unknown phone", async () => {
      const res = await request(app).get("/api/customers/lookup/phone/0000000000");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/customers/:id/earn", () => {
    it("should earn reward points", async () => {
      const res = await request(app)
        .post(`/api/customers/${customerId}/earn`)
        .send({ amount: 25.00, orderId: 1 });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("customer");
      expect(res.body).toHaveProperty("transaction");
      expect(res.body.customer.rewardPoints).toBeGreaterThan(0);
    });
  });
});

describe("Gift Cards API", () => {
  let giftCardId: number;
  let giftCardCode: string;

  describe("POST /api/gift-cards", () => {
    it("should create a gift card", async () => {
      const res = await request(app)
        .post("/api/gift-cards")
        .send({ initialValue: 50, balance: 50, purchasedBy: "Test" });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("code");
      expect(res.body.balance).toBe(50);
      expect(res.body.initialValue).toBe(50);
      expect(res.body.isActive).toBe(true);
      giftCardId = res.body.id;
      giftCardCode = res.body.code;
    });
  });

  describe("GET /api/gift-cards", () => {
    it("should return array of gift cards", async () => {
      const res = await request(app).get("/api/gift-cards");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/gift-cards/lookup/:code", () => {
    it("should find gift card by code", async () => {
      const res = await request(app).get(`/api/gift-cards/lookup/${giftCardCode}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(giftCardCode);
    });

    it("should return 404 for unknown code", async () => {
      const res = await request(app).get("/api/gift-cards/lookup/XXXXXXXXXXXXXX");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/gift-cards/:id/reload", () => {
    it("should reload balance", async () => {
      const res = await request(app)
        .post(`/api/gift-cards/${giftCardId}/reload`)
        .send({ amount: 25 });
      expect(res.status).toBe(200);
      expect(res.body.balance).toBe(75); // 50 + 25
    });
  });

  describe("POST /api/gift-cards/:id/use", () => {
    it("should deduct from balance", async () => {
      const res = await request(app)
        .post(`/api/gift-cards/${giftCardId}/use`)
        .send({ amount: 10 });
      expect(res.status).toBe(200);
      expect(res.body.balance).toBe(65); // 75 - 10
    });
  });
});
