import { eq, and, ilike, or, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  locations, printers, menuCategories, menuItems,
  modifierGroups, modifiers, orders, orderItems,
  promotions, users, customers, rewardConfig,
  giftCards, customerTransactions, shifts,
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
} from "@shared/schema";
import type { IStorage } from "./storage";

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
}
