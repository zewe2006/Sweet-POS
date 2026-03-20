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

describe("Auth API", () => {
  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      // Get users to find a valid one
      const usersRes = await request(app).get("/api/users");
      const activeUser = usersRes.body.find((u: any) => u.isActive && u.username && u.password);
      if (!activeUser) return; // skip if no user with credentials

      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: activeUser.username, password: activeUser.password });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("name");
      expect(res.body).not.toHaveProperty("password");
    });

    it("should reject invalid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "nonexistent", password: "wrong" });
      expect(res.status).toBe(401);
    });

    it("should reject missing fields", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/verify-manager-pin", () => {
    it("should verify a manager/admin PIN", async () => {
      const usersRes = await request(app).get("/api/users");
      const manager = usersRes.body.find(
        (u: any) => (u.role === "manager" || u.role === "admin") && u.pin && u.isActive
      );
      if (!manager) return;

      const res = await request(app)
        .post("/api/auth/verify-manager-pin")
        .send({ pin: manager.pin });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id");
      expect(res.body).not.toHaveProperty("password");
      expect(["manager", "admin"]).toContain(res.body.role);
    });

    it("should reject a cashier PIN with 403", async () => {
      const usersRes = await request(app).get("/api/users");
      const cashier = usersRes.body.find(
        (u: any) => u.role === "cashier" && u.pin && u.isActive
      );
      if (!cashier) return;

      const res = await request(app)
        .post("/api/auth/verify-manager-pin")
        .send({ pin: cashier.pin });
      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Manager authorization");
    });

    it("should reject invalid PIN", async () => {
      const res = await request(app)
        .post("/api/auth/verify-manager-pin")
        .send({ pin: "000000" });
      expect(res.status).toBe(401);
    });

    it("should reject missing PIN", async () => {
      const res = await request(app)
        .post("/api/auth/verify-manager-pin")
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/register", () => {
    const uniqueUsername = `testuser_${Date.now()}`;

    it("should register a new employee", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ username: uniqueUsername, password: "test123", name: "Test User" });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.username).toBe(uniqueUsername);
      expect(res.body.role).toBe("cashier");
      expect(res.body).not.toHaveProperty("password");
    });

    it("should reject duplicate username", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ username: uniqueUsername, password: "test123", name: "Duplicate User" });
      expect(res.status).toBe(409);
    });

    it("should reject missing fields", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ username: "onlyusername" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return user when X-User-Id header is set", async () => {
      const usersRes = await request(app).get("/api/users");
      if (usersRes.body.length === 0) return;
      const userId = usersRes.body[0].id;

      const res = await request(app)
        .get("/api/auth/me")
        .set("X-User-Id", String(userId));
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(userId);
      expect(res.body).not.toHaveProperty("password");
    });

    it("should return 401 without header", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/employee/shifts", () => {
    it("should return shifts for authenticated employee", async () => {
      const usersRes = await request(app).get("/api/users");
      if (usersRes.body.length === 0) return;
      const userId = usersRes.body[0].id;

      const res = await request(app)
        .get("/api/employee/shifts")
        .set("X-User-Id", String(userId));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should reject without auth", async () => {
      const res = await request(app).get("/api/employee/shifts");
      expect(res.status).toBe(401);
    });
  });
});
