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

describe("Locations API", () => {
  describe("GET /api/locations", () => {
    it("should return array of locations", async () => {
      const res = await request(app).get("/api/locations");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty("id");
      expect(res.body[0]).toHaveProperty("name");
    });
  });

  describe("GET /api/locations/:id", () => {
    it("should return a specific location", async () => {
      const res = await request(app).get("/api/locations/1");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
      expect(res.body).toHaveProperty("name");
      expect(res.body).toHaveProperty("address");
    });

    it("should return 404 for nonexistent location", async () => {
      const res = await request(app).get("/api/locations/99999");
      expect(res.status).toBe(404);
    });
  });
});

describe("Reports API", () => {
  const today = new Date().toISOString().split("T")[0];

  describe("GET /api/reports/dashboard", () => {
    it("should return dashboard report", async () => {
      const res = await request(app)
        .get(`/api/reports/dashboard?locationId=1&startDate=${today}&endDate=${today}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("kpis");
      expect(res.body.kpis).toHaveProperty("totalRevenue");
      expect(res.body.kpis).toHaveProperty("totalOrders");
      expect(res.body.kpis).toHaveProperty("avgOrderValue");
      expect(res.body.kpis).toHaveProperty("totalTips");
    });
  });

  describe("GET /api/reports/sales", () => {
    it("should return sales report", async () => {
      const res = await request(app)
        .get(`/api/reports/sales?locationId=1&startDate=${today}&endDate=${today}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("dailyBreakdown");
      expect(Array.isArray(res.body.dailyBreakdown)).toBe(true);
    });
  });

  describe("GET /api/reports/product-mix", () => {
    it("should return product mix report", async () => {
      const res = await request(app)
        .get(`/api/reports/product-mix?locationId=1&startDate=${today}&endDate=${today}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("topByQuantity");
      expect(res.body).toHaveProperty("topByRevenue");
      expect(res.body).toHaveProperty("categoryBreakdown");
    });
  });

  describe("GET /api/reports/labor", () => {
    it("should return labor report", async () => {
      const res = await request(app)
        .get(`/api/reports/labor?locationId=1&startDate=${today}&endDate=${today}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("employeeSummary");
      expect(res.body).toHaveProperty("laborVsRevenue");
    });
  });

  describe("GET /api/reports/customers", () => {
    it("should return customer report", async () => {
      const res = await request(app)
        .get(`/api/reports/customers?locationId=1&startDate=${today}&endDate=${today}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("newVsReturning");
      expect(res.body).toHaveProperty("topBySpend");
    });
  });

  describe("GET /api/reports/enterprise", () => {
    it("should return enterprise report", async () => {
      const res = await request(app)
        .get(`/api/reports/enterprise?startDate=${today}&endDate=${today}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("overview");
      expect(res.body).toHaveProperty("locationBreakdown");
    });
  });

  describe("GET /api/reports/daily", () => {
    it("should return daily sales summary", async () => {
      const res = await request(app)
        .get(`/api/reports/daily?locationId=1&date=${today}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalOrders");
      expect(res.body).toHaveProperty("totalRevenue");
    });
  });
});
