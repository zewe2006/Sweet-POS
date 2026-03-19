import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertMenuCategorySchema,
  insertMenuItemSchema,
  insertModifierGroupSchema,
  insertModifierSchema,
  insertPrinterSchema,
  insertPromotionSchema,
  insertCustomerSchema,
  insertGiftCardSchema,
  insertRewardConfigSchema,
  insertCustomerTransactionSchema,
  insertLocationSchema,
  insertUserSchema,
} from "@shared/schema";
import { log } from "./index";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ============ MENU ============

  // GET /api/menu/categories - list all active categories
  app.get("/api/menu/categories", async (_req, res) => {
    const categories = await storage.getMenuCategories();
    res.json(categories.filter((c) => c.isActive));
  });

  // GET /api/menu/items?categoryId= - list items, optionally by category
  app.get("/api/menu/items", async (req, res) => {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const items = await storage.getMenuItems(categoryId);
    res.json(items);
  });

  // GET /api/menu/modifiers - list all modifier groups with their modifiers
  app.get("/api/menu/modifiers", async (_req, res) => {
    const groups = await storage.getModifierGroups();
    const allModifiers = await storage.getModifiers();
    const result = groups.map((g) => ({
      ...g,
      modifiers: allModifiers.filter((m) => m.groupId === g.id),
    }));
    res.json(result);
  });

  // POST /api/menu/categories - create category
  app.post("/api/menu/categories", async (req, res) => {
    const parsed = insertMenuCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    }
    const category = await storage.createMenuCategory(parsed.data);
    res.status(201).json(category);
  });

  // POST /api/menu/items - create item
  app.post("/api/menu/items", async (req, res) => {
    const parsed = insertMenuItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    }
    const item = await storage.createMenuItem(parsed.data);
    res.status(201).json(item);
  });

  // PATCH /api/menu/items/:id - update item
  app.patch("/api/menu/items/:id", async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getMenuItem(id);
    if (!existing) return res.status(404).json({ message: "Item not found" });
    const updated = await storage.updateMenuItem(id, req.body);
    res.json(updated);
  });

  // POST /api/menu/modifier-groups - create modifier group
  app.post("/api/menu/modifier-groups", async (req, res) => {
    const parsed = insertModifierGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    }
    const group = await storage.createModifierGroup(parsed.data);
    res.status(201).json(group);
  });

  // PATCH /api/menu/modifier-groups/:id - update modifier group
  app.patch("/api/menu/modifier-groups/:id", async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getModifierGroup(id);
    if (!existing) return res.status(404).json({ message: "Modifier group not found" });
    const updated = await storage.updateModifierGroup(id, req.body);
    res.json(updated);
  });

  // POST /api/menu/modifiers - create modifier option
  app.post("/api/menu/modifiers", async (req, res) => {
    const parsed = insertModifierSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    }
    const modifier = await storage.createModifier(parsed.data);
    res.status(201).json(modifier);
  });

  // PATCH /api/menu/modifiers/:id - update modifier option
  app.patch("/api/menu/modifiers/:id", async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getModifier(id);
    if (!existing) return res.status(404).json({ message: "Modifier not found" });
    const updated = await storage.updateModifier(id, req.body);
    res.json(updated);
  });

  // POST /api/upload - upload image (stores as base64 data URL)
  app.post("/api/upload", async (req, res) => {
    const { data, filename } = req.body;
    if (!data) return res.status(400).json({ message: "No image data provided" });
    // data is expected to be a base64 data URL like "data:image/png;base64,..."
    res.json({ url: data, filename });
  });

  // ============ ORDERS ============

  // GET /api/orders?locationId=&status=
  app.get("/api/orders", async (req, res) => {
    const locationId = req.query.locationId ? Number(req.query.locationId) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const orders = await storage.getOrders(locationId, status);
    res.json(orders);
  });

  // GET /api/orders/queue/:locationId - kitchen display queue
  app.get("/api/orders/queue/:locationId", async (req, res) => {
    const locationId = Number(req.params.locationId);
    const all = await storage.getOrders(locationId);
    const queue = all.filter((o) => o.status === "preparing" || o.status === "ready");
    // attach items to each order
    const result = await Promise.all(
      queue.map(async (o) => ({
        ...o,
        items: await storage.getOrderItems(o.id),
      }))
    );
    res.json(result);
  });

  // GET /api/orders/:id - single order with items
  app.get("/api/orders/:id", async (req, res) => {
    const id = Number(req.params.id);
    const order = await storage.getOrder(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const items = await storage.getOrderItems(id);
    res.json({ ...order, items });
  });

  // POST /api/orders - create order with items
  const createOrderSchema = z.object({
    locationId: z.number(),
    source: z.string().default("pos"),
    type: z.string().default("dine_in"),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    items: z.array(
      z.object({
        menuItemId: z.number(),
        quantity: z.number().min(1).default(1),
        modifiers: z.array(z.object({ name: z.string(), price: z.number() })).default([]),
        notes: z.string().optional(),
      })
    ).min(1),
    paymentMethod: z.string().optional(),
    notes: z.string().optional(),
  });

  app.post("/api/orders", async (req, res) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid order data", errors: parsed.error.flatten() });
    }
    const data = parsed.data;

    // Resolve menu items and compute subtotal
    let subtotal = 0;
    const resolvedItems: {
      menuItemId: number;
      name: string;
      quantity: number;
      unitPrice: number;
      modifiers: { name: string; price: number }[];
      notes: string | null;
      prepStation: string;
    }[] = [];

    for (const item of data.items) {
      const menuItem = await storage.getMenuItem(item.menuItemId);
      if (!menuItem) {
        return res.status(400).json({ message: `Menu item ${item.menuItemId} not found` });
      }
      const modTotal = item.modifiers.reduce((sum, m) => sum + m.price, 0);
      const lineTotal = (menuItem.price + modTotal) * item.quantity;
      subtotal += lineTotal;
      resolvedItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        modifiers: item.modifiers,
        notes: item.notes ?? null,
        prepStation: menuItem.prepStation ?? "kitchen",
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;

    // Use location-specific tax rate
    const loc = await storage.getLocation(data.locationId);
    const taxRate = loc?.taxRate ?? 0.08;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const orderNumber = await storage.getNextOrderNumber(data.locationId);

    const order = await storage.createOrder({
      locationId: data.locationId,
      orderNumber,
      source: data.source,
      type: data.type,
      customerName: data.customerName ?? null,
      customerPhone: data.customerPhone ?? null,
      subtotal,
      tax,
      tip: 0,
      total,
      paymentMethod: data.paymentMethod ?? null,
      paymentIntentId: null,
      notes: data.notes ?? null,
      externalOrderId: null,
      // POS orders with payment go to "closed"; unpaid POS orders are "open"
      // external/app orders start as "pending" for confirmation
      status: data.source === "pos"
        ? (data.paymentMethod && data.paymentMethod !== "unpaid" ? "closed" : "open")
        : "pending",
    });

    // Create order items
    const orderItemResults = [];
    for (const ri of resolvedItems) {
      const oi = await storage.createOrderItem({
        orderId: order.id,
        menuItemId: ri.menuItemId,
        name: ri.name,
        quantity: ri.quantity,
        unitPrice: ri.unitPrice,
        modifiers: ri.modifiers,
        notes: ri.notes,
        prepStation: ri.prepStation,
      });
      orderItemResults.push(oi);
    }

    res.status(201).json({ ...order, items: orderItemResults });
  });

  // PATCH /api/orders/:id/status - update order status
  app.patch("/api/orders/:id/status", async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;
    const validStatuses = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled", "open", "closed"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }
    const order = await storage.updateOrderStatus(id, status);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  });

  // ============ STRIPE TERMINAL (Mock) ============

  app.post("/api/stripe/connection-token", async (_req, res) => {
    res.json({ secret: "pst_test_mock_connection_token_" + Date.now() });
  });

  app.post("/api/stripe/payment-intent", async (req, res) => {
    const { amount } = req.body;
    if (!amount || typeof amount !== "number") {
      return res.status(400).json({ message: "amount is required (in cents)" });
    }
    res.json({
      id: "pi_mock_" + Date.now(),
      amount,
      currency: "usd",
      status: "requires_capture",
    });
  });

  app.post("/api/stripe/capture", async (req, res) => {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ message: "paymentIntentId is required" });
    }
    res.json({
      id: paymentIntentId,
      status: "succeeded",
      captured: true,
    });
  });

  // ============ DELIVERY WEBHOOKS ============

  app.post("/api/webhooks/ubereats", async (req, res) => {
    log("Uber Eats webhook received", "webhook");
    try {
      const body = req.body;
      // Normalize Uber Eats payload to our order format
      const orderNumber = await storage.getNextOrderNumber(1); // default to location 1
      const items = (body.items || body.cart?.items || []).map((item: any) => ({
        menuItemId: 1, // placeholder - would need mapping in production
        name: item.title || item.name || "Unknown Item",
        quantity: item.quantity || 1,
        unitPrice: (item.price?.amount || item.price || 0) / 100,
        modifiers: [],
        notes: item.special_instructions || null,
        prepStation: "kitchen",
      }));

      const subtotal = items.reduce((sum: number, i: any) => sum + i.unitPrice * i.quantity, 0);
      const tax = Math.round(subtotal * 0.08 * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;

      const order = await storage.createOrder({
        locationId: 1,
        orderNumber,
        source: "ubereats",
        externalOrderId: body.id || body.order_id || `ue-${Date.now()}`,
        status: "pending",
        type: "delivery",
        customerName: body.eater?.first_name || body.customer?.name || null,
        customerPhone: null,
        subtotal: Math.round(subtotal * 100) / 100,
        tax,
        tip: 0,
        total,
        paymentMethod: "external",
        paymentIntentId: null,
        notes: body.special_instructions || null,
      });

      for (const item of items) {
        await storage.createOrderItem({
          orderId: order.id,
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          modifiers: item.modifiers,
          notes: item.notes,
          prepStation: item.prepStation,
        });
      }

      log(`Uber Eats order created: ${order.orderNumber}`, "webhook");
    } catch (e) {
      log(`Uber Eats webhook error: ${e}`, "webhook");
    }
    res.status(200).json({ status: "ok" });
  });

  app.post("/api/webhooks/doordash", async (req, res) => {
    log("DoorDash webhook received", "webhook");
    try {
      const body = req.body;
      const orderNumber = await storage.getNextOrderNumber(1);
      const items = (body.order_items || body.items || []).map((item: any) => ({
        menuItemId: 1,
        name: item.name || "Unknown Item",
        quantity: item.quantity || 1,
        unitPrice: (item.price || 0) / 100,
        modifiers: [],
        notes: item.special_instructions || null,
        prepStation: "kitchen",
      }));

      const subtotal = items.reduce((sum: number, i: any) => sum + i.unitPrice * i.quantity, 0);
      const tax = Math.round(subtotal * 0.08 * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;

      const order = await storage.createOrder({
        locationId: 1,
        orderNumber,
        source: "doordash",
        externalOrderId: body.delivery_id || body.id || `dd-${Date.now()}`,
        status: "pending",
        type: "delivery",
        customerName: body.customer?.first_name || body.consumer?.name || null,
        customerPhone: body.customer?.phone_number || null,
        subtotal: Math.round(subtotal * 100) / 100,
        tax,
        tip: 0,
        total,
        paymentMethod: "external",
        paymentIntentId: null,
        notes: body.special_instructions || null,
      });

      for (const item of items) {
        await storage.createOrderItem({
          orderId: order.id,
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          modifiers: item.modifiers,
          notes: item.notes,
          prepStation: item.prepStation,
        });
      }

      log(`DoorDash order created: ${order.orderNumber}`, "webhook");
    } catch (e) {
      log(`DoorDash webhook error: ${e}`, "webhook");
    }
    res.status(200).json({ status: "ok" });
  });

  // ============ LOCATIONS ============

  app.get("/api/locations", async (_req, res) => {
    const locations = await storage.getLocations();
    res.json(locations);
  });

  app.get("/api/locations/:id", async (req, res) => {
    const id = Number(req.params.id);
    const location = await storage.getLocation(id);
    if (!location) return res.status(404).json({ message: "Location not found" });
    res.json(location);
  });

  app.post("/api/locations", async (req, res) => {
    const parsed = insertLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    }
    const location = await storage.createLocation(parsed.data);
    log(`Location created: ${location.name}`, "settings");
    res.status(201).json(location);
  });

  app.patch("/api/locations/:id", async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getLocation(id);
    if (!existing) return res.status(404).json({ message: "Location not found" });
    const updated = await storage.updateLocation(id, req.body);
    log(`Location updated: ${updated?.name}`, "settings");
    res.json(updated);
  });

  app.delete("/api/locations/:id", async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getLocation(id);
    if (!existing) return res.status(404).json({ message: "Location not found" });
    await storage.deleteLocation(id);
    log(`Location deleted: ${existing.name}`, "settings");
    res.json({ success: true });
  });

  // ============ PRINTERS ============

  app.get("/api/printers", async (req, res) => {
    const locationId = req.query.locationId ? Number(req.query.locationId) : undefined;
    const printers = await storage.getPrinters(locationId);
    res.json(printers);
  });

  app.post("/api/printers", async (req, res) => {
    const parsed = insertPrinterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    }
    const printer = await storage.createPrinter(parsed.data);
    log(`Printer created: ${printer.name}`, "settings");
    res.status(201).json(printer);
  });

  app.patch("/api/printers/:id", async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getPrinter(id);
    if (!existing) return res.status(404).json({ message: "Printer not found" });
    const updated = await storage.updatePrinter(id, req.body);
    res.json(updated);
  });

  app.delete("/api/printers/:id", async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getPrinter(id);
    if (!existing) return res.status(404).json({ message: "Printer not found" });
    await storage.deletePrinter(id);
    log(`Printer deleted: ${existing.name}`, "settings");
    res.json({ success: true });
  });

  // ============ USERS ============

  app.get("/api/users", async (_req, res) => {
    const users = await storage.getUsers();
    // Strip passwords from response
    const safeUsers = users.map(({ password: _, ...u }) => u);
    res.json(safeUsers);
  });

  app.get("/api/users/:id", async (req, res) => {
    const id = Number(req.params.id);
    const user = await storage.getUser(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/users", async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    }
    // Check for duplicate username
    const existing = await storage.getUserByUsername(parsed.data.username);
    if (existing) {
      return res.status(409).json({ message: "Username already exists" });
    }
    const user = await storage.createUser(parsed.data);
    const { password: _, ...safeUser } = user;
    log(`User created: ${user.name} (${user.role})`, "settings");
    res.status(201).json(safeUser);
  });

  app.patch("/api/users/:id", async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getUser(id);
    if (!existing) return res.status(404).json({ message: "User not found" });
    // If changing username, check for uniqueness
    if (req.body.username && req.body.username !== existing.username) {
      const dup = await storage.getUserByUsername(req.body.username);
      if (dup) return res.status(409).json({ message: "Username already exists" });
    }
    const updated = await storage.updateUser(id, req.body);
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safeUser } = updated;
    log(`User updated: ${updated.name}`, "settings");
    res.json(safeUser);
  });

  app.delete("/api/users/:id", async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getUser(id);
    if (!existing) return res.status(404).json({ message: "User not found" });
    await storage.deleteUser(id);
    log(`User deleted: ${existing.name}`, "settings");
    res.json({ success: true });
  });

  // ============ SHIFTS (Clock In/Out) ============

  // GET /api/shifts?locationId=&userId= - list shifts
  app.get("/api/shifts", async (req, res) => {
    const locationId = req.query.locationId ? Number(req.query.locationId) : undefined;
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const shifts = await storage.getShifts(locationId, userId);
    res.json(shifts);
  });

  // GET /api/shifts/active/:userId - get active shift for user
  app.get("/api/shifts/active/:userId", async (req, res) => {
    const userId = Number(req.params.userId);
    const shift = await storage.getActiveShift(userId);
    res.json(shift || null);
  });

  // POST /api/shifts/clock-in - clock in
  app.post("/api/shifts/clock-in", async (req, res) => {
    const { userId, locationId } = req.body;
    if (!userId || !locationId) {
      return res.status(400).json({ message: "userId and locationId are required" });
    }

    // Check if user already has an active shift
    const activeShift = await storage.getActiveShift(userId);
    if (activeShift) {
      return res.status(400).json({ message: "User already has an active shift. Clock out first." });
    }

    const shift = await storage.createShift({
      userId,
      locationId,
      clockIn: new Date(),
      status: "active",
    });

    log(`User ${userId} clocked in at location ${locationId}`, "shift");
    res.status(201).json(shift);
  });

  // POST /api/shifts/clock-out/:userId - clock out
  app.post("/api/shifts/clock-out/:userId", async (req, res) => {
    const userId = Number(req.params.userId);
    const { breakMinutes, notes } = req.body;

    const activeShift = await storage.getActiveShift(userId);
    if (!activeShift) {
      return res.status(400).json({ message: "No active shift found for this user" });
    }

    const clockOut = new Date();
    const clockIn = new Date(activeShift.clockIn);
    const diffMs = clockOut.getTime() - clockIn.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const breakHours = (breakMinutes || 0) / 60;
    const totalHours = Math.round((diffHours - breakHours) * 100) / 100;

    const updated = await storage.updateShift(activeShift.id, {
      clockOut,
      status: "completed",
      totalHours: Math.max(0, totalHours),
      breakMinutes: breakMinutes || 0,
      notes: notes || null,
    });

    log(`User ${userId} clocked out. Total hours: ${totalHours}`, "shift");
    res.json(updated);
  });

  // ============ SETTLEMENTS (End-of-Day) ============

  // GET /api/settlements?locationId= - list settlement history
  app.get("/api/settlements", async (req, res) => {
    const locationId = req.query.locationId ? Number(req.query.locationId) : undefined;
    const settlements = await storage.getSettlements(locationId);
    res.json(settlements);
  });

  // GET /api/settlements/:id - single settlement
  app.get("/api/settlements/:id", async (req, res) => {
    const id = Number(req.params.id);
    const settlement = await storage.getSettlement(id);
    if (!settlement) return res.status(404).json({ message: "Settlement not found" });
    res.json(settlement);
  });

  // GET /api/settlements/check/:locationId/:date - check if day is already closed
  app.get("/api/settlements/check/:locationId/:date", async (req, res) => {
    const locationId = Number(req.params.locationId);
    const date = req.params.date;
    const existing = await storage.getSettlementByDate(locationId, date);
    res.json({ closed: !!existing, settlement: existing || null });
  });

  // GET /api/settlements/preview/:locationId/:date - generate Z-report preview (before closing)
  app.get("/api/settlements/preview/:locationId/:date", async (req, res) => {
    const locationId = Number(req.params.locationId);
    const date = req.params.date;

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Get all orders for the day
    const allOrders = await storage.getOrders(locationId);
    const dayOrders = allOrders.filter((o) => {
      if (!o.createdAt) return false;
      const t = new Date(o.createdAt).getTime();
      return t >= dayStart.getTime() && t <= dayEnd.getTime();
    });

    const completedOrders = dayOrders.filter((o) => o.status !== "cancelled");
    const cancelledOrders = dayOrders.filter((o) => o.status === "cancelled");

    const cashOrders = completedOrders.filter((o) => o.paymentMethod === "cash");
    const cardOrders = completedOrders.filter((o) => o.paymentMethod === "stripe");
    const giftCardOrders = completedOrders.filter((o) => o.paymentMethod === "gift_card");
    const externalOrders = completedOrders.filter((o) => o.paymentMethod === "external");

    const sum = (arr: typeof completedOrders) => Math.round(arr.reduce((s, o) => s + o.total, 0) * 100) / 100;
    const sumField = (arr: typeof completedOrders, field: "tax" | "tip" | "subtotal") =>
      Math.round(arr.reduce((s, o) => s + (o[field] || 0), 0) * 100) / 100;

    // Get shifts for the day
    const allShifts = await storage.getShifts(locationId);
    const dayShifts = allShifts.filter((s) => {
      if (!s.clockIn) return false;
      const t = new Date(s.clockIn).getTime();
      return t >= dayStart.getTime() && t <= dayEnd.getTime();
    });

    const activeShifts = dayShifts.filter((s) => s.status === "active");
    const totalLaborHours = Math.round(dayShifts.reduce((s, sh) => s + (sh.totalHours || 0), 0) * 100) / 100;

    // Check for unfulfilled orders
    const unfulfilledOrders = dayOrders.filter((o) => o.status === "preparing" || o.status === "pending" || o.status === "confirmed" || o.status === "open");

    // Get cash drawer transactions for the day
    const cashDrawerTxns = await storage.getCashDrawerTransactions(locationId, date);
    const totalCashIn = Math.round(cashDrawerTxns.filter(t => t.type === "cash_in").reduce((s, t) => s + t.amount, 0) * 100) / 100;
    const totalCashOut = Math.round(cashDrawerTxns.filter(t => t.type === "cash_out").reduce((s, t) => s + t.amount, 0) * 100) / 100;

    res.json({
      date,
      locationId,
      totalOrders: completedOrders.length,
      totalRevenue: sum(completedOrders),
      totalTax: sumField(completedOrders, "tax"),
      totalTips: sumField(completedOrders, "tip"),
      cashSales: sum(cashOrders),
      cardSales: sum(cardOrders),
      giftCardSales: sum(giftCardOrders),
      externalSales: sum(externalOrders),
      cancelledOrders: cancelledOrders.length,
      totalRefunds: sum(cancelledOrders),
      totalLaborHours,
      activeShifts: activeShifts.length,
      unfulfilledOrders: unfulfilledOrders.length,
      // For cash reconciliation: expected = starting cash + cash sales + cash in - cash out
      expectedCashFromSales: sum(cashOrders),
      totalCashIn,
      totalCashOut,
    });
  });

  // POST /api/settlements - close the day
  app.post("/api/settlements", async (req, res) => {
    const { locationId, date, closedBy, closedByName, startingCash, actualCash, notes, ...rest } = req.body;
    if (!locationId || !date) {
      return res.status(400).json({ message: "locationId and date are required" });
    }

    // Check if already closed
    const existing = await storage.getSettlementByDate(locationId, date);
    if (existing) {
      return res.status(409).json({ message: "This day has already been closed", settlement: existing });
    }

    // Re-calculate from orders to prevent tampering
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const allOrders = await storage.getOrders(locationId);
    const dayOrders = allOrders.filter((o) => {
      if (!o.createdAt) return false;
      const t = new Date(o.createdAt).getTime();
      return t >= dayStart.getTime() && t <= dayEnd.getTime();
    });

    const completedOrders = dayOrders.filter((o) => o.status !== "cancelled");
    const cancelledOrders = dayOrders.filter((o) => o.status === "cancelled");

    const cashOrders = completedOrders.filter((o) => o.paymentMethod === "cash");
    const cardOrders = completedOrders.filter((o) => o.paymentMethod === "stripe");
    const giftCardOrders = completedOrders.filter((o) => o.paymentMethod === "gift_card");
    const externalOrders = completedOrders.filter((o) => o.paymentMethod === "external");

    const sum = (arr: typeof completedOrders) => Math.round(arr.reduce((s, o) => s + o.total, 0) * 100) / 100;
    const sumField = (arr: typeof completedOrders, field: "tax" | "tip") =>
      Math.round(arr.reduce((s, o) => s + (o[field] || 0), 0) * 100) / 100;

    const cashSalesTotal = sum(cashOrders);
    const startCash = startingCash ?? 200;

    // Factor in cash drawer transactions
    const cashDrawerTxns = await storage.getCashDrawerTransactions(locationId, date);
    const totalCashIn = Math.round(cashDrawerTxns.filter(t => t.type === "cash_in").reduce((s, t) => s + t.amount, 0) * 100) / 100;
    const totalCashOut = Math.round(cashDrawerTxns.filter(t => t.type === "cash_out").reduce((s, t) => s + t.amount, 0) * 100) / 100;

    const expectedCash = Math.round((startCash + cashSalesTotal + totalCashIn - totalCashOut) * 100) / 100;
    const actual = actualCash ?? expectedCash;
    const diff = Math.round((actual - expectedCash) * 100) / 100;

    // Get labor data
    const allShifts = await storage.getShifts(locationId);
    const dayShifts = allShifts.filter((s) => {
      if (!s.clockIn) return false;
      const t = new Date(s.clockIn).getTime();
      return t >= dayStart.getTime() && t <= dayEnd.getTime();
    });
    const totalLaborHours = Math.round(dayShifts.reduce((s, sh) => s + (sh.totalHours || 0), 0) * 100) / 100;

    const settlement = await storage.createSettlement({
      locationId,
      date,
      closedBy: closedBy ?? null,
      closedByName: closedByName ?? null,
      startingCash: startCash,
      expectedCash,
      actualCash: actual,
      cashDifference: diff,
      totalOrders: completedOrders.length,
      totalRevenue: sum(completedOrders),
      totalTax: sumField(completedOrders, "tax"),
      totalTips: sumField(completedOrders, "tip"),
      cashSales: cashSalesTotal,
      cardSales: sum(cardOrders),
      giftCardSales: sum(giftCardOrders),
      externalSales: sum(externalOrders),
      totalRefunds: sum(cancelledOrders),
      cancelledOrders: cancelledOrders.length,
      totalLaborHours,
      totalLaborCost: 0, // can be calculated if hourly rates are set
      notes: notes ?? null,
      status: "closed",
    });

    res.status(201).json(settlement);
  });

  // ============ CASH DRAWER TRANSACTIONS ============

  // GET /api/cash-drawer?locationId=&date= - get transactions for a day
  app.get("/api/cash-drawer", async (req, res) => {
    const locationId = Number(req.query.locationId);
    const date = String(req.query.date || new Date().toISOString().split("T")[0]);
    if (!locationId) return res.status(400).json({ message: "locationId is required" });
    const transactions = await storage.getCashDrawerTransactions(locationId, date);
    res.json(transactions);
  });

  // POST /api/cash-drawer - add a cash in or cash out
  app.post("/api/cash-drawer", async (req, res) => {
    const { locationId, type, amount, reason, performedBy, notes, date } = req.body;
    if (!locationId || !type || !amount || !reason) {
      return res.status(400).json({ message: "locationId, type, amount, and reason are required" });
    }
    if (type !== "cash_in" && type !== "cash_out") {
      return res.status(400).json({ message: "type must be 'cash_in' or 'cash_out'" });
    }
    const txn = await storage.createCashDrawerTransaction({
      locationId,
      type,
      amount: Math.abs(amount),
      reason,
      performedBy: performedBy || null,
      notes: notes || null,
      date: date || new Date().toISOString().split("T")[0],
    });
    res.status(201).json(txn);
  });

  // DELETE /api/cash-drawer/:id - remove a transaction (void)
  app.delete("/api/cash-drawer/:id", async (req, res) => {
    const id = Number(req.params.id);
    const deleted = await storage.deleteCashDrawerTransaction(id);
    if (!deleted) return res.status(404).json({ message: "Transaction not found" });
    res.json({ success: true });
  });

  // ============ REPORTS ============

  app.get("/api/reports/daily", async (req, res) => {
    const locationId = Number(req.query.locationId);
    const date = String(req.query.date || new Date().toISOString().split("T")[0]);
    if (!locationId) return res.status(400).json({ message: "locationId is required" });
    const sales = await storage.getDailySales(locationId, date);
    res.json(sales);
  });

  app.get("/api/reports/hourly", async (req, res) => {
    const locationId = Number(req.query.locationId);
    const date = String(req.query.date || new Date().toISOString().split("T")[0]);
    if (!locationId) return res.status(400).json({ message: "locationId is required" });

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const orders = await storage.getOrders(locationId);
    const dayOrders = orders.filter((o) => {
      if (!o.createdAt) return false;
      const t = new Date(o.createdAt).getTime();
      return t >= dayStart.getTime() && t <= dayEnd.getTime();
    });

    // Group by hour
    const hourly: Record<number, { hour: number; orders: number; revenue: number }> = {};
    for (let h = 0; h < 24; h++) {
      hourly[h] = { hour: h, orders: 0, revenue: 0 };
    }
    for (const o of dayOrders) {
      const h = new Date(o.createdAt!).getHours();
      hourly[h].orders++;
      hourly[h].revenue = Math.round((hourly[h].revenue + o.total) * 100) / 100;
    }

    res.json(Object.values(hourly));
  });

  // GET /api/reports/dashboard - full dashboard data for date range
  app.get("/api/reports/dashboard", async (req, res) => {
    const locationId = Number(req.query.locationId);
    const startDate = String(req.query.startDate || new Date().toISOString().split("T")[0]);
    const endDate = String(req.query.endDate || startDate);
    if (!locationId) return res.status(400).json({ message: "locationId is required" });
    const data = await storage.getReportDashboard(locationId, startDate, endDate);
    res.json(data);
  });

  // GET /api/reports/sales - sales breakdown for date range
  app.get("/api/reports/sales", async (req, res) => {
    const locationId = Number(req.query.locationId);
    const startDate = String(req.query.startDate || new Date().toISOString().split("T")[0]);
    const endDate = String(req.query.endDate || startDate);
    if (!locationId) return res.status(400).json({ message: "locationId is required" });
    const data = await storage.getReportSales(locationId, startDate, endDate);
    res.json(data);
  });

  // GET /api/reports/product-mix - product performance for date range
  app.get("/api/reports/product-mix", async (req, res) => {
    const locationId = Number(req.query.locationId);
    const startDate = String(req.query.startDate || new Date().toISOString().split("T")[0]);
    const endDate = String(req.query.endDate || startDate);
    if (!locationId) return res.status(400).json({ message: "locationId is required" });
    const data = await storage.getReportProductMix(locationId, startDate, endDate);
    res.json(data);
  });

  // GET /api/reports/labor - labor analytics for date range
  app.get("/api/reports/labor", async (req, res) => {
    const locationId = Number(req.query.locationId);
    const startDate = String(req.query.startDate || new Date().toISOString().split("T")[0]);
    const endDate = String(req.query.endDate || startDate);
    if (!locationId) return res.status(400).json({ message: "locationId is required" });
    const data = await storage.getReportLabor(locationId, startDate, endDate);
    res.json(data);
  });

  // GET /api/reports/customers - customer analytics for date range
  app.get("/api/reports/customers", async (req, res) => {
    const locationId = Number(req.query.locationId);
    const startDate = String(req.query.startDate || new Date().toISOString().split("T")[0]);
    const endDate = String(req.query.endDate || startDate);
    if (!locationId) return res.status(400).json({ message: "locationId is required" });
    const data = await storage.getReportCustomers(locationId, startDate, endDate);
    res.json(data);
  });

  // ============ PROMOTIONS ============

  app.get("/api/promotions", async (_req, res) => {
    const promotions = await storage.getPromotions();
    res.json(promotions);
  });

  app.post("/api/promotions", async (req, res) => {
    const parsed = insertPromotionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    }
    const promo = await storage.createPromotion(parsed.data);
    res.status(201).json(promo);
  });

  app.patch("/api/promotions/:id", async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getPromotion(id);
    if (!existing) return res.status(404).json({ message: "Promotion not found" });
    const updated = await storage.updatePromotion(id, req.body);
    res.json(updated);
  });

  // ============ PRINTER & CASH DRAWER CONTROL ============

  // POST /api/print/receipt - send receipt to receipt printer + kick cash drawer
  app.post("/api/print/receipt", async (req, res) => {
    const { locationId, orderId, openDrawer } = req.body;
    if (!locationId || !orderId) {
      return res.status(400).json({ message: "locationId and orderId are required" });
    }
    const order = await storage.getOrder(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const items = await storage.getOrderItems(orderId);
    const printerList = await storage.getPrinters(locationId);
    const receiptPrinter = printerList.find((p) => p.type === "receipt" && p.isActive);

    if (!receiptPrinter) {
      return res.status(404).json({ message: "No active receipt printer found for this location" });
    }

    // Get location for receipt customization
    const loc = await storage.getLocation(locationId);

    // ESC/POS commands (would be sent over TCP to printer IP in production)
    const escposCommands = {
      printer: { ip: receiptPrinter.ipAddress, port: receiptPrinter.port },
      commands: [
        { type: "initialize", hex: "1B40" }, // ESC @ - Initialize printer
        { type: "center", hex: "1B6101" }, // ESC a 1 - Center align
        { type: "bold_on", hex: "1B4501" }, // ESC E 1 - Bold on
        { type: "text", value: loc?.receiptHeader || "SWEET HUT BAKERY & CAFE" },
        { type: "bold_off", hex: "1B4500" },
        { type: "text", value: order.orderNumber },
        { type: "text", value: new Date().toLocaleString() },
        { type: "text", value: "--------------------------------" },
        { type: "left", hex: "1B6100" }, // ESC a 0 - Left align
        ...items.map((item) => ({
          type: "line_item" as const,
          value: `${item.quantity}x ${item.name}`,
          price: `$${(item.unitPrice * (item.quantity || 1)).toFixed(2)}`,
          modifiers: (item.modifiers as Array<{name: string, price: number}>)?.map((m) => `  + ${m.name}`).join("\n") || "",
        })),
        { type: "text", value: "--------------------------------" },
        { type: "text", value: `Subtotal: $${order.subtotal.toFixed(2)}` },
        { type: "text", value: `${loc?.taxName || "Tax"}: $${order.tax.toFixed(2)}` },
        ...(order.tip && order.tip > 0 ? [{ type: "text" as const, value: `Tip: $${order.tip.toFixed(2)}` }] : []),
        { type: "bold_on", hex: "1B4501" },
        { type: "text", value: `TOTAL: $${order.total.toFixed(2)}` },
        { type: "bold_off", hex: "1B4500" },
        { type: "text", value: `Payment: ${order.paymentMethod?.toUpperCase() || "N/A"}` },
        { type: "center", hex: "1B6101" },
        { type: "text", value: `\n${loc?.receiptFooter || "Thank you for visiting Sweet Hut!"}` },
        { type: "feed_cut", hex: "1B6402" }, // Feed 2 lines + cut
        { type: "cut", hex: "1D5641" }, // GS V A - Partial cut
        // Cash drawer kick command - sent AFTER receipt prints
        ...(openDrawer ? [{ type: "drawer_kick" as const, hex: "1B700019FA", description: "ESC p 0 25 250 - Kick cash drawer pin 2" }] : []),
      ],
    };

    log(`Receipt print job queued for order ${order.orderNumber} at printer ${receiptPrinter.ipAddress}${openDrawer ? ' + cash drawer kick' : ''}`, "print");
    res.json({ success: true, printer: receiptPrinter.name, commands: escposCommands });
  });

  // POST /api/print/kitchen - send kitchen ticket to kitchen printer
  app.post("/api/print/kitchen", async (req, res) => {
    const { locationId, orderId } = req.body;
    if (!locationId || !orderId) {
      return res.status(400).json({ message: "locationId and orderId are required" });
    }
    const order = await storage.getOrder(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const items = await storage.getOrderItems(orderId);
    const printerList = await storage.getPrinters(locationId);
    const kitchenPrinter = printerList.find((p) => p.type === "kitchen" && p.isActive);

    if (!kitchenPrinter) {
      return res.status(404).json({ message: "No active kitchen printer found" });
    }

    const kitchenItems = items.filter((i) => i.prepStation === "kitchen" || i.prepStation === "bakery");

    const escposCommands = {
      printer: { ip: kitchenPrinter.ipAddress, port: kitchenPrinter.port },
      commands: [
        { type: "initialize", hex: "1B40" },
        { type: "double_height", hex: "1B2111" }, // Double height text
        { type: "text", value: `ORDER: ${order.orderNumber}` },
        { type: "normal", hex: "1B2100" },
        { type: "text", value: `Type: ${order.type?.toUpperCase()} | Source: ${order.source?.toUpperCase()}` },
        { type: "text", value: `Time: ${new Date().toLocaleTimeString()}` },
        { type: "text", value: order.customerName ? `Customer: ${order.customerName}` : "" },
        { type: "text", value: "================================" },
        ...kitchenItems.map((item) => ({
          type: "kitchen_item" as const,
          value: `${item.quantity}x ${item.name}`,
          modifiers: (item.modifiers as Array<{name: string, price: number}>)?.map((m) => `  >> ${m.name}`).join("\n") || "",
          notes: item.notes ? `  ** ${item.notes}` : "",
        })),
        { type: "text", value: "================================" },
        ...(order.notes ? [{ type: "text" as const, value: `NOTES: ${order.notes}` }] : []),
        { type: "feed_cut", hex: "1B6404" },
        { type: "cut", hex: "1D5641" },
      ],
    };

    log(`Kitchen ticket queued for order ${order.orderNumber} at printer ${kitchenPrinter.ipAddress}`, "print");
    res.json({ success: true, printer: kitchenPrinter.name, commands: escposCommands });
  });

  // POST /api/print/packing - send packing slip to packing printer
  app.post("/api/print/packing", async (req, res) => {
    const { locationId, orderId } = req.body;
    if (!locationId || !orderId) {
      return res.status(400).json({ message: "locationId and orderId are required" });
    }
    const order = await storage.getOrder(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const items = await storage.getOrderItems(orderId);
    const printerList = await storage.getPrinters(locationId);
    const packingPrinter = printerList.find((p) => p.type === "packing" && p.isActive);

    if (!packingPrinter) {
      return res.status(404).json({ message: "No active packing printer found" });
    }

    const escposCommands = {
      printer: { ip: packingPrinter.ipAddress, port: packingPrinter.port },
      commands: [
        { type: "initialize", hex: "1B40" },
        { type: "double_height", hex: "1B2111" },
        { type: "center", hex: "1B6101" },
        { type: "text", value: `PACKING SLIP` },
        { type: "text", value: order.orderNumber },
        { type: "normal", hex: "1B2100" },
        { type: "text", value: `${order.type?.toUpperCase()} | ${order.source?.toUpperCase()}` },
        { type: "left", hex: "1B6100" },
        { type: "text", value: order.customerName ? `Customer: ${order.customerName}` : "" },
        { type: "text", value: order.customerPhone ? `Phone: ${order.customerPhone}` : "" },
        { type: "text", value: "--------------------------------" },
        ...items.map((item) => ({
          type: "packing_item" as const,
          value: `[ ] ${item.quantity}x ${item.name}`,
          modifiers: (item.modifiers as Array<{name: string, price: number}>)?.map((m) => `    + ${m.name}`).join("\n") || "",
        })),
        { type: "text", value: "--------------------------------" },
        { type: "text", value: `Total items: ${items.reduce((s, i) => s + (i.quantity || 1), 0)}` },
        ...(order.notes ? [{ type: "text" as const, value: `NOTES: ${order.notes}` }] : []),
        { type: "feed_cut", hex: "1B6404" },
        { type: "cut", hex: "1D5641" },
      ],
    };

    log(`Packing slip queued for order ${order.orderNumber} at printer ${packingPrinter.ipAddress}`, "print");
    res.json({ success: true, printer: packingPrinter.name, commands: escposCommands });
  });

  // POST /api/cash-drawer/open - manually open cash drawer (manager action)
  app.post("/api/cash-drawer/open", async (req, res) => {
    const { locationId } = req.body;
    if (!locationId) return res.status(400).json({ message: "locationId is required" });
    const printerList = await storage.getPrinters(locationId);
    const receiptPrinter = printerList.find((p) => p.type === "receipt" && p.isActive);

    if (!receiptPrinter) {
      return res.status(404).json({ message: "No active receipt printer found" });
    }

    // Send ONLY the drawer kick command (no receipt)
    const escposCommands = {
      printer: { ip: receiptPrinter.ipAddress, port: receiptPrinter.port },
      commands: [
        { type: "initialize", hex: "1B40" },
        { type: "drawer_kick", hex: "1B700019FA", description: "ESC p 0 25 250 - Kick cash drawer pin 2" },
      ],
    };

    log(`Cash drawer open command sent to ${receiptPrinter.ipAddress}`, "print");
    res.json({ success: true, printer: receiptPrinter.name, commands: escposCommands });
  });

  // ============ AUTH ============

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    const user = await storage.getUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "Account is disabled" });
    }
    // Update last login
    await storage.updateUser(user.id, { lastLogin: new Date() } as any);
    // Return user without password
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.get("/api/auth/me", async (req, res) => {
    // Simple header-based auth: X-User-Id header
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(Number(userId));
    if (!user) return res.status(401).json({ message: "User not found" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // ============ CUSTOMERS ============

  // Lookup routes BEFORE /:id to prevent Express treating "lookup" as an id
  app.get("/api/customers/lookup/phone/:phone", async (req, res) => {
    const customer = await storage.getCustomerByPhone(req.params.phone);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  });

  app.get("/api/customers/lookup/email/:email", async (req, res) => {
    const customer = await storage.getCustomerByEmail(req.params.email);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  });

  app.get("/api/customers", async (req, res) => {
    const search = req.query.search ? String(req.query.search) : undefined;
    const customers = await storage.getCustomers(search);
    res.json(customers);
  });

  app.get("/api/customers/:id", async (req, res) => {
    const id = Number(req.params.id);
    const customer = await storage.getCustomer(id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    const transactions = await storage.getCustomerTransactions(id);
    res.json({ ...customer, transactions });
  });

  app.post("/api/customers", async (req, res) => {
    const parsed = insertCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    }
    const customer = await storage.createCustomer(parsed.data);
    log(`Customer created: ${customer.name}`, "customer");
    res.status(201).json(customer);
  });

  app.patch("/api/customers/:id", async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getCustomer(id);
    if (!existing) return res.status(404).json({ message: "Customer not found" });
    const updated = await storage.updateCustomer(id, req.body);
    res.json(updated);
  });

  // ============ POINTS MANAGEMENT ============

  app.post("/api/customers/:id/earn", async (req, res) => {
    const id = Number(req.params.id);
    const { orderId, amount } = req.body;
    if (!amount || typeof amount !== "number") {
      return res.status(400).json({ message: "amount is required (dollar amount spent)" });
    }
    const customer = await storage.getCustomer(id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const config = await storage.getRewardConfig();
    // Calculate tier multiplier
    let multiplier = 1;
    if (customer.tier === "silver") multiplier = config.silverMultiplier ?? 1.25;
    else if (customer.tier === "gold") multiplier = config.goldMultiplier ?? 1.5;
    else if (customer.tier === "platinum") multiplier = config.platinumMultiplier ?? 2;

    const basePoints = Math.floor(amount * (config.pointsPerDollar ?? 1));
    const earnedPoints = Math.floor(basePoints * multiplier);

    const newPoints = (customer.rewardPoints ?? 0) + earnedPoints;
    const newLifetime = (customer.lifetimePoints ?? 0) + earnedPoints;
    const newSpend = Math.round(((customer.lifetimeSpend ?? 0) + amount) * 100) / 100;
    const newVisits = (customer.visitCount ?? 0) + 1;

    // Auto-upgrade tier based on lifetime points
    let newTier = customer.tier ?? "bronze";
    if (newLifetime >= (config.platinumThreshold ?? 5000)) newTier = "platinum";
    else if (newLifetime >= (config.goldThreshold ?? 2000)) newTier = "gold";
    else if (newLifetime >= (config.silverThreshold ?? 500)) newTier = "silver";

    await storage.updateCustomer(id, {
      rewardPoints: newPoints,
      lifetimePoints: newLifetime,
      lifetimeSpend: newSpend,
      visitCount: newVisits,
      tier: newTier,
      lastVisit: new Date(),
    });

    const txn = await storage.createCustomerTransaction({
      customerId: id,
      giftCardId: null,
      type: "earn_points",
      amount,
      points: earnedPoints,
      orderId: orderId ?? null,
      description: `Earned ${earnedPoints} points on $${amount.toFixed(2)} order${multiplier > 1 ? ` (${multiplier}x ${customer.tier} bonus)` : ""}`,
    });

    const updatedCustomer = await storage.getCustomer(id);
    log(`Customer ${customer.name} earned ${earnedPoints} points (tier: ${newTier})`, "customer");
    res.json({ customer: updatedCustomer, transaction: txn, pointsEarned: earnedPoints });
  });

  app.post("/api/customers/:id/redeem", async (req, res) => {
    const id = Number(req.params.id);
    const { points, orderId } = req.body;
    if (!points || typeof points !== "number" || points <= 0) {
      return res.status(400).json({ message: "points is required (positive integer)" });
    }
    const customer = await storage.getCustomer(id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const config = await storage.getRewardConfig();
    if (points < (config.minRedeemPoints ?? 50)) {
      return res.status(400).json({ message: `Minimum ${config.minRedeemPoints} points required to redeem` });
    }
    if (points > (customer.rewardPoints ?? 0)) {
      return res.status(400).json({ message: `Insufficient points. Customer has ${customer.rewardPoints} points` });
    }

    const dollarValue = Math.round((points / (config.pointsPerReward ?? 100)) * (config.rewardValue ?? 1) * 100) / 100;

    await storage.updateCustomer(id, {
      rewardPoints: (customer.rewardPoints ?? 0) - points,
    });

    const txn = await storage.createCustomerTransaction({
      customerId: id,
      giftCardId: null,
      type: "redeem_points",
      amount: dollarValue,
      points: -points,
      orderId: orderId ?? null,
      description: `Redeemed ${points} points for $${dollarValue.toFixed(2)} off`,
    });

    const updatedCustomer = await storage.getCustomer(id);
    log(`Customer ${customer.name} redeemed ${points} points for $${dollarValue.toFixed(2)}`, "customer");
    res.json({ customer: updatedCustomer, transaction: txn, dollarValue });
  });

  // ============ REWARD CONFIG ============

  app.get("/api/rewards/config", async (_req, res) => {
    const config = await storage.getRewardConfig();
    res.json(config);
  });

  app.patch("/api/rewards/config", async (req, res) => {
    const config = await storage.updateRewardConfig(req.body);
    log("Reward config updated", "rewards");
    res.json(config);
  });

  // ============ GIFT CARDS ============

  // Lookup by code BEFORE /:id
  app.get("/api/gift-cards/lookup/:code", async (req, res) => {
    const card = await storage.getGiftCardByCode(req.params.code);
    if (!card) return res.status(404).json({ message: "Gift card not found" });
    const transactions = await storage.getCustomerTransactions(undefined, card.id);
    res.json({ ...card, transactions });
  });

  app.get("/api/gift-cards", async (_req, res) => {
    const cards = await storage.getGiftCards();
    res.json(cards);
  });

  app.get("/api/gift-cards/:id", async (req, res) => {
    const id = Number(req.params.id);
    const card = await storage.getGiftCard(id);
    if (!card) return res.status(404).json({ message: "Gift card not found" });
    const transactions = await storage.getCustomerTransactions(undefined, id);
    res.json({ ...card, transactions });
  });

  app.post("/api/gift-cards", async (req, res) => {
    const data = { ...req.body };
    // Auto-generate code if not provided
    if (!data.code) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      data.code = `SH-${seg()}-${seg()}`;
    }
    const parsed = insertGiftCardSchema.safeParse(data);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    }
    const card = await storage.createGiftCard(parsed.data);
    log(`Gift card issued: ${card.code} ($${card.initialValue.toFixed(2)})`, "giftcard");
    res.status(201).json(card);
  });

  app.post("/api/gift-cards/:id/reload", async (req, res) => {
    const id = Number(req.params.id);
    const { amount } = req.body;
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ message: "amount is required (positive number)" });
    }
    const card = await storage.getGiftCard(id);
    if (!card) return res.status(404).json({ message: "Gift card not found" });
    if (!card.isActive) return res.status(400).json({ message: "Gift card is inactive" });

    const updated = await storage.updateGiftCardBalance(id, card.balance + amount);

    await storage.createCustomerTransaction({
      customerId: card.customerId ?? null,
      giftCardId: id,
      type: "gift_card_reload",
      amount,
      points: null,
      orderId: null,
      description: `Gift card ${card.code} reloaded with $${amount.toFixed(2)}`,
    });

    log(`Gift card ${card.code} reloaded +$${amount.toFixed(2)} (new balance: $${updated!.balance.toFixed(2)})`, "giftcard");
    res.json(updated);
  });

  app.post("/api/gift-cards/:id/use", async (req, res) => {
    const id = Number(req.params.id);
    const { amount, orderId } = req.body;
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ message: "amount is required (positive number)" });
    }
    const card = await storage.getGiftCard(id);
    if (!card) return res.status(404).json({ message: "Gift card not found" });
    if (!card.isActive) return res.status(400).json({ message: "Gift card is inactive" });
    if (card.balance < amount) {
      return res.status(400).json({ message: `Insufficient balance. Card has $${card.balance.toFixed(2)}` });
    }

    const updated = await storage.updateGiftCardBalance(id, card.balance - amount);

    await storage.createCustomerTransaction({
      customerId: card.customerId ?? null,
      giftCardId: id,
      type: "gift_card_use",
      amount: -amount,
      points: null,
      orderId: orderId ?? null,
      description: `Gift card ${card.code} used for $${amount.toFixed(2)}`,
    });

    log(`Gift card ${card.code} used $${amount.toFixed(2)} (remaining: $${updated!.balance.toFixed(2)})`, "giftcard");
    res.json(updated);
  });

  // ============ TRANSACTIONS ============

  app.get("/api/transactions", async (req, res) => {
    const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
    const giftCardId = req.query.giftCardId ? Number(req.query.giftCardId) : undefined;
    const transactions = await storage.getCustomerTransactions(customerId, giftCardId);
    res.json(transactions);
  });

  return httpServer;
}
