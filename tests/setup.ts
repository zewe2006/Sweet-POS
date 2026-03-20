import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

/**
 * Creates a fresh Express app with all routes registered.
 * Uses the real database via the singleton storage.
 */
export async function createTestApp() {
  const app = express();
  const httpServer = createServer(app);

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  await registerRoutes(httpServer, app);

  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  return { app, httpServer };
}
