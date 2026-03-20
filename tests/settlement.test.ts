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

describe("Settlement & Cash Drawer API", () => {
  const today = new Date().toISOString().split("T")[0];

  describe("GET /api/settlements", () => {
    it("should return array of settlements", async () => {
      const res = await request(app).get("/api/settlements");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should filter by locationId", async () => {
      const res = await request(app).get("/api/settlements?locationId=1");
      expect(res.status).toBe(200);
      for (const s of res.body) {
        expect(s.locationId).toBe(1);
      }
    });
  });

  describe("GET /api/settlements/preview/:locationId/:date", () => {
    it("should return settlement preview data", async () => {
      const res = await request(app).get(`/api/settlements/preview/1/${today}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalOrders");
      expect(res.body).toHaveProperty("totalRevenue");
    });
  });

  describe("GET /api/settlements/check/:locationId/:date", () => {
    it("should check if settlement exists for date", async () => {
      const res = await request(app).get(`/api/settlements/check/1/${today}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("closed");
    });
  });

  describe("Cash Drawer", () => {
    describe("GET /api/cash-drawer", () => {
      it("should return cash drawer transactions", async () => {
        const res = await request(app).get(`/api/cash-drawer?locationId=1&date=${today}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });
    });

    describe("POST /api/cash-drawer", () => {
      it("should create a cash-in transaction", async () => {
        const res = await request(app)
          .post("/api/cash-drawer")
          .send({
            locationId: 1,
            type: "cash_in",
            amount: 100,
            reason: "Opening float",
            performedBy: "Manager",
          });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("id");
        expect(res.body.type).toBe("cash_in");
        expect(res.body.amount).toBe(100);
      });

      it("should create a cash-out transaction", async () => {
        const res = await request(app)
          .post("/api/cash-drawer")
          .send({
            locationId: 1,
            type: "cash_out",
            amount: 20,
            reason: "Petty cash",
            performedBy: "Manager",
          });
        expect(res.status).toBe(201);
        expect(res.body.type).toBe("cash_out");
      });
    });

    describe("DELETE /api/cash-drawer/:id", () => {
      it("should void a cash drawer transaction", async () => {
        // Create one to delete
        const createRes = await request(app)
          .post("/api/cash-drawer")
          .send({
            locationId: 1,
            type: "cash_in",
            amount: 50,
            reason: "To delete",
            performedBy: "Test",
          });
        const id = createRes.body.id;
        const res = await request(app).delete(`/api/cash-drawer/${id}`);
        expect(res.status).toBe(200);
      });
    });
  });
});
