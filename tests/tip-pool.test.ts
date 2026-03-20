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

describe("Tip Pool API", () => {
  let configId: number;

  describe("GET /api/tip-pool/config", () => {
    it("should return default config when none exists", async () => {
      const res = await request(app).get("/api/tip-pool/config?locationId=999");
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Default Pool");
      expect(res.body.cashierPercent).toBe(40);
      expect(res.body.kitchenPercent).toBe(30);
      expect(res.body.managerPercent).toBe(30);
      expect(res.body.method).toBe("equal");
    });

    it("should return existing config for location", async () => {
      const res = await request(app).get("/api/tip-pool/config?locationId=1");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("cashierPercent");
      expect(res.body).toHaveProperty("kitchenPercent");
      expect(res.body).toHaveProperty("managerPercent");
    });
  });

  describe("POST /api/tip-pool/config", () => {
    it("should create a new tip pool config", async () => {
      const res = await request(app)
        .post("/api/tip-pool/config")
        .send({
          locationId: 1,
          name: "Test Tip Pool",
          isActive: true,
          cashierPercent: 50,
          kitchenPercent: 30,
          managerPercent: 20,
          method: "hours_worked",
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.name).toBe("Test Tip Pool");
      expect(res.body.cashierPercent).toBe(50);
      expect(res.body.method).toBe("hours_worked");
      configId = res.body.id;
    });
  });

  describe("PATCH /api/tip-pool/config/:id", () => {
    it("should update an existing config", async () => {
      const res = await request(app)
        .patch(`/api/tip-pool/config/${configId}`)
        .send({
          cashierPercent: 45,
          kitchenPercent: 35,
          managerPercent: 20,
        });
      expect(res.status).toBe(200);
      expect(res.body.cashierPercent).toBe(45);
      expect(res.body.kitchenPercent).toBe(35);
    });

    it("should return 404 for nonexistent config", async () => {
      const res = await request(app)
        .patch("/api/tip-pool/config/99999")
        .send({ cashierPercent: 50 });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/tip-pool/distribute", () => {
    it("should return distribution data", async () => {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const res = await request(app)
        .get(`/api/tip-pool/distribute?locationId=1&startDate=${weekAgo}&endDate=${today}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalTips");
      expect(res.body).toHaveProperty("startDate");
      expect(res.body).toHaveProperty("endDate");
      expect(res.body).toHaveProperty("method");
      expect(res.body).toHaveProperty("distribution");
      expect(Array.isArray(res.body.distribution)).toBe(true);
      // Check distribution entry shape
      if (res.body.distribution.length > 0) {
        const entry = res.body.distribution[0];
        expect(entry).toHaveProperty("userId");
        expect(entry).toHaveProperty("name");
        expect(entry).toHaveProperty("role");
        expect(entry).toHaveProperty("hoursWorked");
        expect(entry).toHaveProperty("tipSharePercent");
        expect(entry).toHaveProperty("tipAmount");
      }
    });
  });
});
