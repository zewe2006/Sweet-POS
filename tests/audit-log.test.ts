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

describe("Audit Log API", () => {
  let createdLogId: number;

  describe("POST /api/audit-logs", () => {
    it("should create an audit log entry", async () => {
      const res = await request(app)
        .post("/api/audit-logs")
        .send({
          locationId: 1,
          userId: 1,
          userName: "Test Admin",
          action: "settings_update",
          targetType: "settings",
          targetId: 1,
          details: "Updated store hours",
          metadata: { field: "storeHours" },
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.action).toBe("settings_update");
      expect(res.body.userName).toBe("Test Admin");
      createdLogId = res.body.id;
    });
  });

  describe("GET /api/audit-logs", () => {
    it("should return all audit logs", async () => {
      const res = await request(app).get("/api/audit-logs");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("should filter by locationId", async () => {
      const res = await request(app).get("/api/audit-logs?locationId=1");
      expect(res.status).toBe(200);
      for (const log of res.body) {
        expect(log.locationId).toBe(1);
      }
    });

    it("should filter by action type", async () => {
      const res = await request(app).get("/api/audit-logs?action=settings_update");
      expect(res.status).toBe(200);
      for (const log of res.body) {
        expect(log.action).toBe("settings_update");
      }
    });

    it("should filter by date range", async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await request(app)
        .get(`/api/audit-logs?startDate=${today}&endDate=${today}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
