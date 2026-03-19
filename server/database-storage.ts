import { eq, and, ilike, or, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  locations, printers, menuCategories, menuItems,
  modifierGroups, modifiers, orders, orderItems,
  promotions, users, customers, rewardConfig,
  giftCards, customerTransactions, shifts, settlements,
  cashDrawerTransactions,
} from "@shared/schema";
import type {
  Location, InsertLocation,
  Printer, InsertPrinter,
  MenuCategory, InsertMenuCategory,
  MenuItem, InsertMenuItem,
  ModifierGroup, InsertModifierGroup,
  Modifier, InsertModifier,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  Promotion, InsertPromotion,
  User, InsertUser,
  Customer, InsertCustomer,
  RewardConfig, InsertRewardConfig,
  GiftCard, InsertGiftCard,
  CustomerTransaction, InsertCustomerTransaction,
  Shift, InsertShift,
  Settlement, InsertSettlement,
  CashDrawerTransaction, InsertCashDrawerTransaction,
} from "@shared/schema";
import type { IStorage, DashboardReport, SalesReport, ProductMixReport, LaborReport, CustomerReport } from "./storage";

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export class DatabaseStorage implements IStorage {
  // ============ LOCATIONS ============
  async getLocations(): Promise<Location[]> {
    return db.select().from(locations);
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [loc] = await db.select().from(locations).where(eq(locations.id, id));
    return loc;
  }

  async createLocation(data: InsertLocation): Promise<Location> {
    const [loc] = await db.insert(locations).values(data).returning();
    return loc;
  }

  async updateLocation(id: number, data: Partial<InsertLocation>): Promise<Location | undefined> {
    const [loc] = await db.update(locations).set(data).where(eq(locations.id, id)).returning();
    return loc;
  }

  async deleteLocation(id: number): Promise<boolean> {
    const result = await db.delete(locations).where(eq(locations.id, id)).returning();
    return result.length > 0;
  }

  // ============ PRINTERS ============
  async getPrinters(locationId?: number): Promise<Printer[]> {
    if (locationId) {
      return db.select().from(printers).where(eq(printers.locationId, locationId));
    }
    return db.select().from(printers);
  }

  async getPrinter(id: number): Promise<Printer | undefined> {
    const [p] = await db.select().from(printers).where(eq(printers.id, id));
    return p;
  }

  async createPrinter(data: InsertPrinter): Promise<Printer> {
    const [p] = await db.insert(printers).values(data).returning();
    return p;
  }

  async updatePrinter(id: number, data: Partial<InsertPrinter>): Promise<Printer | undefined> {
    const [p] = await db.update(printers).set(data).where(eq(printers.id, id)).returning();
    return p;
  }

  async deletePrinter(id: number): Promise<boolean> {
    const result = await db.delete(printers).where(eq(printers.id, id)).returning();
    return result.length > 0;
  }

  // ============ MENU CATEGORIES ============
  async getMenuCategories(): Promise<MenuCategory[]> {
    return db.select().from(menuCategories);
  }

  async getMenuCategory(id: number): Promise<MenuCategory | undefined> {
    const [cat] = await db.select().from(menuCategories).where(eq(menuCategories.id, id));
    return cat;
  }

  async createMenuCategory(data: InsertMenuCategory): Promise<MenuCategory> {
    const [cat] = await db.insert(menuCategories).values(data).returning();
    return cat;
  }

  async updateMenuCategory(id: number, data: Partial<InsertMenuCategory>): Promise<MenuCategory | undefined> {
    const [cat] = await db.update(menuCategories).set(data).where(eq(menuCategories.id, id)).returning();
    return cat;
  }

  // ============ MENU ITEMS ============
  async getMenuItems(categoryId?: number): Promise<MenuItem[]> {
    if (categoryId) {
      return db.select().from(menuItems).where(eq(menuItems.categoryId, categoryId));
    }
    return db.select().from(menuItems);
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  async createMenuItem(data: InsertMenuItem): Promise<MenuItem> {
    const [item] = await db.insert(menuItems).values(data).returning();
    return item;
  }

  async updateMenuItem(id: number, data: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [item] = await db.update(menuItems).set(data).where(eq(menuItems.id, id)).returning();
    return item;
  }

  // ============ MODIFIER GROUPS ============
  async getModifierGroups(): Promise<ModifierGroup[]> {
    return db.select().from(modifierGroups);
  }

  async getModifierGroup(id: number): Promise<ModifierGroup | undefined> {
    const [g] = await db.select().from(modifierGroups).where(eq(modifierGroups.id, id));
    return g;
  }

  async createModifierGroup(data: InsertModifierGroup): Promise<ModifierGroup> {
    const [g] = await db.insert(modifierGroups).values(data).returning();
    return g;
  }

  async updateModifierGroup(id: number, data: Partial<InsertModifierGroup>): Promise<ModifierGroup | undefined> {
    const [g] = await db.update(modifierGroups).set(data).where(eq(modifierGroups.id, id)).returning();
    return g;
  }

  // ============ MODIFIERS ============
  async getModifiers(groupId?: number): Promise<Modifier[]> {
    if (groupId) {
      return db.select().from(modifiers).where(eq(modifiers.groupId, groupId));
    }
    return db.select().from(modifiers);
  }

  async getModifier(id: number): Promise<Modifier | undefined> {
    const [m] = await db.select().from(modifiers).where(eq(modifiers.id, id));
    return m;
  }

  async createModifier(data: InsertModifier): Promise<Modifier> {
    const [m] = await db.insert(modifiers).values(data).returning();
    return m;
  }

  async updateModifier(id: number, data: Partial<InsertModifier>): Promise<Modifier | undefined> {
    const [m] = await db.update(modifiers).set(data).where(eq(modifiers.id, id)).returning();
    return m;
  }

  // ============ ORDERS ============
  async getOrders(locationId?: number, status?: string): Promise<Order[]> {
    const conditions = [];
    if (locationId) conditions.push(eq(orders.locationId, locationId));
    if (status) conditions.push(eq(orders.status, status));

    if (conditions.length > 0) {
      return db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt));
    }
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(data: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(data).returning();
    return order;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const updateData: any = { status, updatedAt: new Date() };
    if (status === "completed") {
      updateData.completedAt = new Date();
    }
    const [order] = await db.update(orders).set(updateData).where(eq(orders.id, id)).returning();
    return order;
  }

  // ============ ORDER ITEMS ============
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(data: InsertOrderItem): Promise<OrderItem> {
    const [item] = await db.insert(orderItems).values(data).returning();
    return item;
  }

  // ============ PROMOTIONS ============
  async getPromotions(): Promise<Promotion[]> {
    return db.select().from(promotions);
  }

  async getPromotion(id: number): Promise<Promotion | undefined> {
    const [p] = await db.select().from(promotions).where(eq(promotions.id, id));
    return p;
  }

  async createPromotion(data: InsertPromotion): Promise<Promotion> {
    const [p] = await db.insert(promotions).values(data).returning();
    return p;
  }

  async updatePromotion(id: number, data: Partial<InsertPromotion>): Promise<Promotion | undefined> {
    const [p] = await db.update(promotions).set(data).where(eq(promotions.id, id)).returning();
    return p;
  }

  // ============ USERS ============
  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.username, username));
    return u;
  }

  async getUserByPin(pin: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.pin, pin));
    return u;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [u] = await db.insert(users).values(data).returning();
    return u;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [u] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return u;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  // ============ CUSTOMERS ============
  async getCustomers(search?: string): Promise<Customer[]> {
    if (search) {
      const pattern = `%${search}%`;
      return db.select().from(customers).where(
        or(
          ilike(customers.name, pattern),
          ilike(customers.phone ?? "", pattern),
          ilike(customers.email ?? "", pattern),
        )
      );
    }
    return db.select().from(customers);
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [c] = await db.select().from(customers).where(eq(customers.id, id));
    return c;
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const [c] = await db.select().from(customers).where(eq(customers.phone, phone));
    return c;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [c] = await db.select().from(customers).where(eq(customers.email, email));
    return c;
  }

  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const [c] = await db.insert(customers).values(data).returning();
    return c;
  }

  async updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [c] = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
    return c;
  }

  // ============ REWARD CONFIG ============
  async getRewardConfig(): Promise<RewardConfig> {
    const configs = await db.select().from(rewardConfig);
    if (configs.length === 0) {
      // Create default config
      const [config] = await db.insert(rewardConfig).values({}).returning();
      return config;
    }
    return configs[0];
  }

  async updateRewardConfig(data: Partial<InsertRewardConfig>): Promise<RewardConfig> {
    const existing = await this.getRewardConfig();
    const [config] = await db.update(rewardConfig).set(data).where(eq(rewardConfig.id, existing.id)).returning();
    return config;
  }

  // ============ GIFT CARDS ============
  async getGiftCards(): Promise<GiftCard[]> {
    return db.select().from(giftCards);
  }

  async getGiftCard(id: number): Promise<GiftCard | undefined> {
    const [card] = await db.select().from(giftCards).where(eq(giftCards.id, id));
    return card;
  }

  async getGiftCardByCode(code: string): Promise<GiftCard | undefined> {
    const [card] = await db.select().from(giftCards).where(eq(giftCards.code, code));
    return card;
  }

  async createGiftCard(data: InsertGiftCard): Promise<GiftCard> {
    const [card] = await db.insert(giftCards).values(data).returning();
    return card;
  }

  async updateGiftCardBalance(id: number, newBalance: number): Promise<GiftCard | undefined> {
    const [card] = await db.update(giftCards).set({ balance: newBalance }).where(eq(giftCards.id, id)).returning();
    return card;
  }

  // ============ CUSTOMER TRANSACTIONS ============
  async getCustomerTransactions(customerId?: number, giftCardId?: number): Promise<CustomerTransaction[]> {
    const conditions = [];
    if (customerId) conditions.push(eq(customerTransactions.customerId, customerId));
    if (giftCardId) conditions.push(eq(customerTransactions.giftCardId, giftCardId));

    if (conditions.length > 0) {
      return db.select().from(customerTransactions).where(and(...conditions)).orderBy(desc(customerTransactions.createdAt));
    }
    return db.select().from(customerTransactions).orderBy(desc(customerTransactions.createdAt));
  }

  async createCustomerTransaction(data: InsertCustomerTransaction): Promise<CustomerTransaction> {
    const [txn] = await db.insert(customerTransactions).values(data).returning();
    return txn;
  }

  // ============ SHIFTS (Clock In/Out) ============
  async getShifts(locationId?: number, userId?: number): Promise<Shift[]> {
    const conditions = [];
    if (locationId) conditions.push(eq(shifts.locationId, locationId));
    if (userId) conditions.push(eq(shifts.userId, userId));

    if (conditions.length > 0) {
      return db.select().from(shifts).where(and(...conditions)).orderBy(desc(shifts.clockIn));
    }
    return db.select().from(shifts).orderBy(desc(shifts.clockIn));
  }

  async getShift(id: number): Promise<Shift | undefined> {
    const [s] = await db.select().from(shifts).where(eq(shifts.id, id));
    return s;
  }

  async getActiveShift(userId: number): Promise<Shift | undefined> {
    const [s] = await db.select().from(shifts).where(
      and(eq(shifts.userId, userId), eq(shifts.status, "active"))
    );
    return s;
  }

  async createShift(data: InsertShift): Promise<Shift> {
    const [s] = await db.insert(shifts).values(data).returning();
    return s;
  }

  async updateShift(id: number, data: Partial<InsertShift & { totalHours: number }>): Promise<Shift | undefined> {
    const [s] = await db.update(shifts).set(data).where(eq(shifts.id, id)).returning();
    return s;
  }

  // ============ UTILITIES ============
  async getNextOrderNumber(locationId: number): Promise<string> {
    const loc = await this.getLocation(locationId);
    const prefix = loc?.orderNumberPrefix || "SH";

    // Count today's orders for this location
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.locationId, locationId),
          sql`${orders.createdAt} >= ${today}`
        )
      );

    const count = Number(todayOrders[0]?.count ?? 0) + 1;
    return `${prefix}-${String(count).padStart(4, "0")}`;
  }

  // ============ SETTLEMENTS ============
  async getSettlements(locationId?: number): Promise<Settlement[]> {
    if (locationId) {
      return db.select().from(settlements).where(eq(settlements.locationId, locationId)).orderBy(desc(settlements.createdAt));
    }
    return db.select().from(settlements).orderBy(desc(settlements.createdAt));
  }

  async getSettlement(id: number): Promise<Settlement | undefined> {
    const [row] = await db.select().from(settlements).where(eq(settlements.id, id));
    return row;
  }

  async getSettlementByDate(locationId: number, date: string): Promise<Settlement | undefined> {
    const [row] = await db.select().from(settlements).where(
      and(eq(settlements.locationId, locationId), eq(settlements.date, date))
    );
    return row;
  }

  async createSettlement(data: InsertSettlement): Promise<Settlement> {
    const [row] = await db.insert(settlements).values(data).returning();
    return row;
  }

  async updateSettlement(id: number, data: Partial<InsertSettlement>): Promise<Settlement | undefined> {
    const [row] = await db.update(settlements).set(data).where(eq(settlements.id, id)).returning();
    return row;
  }

  // ============ CASH DRAWER TRANSACTIONS ============

  async getCashDrawerTransactions(locationId: number, date: string): Promise<CashDrawerTransaction[]> {
    return db.select().from(cashDrawerTransactions)
      .where(and(
        eq(cashDrawerTransactions.locationId, locationId),
        eq(cashDrawerTransactions.date, date),
      ))
      .orderBy(desc(cashDrawerTransactions.createdAt));
  }

  async createCashDrawerTransaction(data: InsertCashDrawerTransaction): Promise<CashDrawerTransaction> {
    const [row] = await db.insert(cashDrawerTransactions).values(data).returning();
    return row;
  }

  async deleteCashDrawerTransaction(id: number): Promise<boolean> {
    const [row] = await db.delete(cashDrawerTransactions).where(eq(cashDrawerTransactions.id, id)).returning();
    return !!row;
  }

  async getDailySales(locationId: number, date: string): Promise<{ totalOrders: number; totalRevenue: number; avgOrderValue: number }> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const result = await db.select({
      totalOrders: sql<number>`count(*)`,
      totalRevenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
    }).from(orders).where(
      and(
        eq(orders.locationId, locationId),
        sql`${orders.createdAt} >= ${dayStart}`,
        sql`${orders.createdAt} <= ${dayEnd}`,
      )
    );

    const totalOrders = Number(result[0]?.totalOrders ?? 0);
    const totalRevenue = Math.round(Number(result[0]?.totalRevenue ?? 0) * 100) / 100;
    const avgOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

    return { totalOrders, totalRevenue, avgOrderValue };
  }

  // ============ REPORTS ============

  private getDateRange(startDate: string, endDate: string) {
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
    return { start, end };
  }

  async getReportDashboard(locationId: number, startDate: string, endDate: string): Promise<DashboardReport> {
    const { start, end } = this.getDateRange(startDate, endDate);
    const dateFilter = and(
      eq(orders.locationId, locationId),
      sql`${orders.createdAt} >= ${start}`,
      sql`${orders.createdAt} <= ${end}`,
      sql`${orders.status} != 'cancelled'`
    );

    // KPIs
    const [kpiRow] = await db.select({
      totalOrders: sql<number>`count(*)`,
      totalRevenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      totalTips: sql<number>`coalesce(sum(${orders.tip}), 0)`,
    }).from(orders).where(dateFilter);

    const totalOrders = Number(kpiRow?.totalOrders ?? 0);
    const totalRevenue = Math.round(Number(kpiRow?.totalRevenue ?? 0) * 100) / 100;
    const totalTips = Math.round(Number(kpiRow?.totalTips ?? 0) * 100) / 100;
    const avgOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

    // Revenue trend by day
    const trendRows = await db.select({
      date: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      orders: sql<number>`count(*)`,
    }).from(orders).where(dateFilter)
      .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`);

    const revenueTrend = trendRows.map(r => ({
      date: String(r.date),
      revenue: Math.round(Number(r.revenue) * 100) / 100,
      orders: Number(r.orders),
    }));

    // Orders by source
    const sourceRows = await db.select({
      source: orders.source,
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
    }).from(orders).where(dateFilter).groupBy(orders.source);

    const ordersBySource = sourceRows.map(r => ({
      source: r.source || "pos",
      count: Number(r.count),
      revenue: Math.round(Number(r.revenue) * 100) / 100,
    }));

    // Orders by payment method
    const paymentRows = await db.select({
      method: orders.paymentMethod,
      count: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
    }).from(orders).where(dateFilter).groupBy(orders.paymentMethod);

    const ordersByPayment = paymentRows.map(r => ({
      method: r.method || "unknown",
      count: Number(r.count),
      revenue: Math.round(Number(r.revenue) * 100) / 100,
    }));

    // Hourly distribution
    const hourlyRows = await db.select({
      hour: sql<number>`extract(hour from ${orders.createdAt})`,
      orders: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
    }).from(orders).where(dateFilter)
      .groupBy(sql`extract(hour from ${orders.createdAt})`)
      .orderBy(sql`extract(hour from ${orders.createdAt})`);

    const hourlyDistribution = hourlyRows.map(r => ({
      hour: Number(r.hour),
      orders: Number(r.orders),
      revenue: Math.round(Number(r.revenue) * 100) / 100,
    }));

    return {
      kpis: { totalRevenue, totalOrders, avgOrderValue, totalTips },
      revenueTrend,
      ordersBySource,
      ordersByPayment,
      hourlyDistribution,
    };
  }

  async getReportSales(locationId: number, startDate: string, endDate: string): Promise<SalesReport> {
    const { start, end } = this.getDateRange(startDate, endDate);
    const dateFilter = and(
      eq(orders.locationId, locationId),
      sql`${orders.createdAt} >= ${start}`,
      sql`${orders.createdAt} <= ${end}`,
      sql`${orders.status} != 'cancelled'`
    );

    // Daily breakdown
    const dailyRows = await db.select({
      date: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`,
      orders: sql<number>`count(*)`,
      grossSales: sql<number>`coalesce(sum(${orders.subtotal}), 0)`,
      tax: sql<number>`coalesce(sum(${orders.tax}), 0)`,
      tips: sql<number>`coalesce(sum(${orders.tip}), 0)`,
      total: sql<number>`coalesce(sum(${orders.total}), 0)`,
    }).from(orders).where(dateFilter)
      .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`);

    const dailyBreakdown = dailyRows.map(r => ({
      date: String(r.date),
      orders: Number(r.orders),
      grossSales: Math.round(Number(r.grossSales) * 100) / 100,
      discounts: 0,
      netSales: Math.round(Number(r.grossSales) * 100) / 100,
      tax: Math.round(Number(r.tax) * 100) / 100,
      tips: Math.round(Number(r.tips) * 100) / 100,
      total: Math.round(Number(r.total) * 100) / 100,
    }));

    // Payment breakdown
    const paymentRows = await db.select({
      method: orders.paymentMethod,
      count: sql<number>`count(*)`,
      total: sql<number>`coalesce(sum(${orders.total}), 0)`,
    }).from(orders).where(dateFilter).groupBy(orders.paymentMethod);

    const paymentBreakdown = paymentRows.map(r => ({
      method: r.method || "unknown",
      count: Number(r.count),
      total: Math.round(Number(r.total) * 100) / 100,
    }));

    // Source breakdown
    const sourceRows = await db.select({
      source: orders.source,
      count: sql<number>`count(*)`,
      total: sql<number>`coalesce(sum(${orders.total}), 0)`,
    }).from(orders).where(dateFilter).groupBy(orders.source);

    const sourceBreakdown = sourceRows.map(r => ({
      source: r.source || "pos",
      count: Number(r.count),
      total: Math.round(Number(r.total) * 100) / 100,
    }));

    // Type breakdown
    const typeRows = await db.select({
      type: orders.type,
      count: sql<number>`count(*)`,
      total: sql<number>`coalesce(sum(${orders.total}), 0)`,
    }).from(orders).where(dateFilter).groupBy(orders.type);

    const typeBreakdown = typeRows.map(r => ({
      type: (r.type || "dine_in").replace("_", " "),
      count: Number(r.count),
      total: Math.round(Number(r.total) * 100) / 100,
    }));

    // Totals
    const totalOrders = dailyBreakdown.reduce((s, d) => s + d.orders, 0);
    const totalGross = dailyBreakdown.reduce((s, d) => s + d.grossSales, 0);
    const totalTax = dailyBreakdown.reduce((s, d) => s + d.tax, 0);
    const totalTips = dailyBreakdown.reduce((s, d) => s + d.tips, 0);
    const totalTotal = dailyBreakdown.reduce((s, d) => s + d.total, 0);

    return {
      dailyBreakdown,
      paymentBreakdown,
      sourceBreakdown,
      typeBreakdown,
      totals: {
        orders: totalOrders,
        grossSales: Math.round(totalGross * 100) / 100,
        discounts: 0,
        netSales: Math.round(totalGross * 100) / 100,
        tax: Math.round(totalTax * 100) / 100,
        tips: Math.round(totalTips * 100) / 100,
        total: Math.round(totalTotal * 100) / 100,
      },
    };
  }

  async getReportProductMix(locationId: number, startDate: string, endDate: string): Promise<ProductMixReport> {
    const { start, end } = this.getDateRange(startDate, endDate);

    // Join order_items with orders and menu_items
    const rows = await db.select({
      menuItemId: orderItems.menuItemId,
      name: orderItems.name,
      categoryId: menuItems.categoryId,
      cost: menuItems.cost,
      quantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
      revenue: sql<number>`coalesce(sum(${orderItems.unitPrice} * ${orderItems.quantity}), 0)`,
    })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(and(
        eq(orders.locationId, locationId),
        sql`${orders.createdAt} >= ${start}`,
        sql`${orders.createdAt} <= ${end}`,
        sql`${orders.status} != 'cancelled'`
      ))
      .groupBy(orderItems.menuItemId, orderItems.name, menuItems.categoryId, menuItems.cost);

    // Get categories for names
    const cats = await db.select().from(menuCategories);
    const catMap = new Map(cats.map(c => [c.id, c.name]));

    const items = rows.map(r => ({
      menuItemId: r.menuItemId,
      name: r.name,
      category: catMap.get(r.categoryId ?? 0) || "Uncategorized",
      cost: Number(r.cost ?? 0),
      quantity: Number(r.quantity),
      revenue: Math.round(Number(r.revenue) * 100) / 100,
    }));

    const topByQuantity = [...items].sort((a, b) => b.quantity - a.quantity).slice(0, 20);
    const topByRevenue = [...items].sort((a, b) => b.revenue - a.revenue).slice(0, 20);

    // Category breakdown
    const catAgg: Record<string, { category: string; itemCount: number; totalQuantity: number; totalRevenue: number }> = {};
    for (const item of items) {
      if (!catAgg[item.category]) {
        catAgg[item.category] = { category: item.category, itemCount: 0, totalQuantity: 0, totalRevenue: 0 };
      }
      catAgg[item.category].itemCount++;
      catAgg[item.category].totalQuantity += item.quantity;
      catAgg[item.category].totalRevenue += item.revenue;
    }
    const categoryBreakdown = Object.values(catAgg)
      .map(c => ({ ...c, totalRevenue: Math.round(c.totalRevenue * 100) / 100 }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Item profitability (only items with cost data)
    const itemProfitability = items
      .filter(i => i.cost > 0)
      .map(i => {
        const totalCost = i.cost * i.quantity;
        const profit = i.revenue - totalCost;
        const margin = i.revenue > 0 ? Math.round((profit / i.revenue) * 10000) / 100 : 0;
        return { menuItemId: i.menuItemId, name: i.name, cost: Math.round(totalCost * 100) / 100, revenue: i.revenue, profit: Math.round(profit * 100) / 100, margin };
      })
      .sort((a, b) => b.profit - a.profit);

    return { topByQuantity, topByRevenue, categoryBreakdown, itemProfitability };
  }

  async getReportLabor(locationId: number, startDate: string, endDate: string): Promise<LaborReport> {
    const { start, end } = this.getDateRange(startDate, endDate);

    // Get shifts in range
    const shiftRows = await db.select({
      id: shifts.id,
      userId: shifts.userId,
      clockIn: shifts.clockIn,
      clockOut: shifts.clockOut,
      breakMinutes: shifts.breakMinutes,
      totalHours: shifts.totalHours,
      status: shifts.status,
    }).from(shifts).where(and(
      eq(shifts.locationId, locationId),
      sql`${shifts.clockIn} >= ${start}`,
      sql`${shifts.clockIn} <= ${end}`,
    ));

    // Get all users for name/role/rate
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    // Employee summary
    const empAgg: Record<number, { userId: number; name: string; role: string; hoursWorked: number; breakMinutes: number; laborCost: number; shiftsCount: number; hourlyRate: number }> = {};
    for (const s of shiftRows) {
      const u = userMap.get(s.userId);
      if (!empAgg[s.userId]) {
        empAgg[s.userId] = {
          userId: s.userId,
          name: u?.name || "Unknown",
          role: u?.role || "cashier",
          hoursWorked: 0,
          breakMinutes: 0,
          laborCost: 0,
          shiftsCount: 0,
          hourlyRate: u?.hourlyRate || 0,
        };
      }
      const hours = Number(s.totalHours ?? 0);
      empAgg[s.userId].hoursWorked += hours;
      empAgg[s.userId].breakMinutes += Number(s.breakMinutes ?? 0);
      empAgg[s.userId].shiftsCount++;
    }
    const employeeSummary = Object.values(empAgg).map(e => ({
      ...e,
      hoursWorked: Math.round(e.hoursWorked * 100) / 100,
      laborCost: Math.round(e.hoursWorked * e.hourlyRate * 100) / 100,
    })).sort((a, b) => b.hoursWorked - a.hoursWorked);

    // Daily labor trend
    const dailyAgg: Record<string, { date: string; totalHours: number; totalCost: number }> = {};
    for (const s of shiftRows) {
      const day = new Date(s.clockIn).toISOString().split("T")[0];
      if (!dailyAgg[day]) dailyAgg[day] = { date: day, totalHours: 0, totalCost: 0 };
      const hours = Number(s.totalHours ?? 0);
      const rate = userMap.get(s.userId)?.hourlyRate || 0;
      dailyAgg[day].totalHours += hours;
      dailyAgg[day].totalCost += hours * rate;
    }
    const dailyLaborTrend = Object.values(dailyAgg)
      .map(d => ({ ...d, totalHours: Math.round(d.totalHours * 100) / 100, totalCost: Math.round(d.totalCost * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Labor vs revenue
    const totalLaborCost = employeeSummary.reduce((s, e) => s + e.laborCost, 0);

    // Get revenue for same period
    const [revRow] = await db.select({
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
    }).from(orders).where(and(
      eq(orders.locationId, locationId),
      sql`${orders.createdAt} >= ${start}`,
      sql`${orders.createdAt} <= ${end}`,
      sql`${orders.status} != 'cancelled'`
    ));
    const totalRevenue = Math.round(Number(revRow?.revenue ?? 0) * 100) / 100;
    const ratio = totalRevenue > 0 ? Math.round((totalLaborCost / totalRevenue) * 10000) / 100 : 0;

    // Overtime flags
    const overtimeFlags: LaborReport["overtimeFlags"] = [];
    // Daily overtime: any shift > 8 hours
    for (const s of shiftRows) {
      const hours = Number(s.totalHours ?? 0);
      if (hours > 8) {
        const u = userMap.get(s.userId);
        overtimeFlags.push({
          userId: s.userId,
          name: u?.name || "Unknown",
          date: new Date(s.clockIn).toISOString().split("T")[0],
          hoursWorked: Math.round(hours * 100) / 100,
          type: "daily",
        });
      }
    }
    // Weekly overtime: group by user + ISO week
    const weeklyAgg: Record<string, { userId: number; name: string; hours: number; week: string }> = {};
    for (const s of shiftRows) {
      const d = new Date(s.clockIn);
      const weekNum = getISOWeek(d);
      const year = d.getFullYear();
      const key = `${s.userId}-${year}-W${weekNum}`;
      if (!weeklyAgg[key]) {
        const u = userMap.get(s.userId);
        weeklyAgg[key] = { userId: s.userId, name: u?.name || "Unknown", hours: 0, week: `${year}-W${weekNum}` };
      }
      weeklyAgg[key].hours += Number(s.totalHours ?? 0);
    }
    for (const w of Object.values(weeklyAgg)) {
      if (w.hours > 40) {
        overtimeFlags.push({
          userId: w.userId,
          name: w.name,
          date: w.week,
          hoursWorked: Math.round(w.hours * 100) / 100,
          type: "weekly",
        });
      }
    }

    return {
      employeeSummary,
      dailyLaborTrend,
      laborVsRevenue: { totalLaborCost: Math.round(totalLaborCost * 100) / 100, totalRevenue, ratio },
      overtimeFlags,
    };
  }

  async getReportCustomers(locationId: number, startDate: string, endDate: string): Promise<CustomerReport> {
    const { start, end } = this.getDateRange(startDate, endDate);

    // New customers created in date range
    const [newRow] = await db.select({
      count: sql<number>`count(*)`,
    }).from(customers).where(and(
      sql`${customers.createdAt} >= ${start}`,
      sql`${customers.createdAt} <= ${end}`,
    ));
    const newCustomers = Number(newRow?.count ?? 0);

    // Returning customers: distinct customerPhone in orders within range where customer was created before range
    const returningRows = await db.select({
      count: sql<number>`count(distinct ${orders.customerPhone})`,
    }).from(orders)
      .innerJoin(customers, sql`trim(${orders.customerPhone}) = trim(${customers.phone})`)
      .where(and(
        eq(orders.locationId, locationId),
        sql`${orders.createdAt} >= ${start}`,
        sql`${orders.createdAt} <= ${end}`,
        sql`${customers.createdAt} < ${start}`,
        sql`${orders.customerPhone} is not null`,
        sql`${orders.customerPhone} != ''`,
      ));
    const returningCustomers = Number(returningRows[0]?.count ?? 0);

    // Top customers by spend
    const topRows = await db.select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      lifetimeSpend: customers.lifetimeSpend,
      visitCount: customers.visitCount,
      tier: customers.tier,
    }).from(customers)
      .where(eq(customers.isActive, true))
      .orderBy(desc(customers.lifetimeSpend))
      .limit(20);

    const topBySpend = topRows.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      lifetimeSpend: Number(r.lifetimeSpend ?? 0),
      visitCount: Number(r.visitCount ?? 0),
      tier: r.tier || "bronze",
    }));

    // Tier distribution
    const tierRows = await db.select({
      tier: customers.tier,
      count: sql<number>`count(*)`,
    }).from(customers)
      .where(eq(customers.isActive, true))
      .groupBy(customers.tier);

    const tierDistribution = tierRows.map(r => ({
      tier: r.tier || "bronze",
      count: Number(r.count),
    }));

    // Acquisition trend
    const acqRows = await db.select({
      date: sql<string>`to_char(${customers.createdAt}, 'YYYY-MM-DD')`,
      newCustomers: sql<number>`count(*)`,
    }).from(customers)
      .where(and(
        sql`${customers.createdAt} >= ${start}`,
        sql`${customers.createdAt} <= ${end}`,
      ))
      .groupBy(sql`to_char(${customers.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${customers.createdAt}, 'YYYY-MM-DD')`);

    const acquisitionTrend = acqRows.map(r => ({
      date: String(r.date),
      newCustomers: Number(r.newCustomers),
    }));

    return {
      newVsReturning: { newCustomers, returningCustomers },
      topBySpend,
      tierDistribution,
      acquisitionTrend,
    };
  }
}
