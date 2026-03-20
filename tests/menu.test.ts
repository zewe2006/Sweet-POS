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

describe("Menu API", () => {
  describe("GET /api/menu/categories", () => {
    it("should return an array of active categories", async () => {
      const res = await request(app).get("/api/menu/categories");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty("id");
        expect(res.body[0]).toHaveProperty("name");
        // All returned should be active
        for (const cat of res.body) {
          expect(cat.isActive).toBe(true);
        }
      }
    });
  });

  describe("GET /api/menu/items", () => {
    it("should return all menu items", async () => {
      const res = await request(app).get("/api/menu/items");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty("id");
        expect(res.body[0]).toHaveProperty("name");
        expect(res.body[0]).toHaveProperty("price");
      }
    });

    it("should filter items by categoryId", async () => {
      const catRes = await request(app).get("/api/menu/categories");
      if (catRes.body.length > 0) {
        const categoryId = catRes.body[0].id;
        const res = await request(app).get(`/api/menu/items?categoryId=${categoryId}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        for (const item of res.body) {
          expect(item.categoryId).toBe(categoryId);
        }
      }
    });
  });

  describe("GET /api/menu/modifiers", () => {
    it("should return modifier groups with nested modifiers", async () => {
      const res = await request(app).get("/api/menu/modifiers");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty("id");
        expect(res.body[0]).toHaveProperty("name");
        expect(res.body[0]).toHaveProperty("modifiers");
        expect(Array.isArray(res.body[0].modifiers)).toBe(true);
      }
    });
  });

  describe("POST /api/menu/categories", () => {
    it("should create a new category", async () => {
      const res = await request(app)
        .post("/api/menu/categories")
        .send({ name: "Test Category", sortOrder: 99, isActive: true });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.name).toBe("Test Category");
    });

    it("should reject invalid data", async () => {
      const res = await request(app)
        .post("/api/menu/categories")
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
