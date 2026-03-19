import {
  type Location, type InsertLocation,
  type Printer, type InsertPrinter,
  type MenuCategory, type InsertMenuCategory,
  type MenuItem, type InsertMenuItem,
  type ModifierGroup, type InsertModifierGroup,
  type Modifier, type InsertModifier,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type Promotion, type InsertPromotion,
  type User, type InsertUser,
  type Customer, type InsertCustomer,
  type RewardConfig, type InsertRewardConfig,
  type GiftCard, type InsertGiftCard,
  type CustomerTransaction, type InsertCustomerTransaction,
  type StoreHours,
} from "@shared/schema";

// ============ REPORT TYPES ============
export interface DashboardReport {
  kpis: { totalRevenue: number; totalOrders: number; avgOrderValue: number; totalTips: number };
  revenueTrend: Array<{ date: string; revenue: number; orders: number }>;
  ordersBySource: Array<{ source: string; count: number; revenue: number }>;
  ordersByPayment: Array<{ method: string; count: number; revenue: number }>;
  hourlyDistribution: Array<{ hour: number; orders: number; revenue: number }>;
}

export interface SalesReport {
  dailyBreakdown: Array<{
    date: string; orders: number; grossSales: number; discounts: number;
    netSales: number; tax: number; tips: number; total: number;
  }>;
  paymentBreakdown: Array<{ method: string; count: number; total: number }>;
  sourceBreakdown: Array<{ source: string; count: number; total: number }>;
  typeBreakdown: Array<{ type: string; count: number; total: number }>;
  totals: { orders: number; grossSales: number; discounts: number; netSales: number; tax: number; tips: number; total: number };
}

export interface ProductMixReport {
  topByQuantity: Array<{ menuItemId: number; name: string; category: string; quantity: number; revenue: number }>;
  topByRevenue: Array<{ menuItemId: number; name: string; category: string; quantity: number; revenue: number }>;
  categoryBreakdown: Array<{ category: string; itemCount: number; totalQuantity: number; totalRevenue: number }>;
  itemProfitability: Array<{ menuItemId: number; name: string; cost: number; revenue: number; profit: number; margin: number }>;
}

export interface LaborReport {
  employeeSummary: Array<{
    userId: number; name: string; role: string; hoursWorked: number;
    breakMinutes: number; laborCost: number; shiftsCount: number;
  }>;
  dailyLaborTrend: Array<{ date: string; totalHours: number; totalCost: number }>;
  laborVsRevenue: { totalLaborCost: number; totalRevenue: number; ratio: number };
  overtimeFlags: Array<{ userId: number; name: string; date: string; hoursWorked: number; type: string }>;
}

export interface CustomerReport {
  newVsReturning: { newCustomers: number; returningCustomers: number };
  topBySpend: Array<{ id: number; name: string; phone: string | null; lifetimeSpend: number; visitCount: number; tier: string }>;
  tierDistribution: Array<{ tier: string; count: number }>;
  acquisitionTrend: Array<{ date: string; newCustomers: number }>;
}

export interface IStorage {
  // Locations
  getLocations(): Promise<Location[]>;
  getLocation(id: number): Promise<Location | undefined>;
  createLocation(data: InsertLocation): Promise<Location>;
  updateLocation(id: number, data: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<boolean>;

  // Printers
  getPrinters(locationId?: number): Promise<Printer[]>;
  getPrinter(id: number): Promise<Printer | undefined>;
  createPrinter(data: InsertPrinter): Promise<Printer>;
  updatePrinter(id: number, data: Partial<InsertPrinter>): Promise<Printer | undefined>;
  deletePrinter(id: number): Promise<boolean>;

  // Menu Categories
  getMenuCategories(): Promise<MenuCategory[]>;
  getMenuCategory(id: number): Promise<MenuCategory | undefined>;
  createMenuCategory(data: InsertMenuCategory): Promise<MenuCategory>;
  updateMenuCategory(id: number, data: Partial<InsertMenuCategory>): Promise<MenuCategory | undefined>;

  // Menu Items
  getMenuItems(categoryId?: number): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(data: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, data: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;

  // Modifier Groups
  getModifierGroups(): Promise<ModifierGroup[]>;
  getModifierGroup(id: number): Promise<ModifierGroup | undefined>;
  createModifierGroup(data: InsertModifierGroup): Promise<ModifierGroup>;
  updateModifierGroup(id: number, data: Partial<InsertModifierGroup>): Promise<ModifierGroup | undefined>;

  // Modifiers
  getModifiers(groupId?: number): Promise<Modifier[]>;
  getModifier(id: number): Promise<Modifier | undefined>;
  createModifier(data: InsertModifier): Promise<Modifier>;
  updateModifier(id: number, data: Partial<InsertModifier>): Promise<Modifier | undefined>;

  // Orders
  getOrders(locationId?: number, status?: string): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(data: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;

  // Order Items
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(data: InsertOrderItem): Promise<OrderItem>;

  // Promotions
  getPromotions(): Promise<Promotion[]>;
  getPromotion(id: number): Promise<Promotion | undefined>;
  createPromotion(data: InsertPromotion): Promise<Promotion>;
  updatePromotion(id: number, data: Partial<InsertPromotion>): Promise<Promotion | undefined>;

  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Customers
  getCustomers(search?: string): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(data: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer | undefined>;

  // Reward Config
  getRewardConfig(): Promise<RewardConfig>;
  updateRewardConfig(data: Partial<InsertRewardConfig>): Promise<RewardConfig>;

  // Gift Cards
  getGiftCards(): Promise<GiftCard[]>;
  getGiftCard(id: number): Promise<GiftCard | undefined>;
  getGiftCardByCode(code: string): Promise<GiftCard | undefined>;
  createGiftCard(data: InsertGiftCard): Promise<GiftCard>;
  updateGiftCardBalance(id: number, newBalance: number): Promise<GiftCard | undefined>;

  // Customer Transactions
  getCustomerTransactions(customerId?: number, giftCardId?: number): Promise<CustomerTransaction[]>;
  createCustomerTransaction(data: InsertCustomerTransaction): Promise<CustomerTransaction>;

  // Shifts (Clock In/Out)
  getShifts(locationId?: number, userId?: number): Promise<import("@shared/schema").Shift[]>;
  getShift(id: number): Promise<import("@shared/schema").Shift | undefined>;
  getActiveShift(userId: number): Promise<import("@shared/schema").Shift | undefined>;
  createShift(data: import("@shared/schema").InsertShift): Promise<import("@shared/schema").Shift>;
  updateShift(id: number, data: Partial<import("@shared/schema").InsertShift & { totalHours: number }>): Promise<import("@shared/schema").Shift | undefined>;

  // Settlements (End-of-Day)
  getSettlements(locationId?: number): Promise<import("@shared/schema").Settlement[]>;
  getSettlement(id: number): Promise<import("@shared/schema").Settlement | undefined>;
  getSettlementByDate(locationId: number, date: string): Promise<import("@shared/schema").Settlement | undefined>;
  createSettlement(data: import("@shared/schema").InsertSettlement): Promise<import("@shared/schema").Settlement>;
  updateSettlement(id: number, data: Partial<import("@shared/schema").InsertSettlement>): Promise<import("@shared/schema").Settlement | undefined>;

  // Cash Drawer Transactions
  getCashDrawerTransactions(locationId: number, date: string): Promise<import("@shared/schema").CashDrawerTransaction[]>;
  createCashDrawerTransaction(data: import("@shared/schema").InsertCashDrawerTransaction): Promise<import("@shared/schema").CashDrawerTransaction>;
  deleteCashDrawerTransaction(id: number): Promise<boolean>;

  // Utilities
  getNextOrderNumber(locationId: number): Promise<string>;
  getDailySales(locationId: number, date: string): Promise<{ totalOrders: number; totalRevenue: number; avgOrderValue: number }>;

  // Reports
  getReportDashboard(locationId: number, startDate: string, endDate: string): Promise<DashboardReport>;
  getReportSales(locationId: number, startDate: string, endDate: string): Promise<SalesReport>;
  getReportProductMix(locationId: number, startDate: string, endDate: string): Promise<ProductMixReport>;
  getReportLabor(locationId: number, startDate: string, endDate: string): Promise<LaborReport>;
  getReportCustomers(locationId: number, startDate: string, endDate: string): Promise<CustomerReport>;
}

export class MemStorage implements IStorage {
  private locations: Map<number, Location> = new Map();
  private printers: Map<number, Printer> = new Map();
  private menuCategories: Map<number, MenuCategory> = new Map();
  private menuItems: Map<number, MenuItem> = new Map();
  private modifierGroups: Map<number, ModifierGroup> = new Map();
  private modifiers: Map<number, Modifier> = new Map();
  private orders: Map<number, Order> = new Map();
  private orderItems: Map<number, OrderItem> = new Map();
  private promotions: Map<number, Promotion> = new Map();
  private users: Map<number, User> = new Map();
  private customers: Map<number, Customer> = new Map();
  private rewardConfigs: Map<number, RewardConfig> = new Map();
  private giftCards: Map<number, GiftCard> = new Map();
  private customerTransactions: Map<number, CustomerTransaction> = new Map();

  private nextId: Record<string, number> = {
    locations: 1,
    printers: 1,
    menuCategories: 1,
    menuItems: 1,
    modifierGroups: 1,
    modifiers: 1,
    orders: 1,
    orderItems: 1,
    promotions: 1,
    users: 1,
    customers: 1,
    rewardConfigs: 1,
    giftCards: 1,
    customerTransactions: 1,
  };

  private orderCounters: Map<number, number> = new Map();

  constructor() {
    this.seed();
  }

  private getId(entity: string): number {
    const id = this.nextId[entity];
    this.nextId[entity]++;
    return id;
  }

  // ============ LOCATIONS ============
  async getLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }

  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async createLocation(data: InsertLocation): Promise<Location> {
    const id = this.getId("locations");
    const location: Location = {
      id,
      timezone: "America/New_York",
      isActive: true,
      stripeLocationId: null,
      stripeTerminalId: null,
      uberEatsStoreId: null,
      doordashStoreId: null,
      phone: null,
      email: null,
      website: null,
      city: null,
      state: null,
      zip: null,
      storeHours: null,
      taxRate: 0.08,
      taxName: "Sales Tax",
      receiptHeader: "Thank you for visiting Sweet Hut!",
      receiptFooter: "Follow us @sweethutbakery",
      autoAcceptOrders: true,
      defaultPrepTime: 15,
      orderNumberPrefix: "SH",
      ...data,
    };
    this.locations.set(id, location);
    return location;
  }

  async updateLocation(id: number, data: Partial<InsertLocation>): Promise<Location | undefined> {
    const existing = this.locations.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.locations.set(id, updated);
    return updated;
  }

  async deleteLocation(id: number): Promise<boolean> {
    return this.locations.delete(id);
  }

  // ============ PRINTERS ============
  async getPrinters(locationId?: number): Promise<Printer[]> {
    const all = Array.from(this.printers.values());
    if (locationId !== undefined) return all.filter((p) => p.locationId === locationId);
    return all;
  }

  async getPrinter(id: number): Promise<Printer | undefined> {
    return this.printers.get(id);
  }

  async createPrinter(data: InsertPrinter): Promise<Printer> {
    const id = this.getId("printers");
    const printer: Printer = {
      id,
      port: 9100,
      isActive: true,
      model: null,
      paperWidth: 80,
      autoCut: true,
      openDrawer: false,
      ...data,
    };
    this.printers.set(id, printer);
    return printer;
  }

  async updatePrinter(id: number, data: Partial<InsertPrinter>): Promise<Printer | undefined> {
    const existing = this.printers.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.printers.set(id, updated);
    return updated;
  }

  async deletePrinter(id: number): Promise<boolean> {
    return this.printers.delete(id);
  }

  // ============ MENU CATEGORIES ============
  async getMenuCategories(): Promise<MenuCategory[]> {
    return Array.from(this.menuCategories.values());
  }

  async getMenuCategory(id: number): Promise<MenuCategory | undefined> {
    return this.menuCategories.get(id);
  }

  async createMenuCategory(data: InsertMenuCategory): Promise<MenuCategory> {
    const id = this.getId("menuCategories");
    const cat: MenuCategory = { id, displayOrder: 0, color: "#6366f1", icon: null, isActive: true, ...data };
    this.menuCategories.set(id, cat);
    return cat;
  }

  async updateMenuCategory(id: number, data: Partial<InsertMenuCategory>): Promise<MenuCategory | undefined> {
    const existing = this.menuCategories.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.menuCategories.set(id, updated);
    return updated;
  }

  // ============ MENU ITEMS ============
  async getMenuItems(categoryId?: number): Promise<MenuItem[]> {
    const all = Array.from(this.menuItems.values());
    if (categoryId !== undefined) return all.filter((i) => i.categoryId === categoryId);
    return all;
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async createMenuItem(data: InsertMenuItem): Promise<MenuItem> {
    const id = this.getId("menuItems");
    const item: MenuItem = {
      id,
      nameZh: null,
      description: null,
      image: null,
      isAvailable: true,
      isPopular: false,
      displayOrder: 0,
      prepStation: "kitchen",
      modifierGroups: [],
      cost: null,
      sku: null,
      barcode: null,
      ...data,
    };
    this.menuItems.set(id, item);
    return item;
  }

  async updateMenuItem(id: number, data: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const existing = this.menuItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.menuItems.set(id, updated);
    return updated;
  }

  // ============ MODIFIER GROUPS ============
  async getModifierGroups(): Promise<ModifierGroup[]> {
    return Array.from(this.modifierGroups.values());
  }

  async getModifierGroup(id: number): Promise<ModifierGroup | undefined> {
    return this.modifierGroups.get(id);
  }

  async createModifierGroup(data: InsertModifierGroup): Promise<ModifierGroup> {
    const id = this.getId("modifierGroups");
    const group: ModifierGroup = { id, type: "single", required: false, maxSelections: 1, ...data };
    this.modifierGroups.set(id, group);
    return group;
  }

  async updateModifierGroup(id: number, data: Partial<InsertModifierGroup>): Promise<ModifierGroup | undefined> {
    const existing = this.modifierGroups.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.modifierGroups.set(id, updated);
    return updated;
  }

  // ============ MODIFIERS ============
  async getModifiers(groupId?: number): Promise<Modifier[]> {
    const all = Array.from(this.modifiers.values());
    if (groupId !== undefined) return all.filter((m) => m.groupId === groupId);
    return all;
  }

  async getModifier(id: number): Promise<Modifier | undefined> {
    return this.modifiers.get(id);
  }

  async createModifier(data: InsertModifier): Promise<Modifier> {
    const id = this.getId("modifiers");
    const mod: Modifier = { id, priceAdjustment: 0, isDefault: false, displayOrder: 0, ...data };
    this.modifiers.set(id, mod);
    return mod;
  }

  async updateModifier(id: number, data: Partial<InsertModifier>): Promise<Modifier | undefined> {
    const existing = this.modifiers.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.modifiers.set(id, updated);
    return updated;
  }

  // ============ ORDERS ============
  async getOrders(locationId?: number, status?: string): Promise<Order[]> {
    let all = Array.from(this.orders.values());
    if (locationId !== undefined) all = all.filter((o) => o.locationId === locationId);
    if (status !== undefined) all = all.filter((o) => o.status === status);
    return all.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(data: InsertOrder): Promise<Order> {
    const id = this.getId("orders");
    const now = new Date();
    const order: Order = {
      id,
      status: "pending",
      type: "dine_in",
      customerName: null,
      customerPhone: null,
      tip: 0,
      paymentMethod: null,
      paymentIntentId: null,
      notes: null,
      externalOrderId: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      cashierId: null,
      ...data,
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const existing = this.orders.get(id);
    if (!existing) return undefined;
    const updated: Order = {
      ...existing,
      status,
      updatedAt: new Date(),
      completedAt: status === "completed" ? new Date() : existing.completedAt,
    };
    this.orders.set(id, updated);
    return updated;
  }

  // ============ ORDER ITEMS ============
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter((oi) => oi.orderId === orderId);
  }

  async createOrderItem(data: InsertOrderItem): Promise<OrderItem> {
    const id = this.getId("orderItems");
    const item: OrderItem = { id, quantity: 1, modifiers: [], notes: null, prepStation: "kitchen", ...data };
    this.orderItems.set(id, item);
    return item;
  }

  // ============ PROMOTIONS ============
  async getPromotions(): Promise<Promotion[]> {
    return Array.from(this.promotions.values());
  }

  async getPromotion(id: number): Promise<Promotion | undefined> {
    return this.promotions.get(id);
  }

  async createPromotion(data: InsertPromotion): Promise<Promotion> {
    const id = this.getId("promotions");
    const promo: Promotion = {
      id,
      description: null,
      value: null,
      code: null,
      image: null,
      startDate: null,
      endDate: null,
      isActive: true,
      locationIds: [],
      pushNotification: false,
      ...data,
    };
    this.promotions.set(id, promo);
    return promo;
  }

  async updatePromotion(id: number, data: Partial<InsertPromotion>): Promise<Promotion | undefined> {
    const existing = this.promotions.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.promotions.set(id, updated);
    return updated;
  }

  // ============ USERS ============
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async createUser(data: InsertUser): Promise<User> {
    const id = this.getId("users");
    const user: User = {
      id,
      role: "cashier",
      locationId: null,
      pin: null,
      email: null,
      phone: null,
      hourlyRate: null,
      isActive: true,
      createdAt: new Date(),
      lastLogin: null,
      ...data,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // ============ CUSTOMERS ============
  async getCustomers(search?: string): Promise<Customer[]> {
    let all = Array.from(this.customers.values());
    if (search) {
      const q = search.toLowerCase();
      all = all.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }
    return all;
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find((c) => c.phone === phone);
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find((c) => c.email === email);
  }

  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const id = this.getId("customers");
    const customer: Customer = {
      id,
      phone: null,
      email: null,
      rewardPoints: 0,
      lifetimePoints: 0,
      lifetimeSpend: 0,
      tier: "bronze",
      visitCount: 0,
      notes: null,
      isActive: true,
      createdAt: new Date(),
      lastVisit: null,
      ...data,
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const existing = this.customers.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.customers.set(id, updated);
    return updated;
  }

  // ============ REWARD CONFIG ============
  async getRewardConfig(): Promise<RewardConfig> {
    // Always return the first (and only) config record
    const all = Array.from(this.rewardConfigs.values());
    return all[0];
  }

  async updateRewardConfig(data: Partial<InsertRewardConfig>): Promise<RewardConfig> {
    const existing = Array.from(this.rewardConfigs.values())[0];
    const updated = { ...existing, ...data };
    this.rewardConfigs.set(updated.id, updated);
    return updated;
  }

  // ============ GIFT CARDS ============
  async getGiftCards(): Promise<GiftCard[]> {
    return Array.from(this.giftCards.values());
  }

  async getGiftCard(id: number): Promise<GiftCard | undefined> {
    return this.giftCards.get(id);
  }

  async getGiftCardByCode(code: string): Promise<GiftCard | undefined> {
    return Array.from(this.giftCards.values()).find((g) => g.code === code);
  }

  async createGiftCard(data: InsertGiftCard): Promise<GiftCard> {
    const id = this.getId("giftCards");
    const card: GiftCard = {
      id,
      balance: data.initialValue,
      customerId: null,
      purchasedBy: null,
      recipientName: null,
      recipientEmail: null,
      isActive: true,
      expiresAt: null,
      createdAt: new Date(),
      ...data,
    };
    this.giftCards.set(id, card);
    return card;
  }

  async updateGiftCardBalance(id: number, newBalance: number): Promise<GiftCard | undefined> {
    const existing = this.giftCards.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, balance: Math.round(newBalance * 100) / 100 };
    this.giftCards.set(id, updated);
    return updated;
  }

  // ============ CUSTOMER TRANSACTIONS ============
  async getCustomerTransactions(customerId?: number, giftCardId?: number): Promise<CustomerTransaction[]> {
    let all = Array.from(this.customerTransactions.values());
    if (customerId !== undefined) all = all.filter((t) => t.customerId === customerId);
    if (giftCardId !== undefined) all = all.filter((t) => t.giftCardId === giftCardId);
    return all.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }

  async createCustomerTransaction(data: InsertCustomerTransaction): Promise<CustomerTransaction> {
    const id = this.getId("customerTransactions");
    const txn: CustomerTransaction = {
      id,
      customerId: null,
      giftCardId: null,
      amount: null,
      points: null,
      orderId: null,
      description: null,
      createdAt: new Date(),
      ...data,
    };
    this.customerTransactions.set(id, txn);
    return txn;
  }

  // ============ UTILITIES ============
  async getNextOrderNumber(locationId: number): Promise<string> {
    const count = (this.orderCounters.get(locationId) || 0) + 1;
    this.orderCounters.set(locationId, count);
    return `SH-${String(count).padStart(3, "0")}`;
  }

  async getDailySales(locationId: number, date: string): Promise<{ totalOrders: number; totalRevenue: number; avgOrderValue: number }> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayOrders = Array.from(this.orders.values()).filter((o) => {
      if (o.locationId !== locationId) return false;
      if (!o.createdAt) return false;
      const t = new Date(o.createdAt).getTime();
      return t >= dayStart.getTime() && t <= dayEnd.getTime();
    });

    const totalOrders = dayOrders.length;
    const totalRevenue = dayOrders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return { totalOrders, totalRevenue: Math.round(totalRevenue * 100) / 100, avgOrderValue: Math.round(avgOrderValue * 100) / 100 };
  }

  // ============ SEED DATA ============
  private seed() {
    // Default store hours for all locations
    const defaultHours: StoreHours = {
      monday:    { open: "10:00", close: "22:00", closed: false },
      tuesday:   { open: "10:00", close: "22:00", closed: false },
      wednesday: { open: "10:00", close: "22:00", closed: false },
      thursday:  { open: "10:00", close: "22:00", closed: false },
      friday:    { open: "10:00", close: "23:00", closed: false },
      saturday:  { open: "09:00", close: "23:00", closed: false },
      sunday:    { open: "09:00", close: "21:00", closed: false },
    };

    // --- Locations ---
    const locData: InsertLocation[] = [
      {
        name: "Sweet Hut Doraville",
        address: "5150 Buford Hwy NE",
        city: "Doraville",
        state: "GA",
        zip: "30340",
        phone: "(770) 986-0828",
        email: "doraville@sweethutbakery.com",
        website: "https://sweethutbakery.com",
        storeHours: defaultHours,
        taxRate: 0.08,
        taxName: "GA Sales Tax",
        receiptHeader: "Sweet Hut Bakery & Cafe\nThank you for your visit!",
        receiptFooter: "Follow us @sweethutbakery\nwww.sweethutbakery.com",
        orderNumberPrefix: "SH-DV",
        defaultPrepTime: 15,
        autoAcceptOrders: true,
      },
      {
        name: "Sweet Hut Duluth",
        address: "2750 Pleasant Hill Rd",
        city: "Duluth",
        state: "GA",
        zip: "30096",
        phone: "(678) 417-8888",
        email: "duluth@sweethutbakery.com",
        website: "https://sweethutbakery.com",
        storeHours: defaultHours,
        taxRate: 0.08,
        taxName: "GA Sales Tax",
        receiptHeader: "Sweet Hut Bakery & Cafe\nThank you for your visit!",
        receiptFooter: "Follow us @sweethutbakery\nwww.sweethutbakery.com",
        orderNumberPrefix: "SH-DL",
        defaultPrepTime: 15,
        autoAcceptOrders: true,
      },
      {
        name: "Sweet Hut Midtown",
        address: "935 Peachtree St NE",
        city: "Atlanta",
        state: "GA",
        zip: "30309",
        phone: "(404) 835-3553",
        email: "midtown@sweethutbakery.com",
        website: "https://sweethutbakery.com",
        storeHours: {
          ...defaultHours,
          friday:   { open: "10:00", close: "00:00", closed: false },
          saturday: { open: "09:00", close: "00:00", closed: false },
        },
        taxRate: 0.089,
        taxName: "Atlanta Sales Tax",
        receiptHeader: "Sweet Hut Bakery & Cafe\nMidtown Atlanta",
        receiptFooter: "Follow us @sweethutbakery\nwww.sweethutbakery.com",
        orderNumberPrefix: "SH-MT",
        defaultPrepTime: 12,
        autoAcceptOrders: true,
      },
    ];
    const locs: Location[] = [];
    for (const l of locData) {
      const id = this.getId("locations");
      const loc: Location = {
        id,
        timezone: "America/New_York",
        isActive: true,
        stripeLocationId: null,
        stripeTerminalId: null,
        uberEatsStoreId: null,
        doordashStoreId: null,
        phone: null,
        email: null,
        website: null,
        city: null,
        state: null,
        zip: null,
        storeHours: null,
        taxRate: 0.08,
        taxName: "Sales Tax",
        receiptHeader: "Thank you for visiting Sweet Hut!",
        receiptFooter: "Follow us @sweethutbakery",
        autoAcceptOrders: true,
        defaultPrepTime: 15,
        orderNumberPrefix: "SH",
        ...l,
      };
      this.locations.set(id, loc);
      locs.push(loc);
    }

    // --- Printers (3 per location, with model info) ---
    for (const loc of locs) {
      const base = `192.168.${loc.id}`;
      const printerDefs: { name: string; type: string; ip: string; model: string; paperWidth: number; openDrawer: boolean }[] = [
        { name: "Receipt Printer", type: "receipt", ip: `${base}.100`, model: "Star mC-Print3", paperWidth: 80, openDrawer: true },
        { name: "Kitchen Printer", type: "kitchen", ip: `${base}.101`, model: "Star mC-Label3", paperWidth: 80, openDrawer: false },
        { name: "Packing Printer", type: "packing", ip: `${base}.102`, model: "Star mC-Label3", paperWidth: 58, openDrawer: false },
      ];
      for (const p of printerDefs) {
        const id = this.getId("printers");
        this.printers.set(id, {
          id,
          locationId: loc.id,
          name: p.name,
          type: p.type,
          model: p.model,
          ipAddress: p.ip,
          port: 9100,
          isActive: true,
          paperWidth: p.paperWidth,
          autoCut: true,
          openDrawer: p.openDrawer,
        });
      }
    }

    // --- Menu Categories ---
    const catDefs: { name: string; color: string; icon: string; order: number }[] = [
      { name: "Milk Tea & Drinks", color: "#8B5CF6", icon: "coffee", order: 1 },
      { name: "Coffee", color: "#92400E", icon: "coffee", order: 2 },
      { name: "Smoothie & Juice", color: "#059669", icon: "citrus", order: 3 },
      { name: "Bread & Pastry", color: "#D97706", icon: "croissant", order: 4 },
      { name: "Cake", color: "#EC4899", icon: "cake", order: 5 },
      { name: "Snacks & Dim Sum", color: "#EF4444", icon: "utensils", order: 6 },
      { name: "Rice & Noodle", color: "#F59E0B", icon: "soup", order: 7 },
    ];
    const cats: MenuCategory[] = [];
    for (const c of catDefs) {
      const id = this.getId("menuCategories");
      const cat: MenuCategory = { id, name: c.name, displayOrder: c.order, color: c.color, icon: c.icon, isActive: true };
      this.menuCategories.set(id, cat);
      cats.push(cat);
    }

    // --- Modifier Groups ---
    const sugarGroupId = this.getId("modifierGroups");
    this.modifierGroups.set(sugarGroupId, { id: sugarGroupId, name: "Sugar Level", type: "single", required: true, maxSelections: 1 });

    const iceGroupId = this.getId("modifierGroups");
    this.modifierGroups.set(iceGroupId, { id: iceGroupId, name: "Ice Level", type: "single", required: true, maxSelections: 1 });

    const sizeGroupId = this.getId("modifierGroups");
    this.modifierGroups.set(sizeGroupId, { id: sizeGroupId, name: "Size", type: "single", required: false, maxSelections: 1 });

    const toppingsGroupId = this.getId("modifierGroups");
    this.modifierGroups.set(toppingsGroupId, { id: toppingsGroupId, name: "Toppings", type: "multiple", required: false, maxSelections: 4 });

    // --- Modifiers ---
    const sugarMods = ["100% Sugar", "75% Sugar", "50% Sugar", "25% Sugar", "No Sugar"];
    for (let i = 0; i < sugarMods.length; i++) {
      const id = this.getId("modifiers");
      this.modifiers.set(id, { id, groupId: sugarGroupId, name: sugarMods[i], priceAdjustment: 0, isDefault: i === 0, displayOrder: i });
    }

    const iceMods = ["Regular Ice", "Less Ice", "No Ice"];
    for (let i = 0; i < iceMods.length; i++) {
      const id = this.getId("modifiers");
      this.modifiers.set(id, { id, groupId: iceGroupId, name: iceMods[i], priceAdjustment: 0, isDefault: i === 0, displayOrder: i });
    }

    const sizeMods: { name: string; price: number }[] = [
      { name: "Regular", price: 0 },
      { name: "Large", price: 1.00 },
    ];
    for (let i = 0; i < sizeMods.length; i++) {
      const id = this.getId("modifiers");
      this.modifiers.set(id, { id, groupId: sizeGroupId, name: sizeMods[i].name, priceAdjustment: sizeMods[i].price, isDefault: i === 0, displayOrder: i });
    }

    const toppingMods = ["Boba", "Pudding", "Jelly", "Coconut Jelly"];
    for (let i = 0; i < toppingMods.length; i++) {
      const id = this.getId("modifiers");
      this.modifiers.set(id, { id, groupId: toppingsGroupId, name: toppingMods[i], priceAdjustment: 0.75, isDefault: false, displayOrder: i });
    }

    // Drink modifier group IDs (for linking to menu items)
    const drinkModGroups = [String(sugarGroupId), String(iceGroupId), String(sizeGroupId), String(toppingsGroupId)];
    const coffeeModGroups = [String(sugarGroupId), String(iceGroupId), String(sizeGroupId)];
    const sizeOnlyGroups = [String(sizeGroupId)];

    // --- Menu Items ---
    const itemDefs: { catIdx: number; name: string; nameZh: string; price: number; popular?: boolean; station: string; mods: string[] }[] = [
      // Milk Tea & Drinks (cat index 0)
      { catIdx: 0, name: "Taro Milk Tea", nameZh: "芋头奶茶", price: 5.95, popular: true, station: "bar", mods: drinkModGroups },
      { catIdx: 0, name: "Brown Sugar Boba Milk", nameZh: "黑糖珍珠鲜奶", price: 6.50, popular: true, station: "bar", mods: drinkModGroups },
      { catIdx: 0, name: "Classic Pearl Milk Tea", nameZh: "经典珍珠奶茶", price: 5.50, popular: true, station: "bar", mods: drinkModGroups },
      { catIdx: 0, name: "Jasmine Green Milk Tea", nameZh: "茉莉绿奶茶", price: 5.50, station: "bar", mods: drinkModGroups },
      { catIdx: 0, name: "Mango Milk Tea", nameZh: "芒果奶茶", price: 5.95, station: "bar", mods: drinkModGroups },
      { catIdx: 0, name: "Matcha Milk Tea", nameZh: "抹茶奶茶", price: 6.25, popular: true, station: "bar", mods: drinkModGroups },
      { catIdx: 0, name: "Thai Milk Tea", nameZh: "泰式奶茶", price: 5.75, station: "bar", mods: drinkModGroups },
      { catIdx: 0, name: "Strawberry Milk Tea", nameZh: "草莓奶茶", price: 5.95, station: "bar", mods: drinkModGroups },

      // Coffee (cat index 1)
      { catIdx: 1, name: "Matcha Latte", nameZh: "抹茶拿铁", price: 5.95, popular: true, station: "bar", mods: coffeeModGroups },
      { catIdx: 1, name: "Vietnamese Coffee", nameZh: "越南咖啡", price: 5.50, station: "bar", mods: coffeeModGroups },
      { catIdx: 1, name: "Hong Kong Milk Tea", nameZh: "港式奶茶", price: 4.95, popular: true, station: "bar", mods: coffeeModGroups },
      { catIdx: 1, name: "Caramel Macchiato", nameZh: "焦糖玛奇朵", price: 5.75, station: "bar", mods: coffeeModGroups },
      { catIdx: 1, name: "Espresso", nameZh: "意式浓缩", price: 3.50, station: "bar", mods: sizeOnlyGroups },

      // Smoothie & Juice (cat index 2)
      { catIdx: 2, name: "Mango Smoothie", nameZh: "芒果冰沙", price: 6.50, station: "bar", mods: sizeOnlyGroups },
      { catIdx: 2, name: "Passion Fruit Smoothie", nameZh: "百香果冰沙", price: 6.50, station: "bar", mods: sizeOnlyGroups },
      { catIdx: 2, name: "Taro Smoothie", nameZh: "芋头冰沙", price: 6.50, station: "bar", mods: sizeOnlyGroups },
      { catIdx: 2, name: "Fresh Watermelon Juice", nameZh: "鲜榨西瓜汁", price: 5.95, station: "bar", mods: sizeOnlyGroups },

      // Bread & Pastry (cat index 3)
      { catIdx: 3, name: "Pineapple Bun", nameZh: "菠萝包", price: 3.50, popular: true, station: "bakery", mods: [] },
      { catIdx: 3, name: "Hong Kong Egg Tart", nameZh: "港式蛋挞", price: 2.75, popular: true, station: "bakery", mods: [] },
      { catIdx: 3, name: "Char Siu Bun", nameZh: "叉烧包", price: 3.50, station: "bakery", mods: [] },
      { catIdx: 3, name: "Coconut Bun", nameZh: "椰丝面包", price: 3.25, station: "bakery", mods: [] },
      { catIdx: 3, name: "Red Bean Bread", nameZh: "红豆面包", price: 3.50, station: "bakery", mods: [] },
      { catIdx: 3, name: "Taro Bread", nameZh: "芋泥面包", price: 3.75, station: "bakery", mods: [] },

      // Cake (cat index 4)
      { catIdx: 4, name: "Mango Mochi Cake", nameZh: "芒果麻薯蛋糕", price: 7.50, popular: true, station: "bakery", mods: [] },
      { catIdx: 4, name: "Matcha Mousse Cake", nameZh: "抹茶慕斯蛋糕", price: 7.50, station: "bakery", mods: [] },
      { catIdx: 4, name: "Durian Crepe Cake", nameZh: "榴莲千层蛋糕", price: 8.95, station: "bakery", mods: [] },
      { catIdx: 4, name: "Strawberry Shortcake", nameZh: "草莓蛋糕", price: 6.95, station: "bakery", mods: [] },

      // Snacks & Dim Sum (cat index 5)
      { catIdx: 5, name: "Char Siu Bao", nameZh: "叉烧包", price: 4.50, popular: true, station: "kitchen", mods: [] },
      { catIdx: 5, name: "Shrimp Dumplings (Har Gow)", nameZh: "虾饺", price: 5.50, station: "kitchen", mods: [] },
      { catIdx: 5, name: "Siu Mai", nameZh: "烧卖", price: 5.25, station: "kitchen", mods: [] },
      { catIdx: 5, name: "Egg Rolls (3 pcs)", nameZh: "春卷", price: 4.95, station: "kitchen", mods: [] },
      { catIdx: 5, name: "Turnip Cake", nameZh: "萝卜糕", price: 4.50, station: "kitchen", mods: [] },
      { catIdx: 5, name: "Fried Tofu", nameZh: "炸豆腐", price: 4.25, station: "kitchen", mods: [] },

      // Rice & Noodle (cat index 6)
      { catIdx: 6, name: "BBQ Pork Rice", nameZh: "叉烧饭", price: 11.95, station: "kitchen", mods: [] },
      { catIdx: 6, name: "Hainanese Chicken Rice", nameZh: "海南鸡饭", price: 12.50, popular: true, station: "kitchen", mods: [] },
      { catIdx: 6, name: "Beef Chow Fun", nameZh: "干炒牛河", price: 13.50, station: "kitchen", mods: [] },
      { catIdx: 6, name: "Wonton Noodle Soup", nameZh: "云吞面", price: 11.50, station: "kitchen", mods: [] },
      { catIdx: 6, name: "Tom Yum Noodle Soup", nameZh: "冬阴功面", price: 12.95, station: "kitchen", mods: [] },
    ];

    const menuItemIds: number[] = [];
    for (let i = 0; i < itemDefs.length; i++) {
      const d = itemDefs[i];
      const id = this.getId("menuItems");
      const item: MenuItem = {
        id,
        categoryId: cats[d.catIdx].id,
        name: d.name,
        nameZh: d.nameZh,
        description: null,
        price: d.price,
        cost: null,
        image: null,
        isAvailable: true,
        isPopular: d.popular ?? false,
        displayOrder: i,
        prepStation: d.station,
        modifierGroups: d.mods,
        sku: null,
        barcode: null,
      };
      this.menuItems.set(id, item);
      menuItemIds.push(id);
    }

    // --- Promotions ---
    const promoId1 = this.getId("promotions");
    this.promotions.set(promoId1, {
      id: promoId1,
      title: "Happy Hour: 20% Off All Drinks",
      description: "Get 20% off all milk tea and coffee drinks every weekday from 2-5 PM!",
      type: "percentage",
      value: 20,
      code: "HAPPY20",
      image: null,
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-06-30"),
      isActive: true,
      locationIds: [1, 2, 3],
      pushNotification: true,
    });

    const promoId2 = this.getId("promotions");
    this.promotions.set(promoId2, {
      id: promoId2,
      title: "Buy One Get One Free Boba",
      description: "Buy any milk tea and get a second one free! Dine-in only.",
      type: "bogo",
      value: null,
      code: "BOGO-BOBA",
      image: null,
      startDate: new Date("2026-03-15"),
      endDate: new Date("2026-04-15"),
      isActive: true,
      locationIds: [1],
      pushNotification: false,
    });

    // --- Users (with new fields) ---
    const adminId = this.getId("users");
    this.users.set(adminId, {
      id: adminId,
      username: "admin",
      password: "admin123",
      name: "Admin",
      role: "admin",
      locationId: null,
      pin: "000000",
      email: "admin@sweethutbakery.com",
      phone: "(770) 555-0000",
      hourlyRate: null,
      isActive: true,
      createdAt: new Date(Date.now() - 365 * 24 * 60 * 60000),
      lastLogin: new Date(Date.now() - 2 * 60 * 60000),
    });

    const staffNames = [
      { name: "Tony Liu", username: "cashier1", email: "tony@sweethutbakery.com", phone: "(770) 555-1001", rate: 14.00 },
      { name: "Amy Chen", username: "cashier2", email: "amy@sweethutbakery.com", phone: "(678) 555-1002", rate: 14.00 },
      { name: "Kevin Park", username: "cashier3", email: "kevin@sweethutbakery.com", phone: "(404) 555-1003", rate: 15.00 },
    ];
    for (let i = 0; i < locs.length; i++) {
      const uid = this.getId("users");
      this.users.set(uid, {
        id: uid,
        username: staffNames[i].username,
        password: `cashier${i + 1}`,
        name: staffNames[i].name,
        role: "cashier",
        locationId: locs[i].id,
        pin: `${1000 + i + 1}`,
        email: staffNames[i].email,
        phone: staffNames[i].phone,
        hourlyRate: staffNames[i].rate,
        isActive: true,
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60000),
        lastLogin: new Date(Date.now() - (i + 1) * 24 * 60 * 60000),
      });
    }

    // Add a manager user
    const mgrId = this.getId("users");
    this.users.set(mgrId, {
      id: mgrId,
      username: "manager1",
      password: "manager1",
      name: "Sarah Wong",
      role: "manager",
      locationId: locs[0].id,
      pin: "2000",
      email: "sarah@sweethutbakery.com",
      phone: "(770) 555-2000",
      hourlyRate: 22.00,
      isActive: true,
      createdAt: new Date(Date.now() - 180 * 24 * 60 * 60000),
      lastLogin: new Date(Date.now() - 4 * 60 * 60000),
    });

    // Add a kitchen user
    const kitchenId = this.getId("users");
    this.users.set(kitchenId, {
      id: kitchenId,
      username: "kitchen1",
      password: "kitchen1",
      name: "Wei Zhang",
      role: "kitchen",
      locationId: locs[0].id,
      pin: "3000",
      email: null,
      phone: "(770) 555-3000",
      hourlyRate: 16.00,
      isActive: true,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60000),
      lastLogin: new Date(Date.now() - 8 * 60 * 60000),
    });

    // --- Sample Orders ---
    const now = new Date();
    const orderSeeds: {
      locId: number;
      status: string;
      type: string;
      source: string;
      customer: string;
      payment: string;
      items: { menuIdx: number; qty: number; mods: { name: string; price: number }[] }[];
      minutesAgo: number;
    }[] = [
      {
        locId: 1, status: "completed", type: "dine_in", source: "pos", customer: "Alice", payment: "stripe",
        items: [
          { menuIdx: 0, qty: 2, mods: [{ name: "75% Sugar", price: 0 }, { name: "Less Ice", price: 0 }, { name: "Boba", price: 0.75 }] },
          { menuIdx: 18, qty: 3, mods: [] },
        ],
        minutesAgo: 120,
      },
      {
        locId: 1, status: "preparing", type: "takeout", source: "pos", customer: "Bob", payment: "cash",
        items: [
          { menuIdx: 1, qty: 1, mods: [{ name: "50% Sugar", price: 0 }, { name: "Regular Ice", price: 0 }] },
          { menuIdx: 8, qty: 1, mods: [{ name: "75% Sugar", price: 0 }] },
          { menuIdx: 27, qty: 2, mods: [] },
        ],
        minutesAgo: 30,
      },
      {
        locId: 2, status: "ready", type: "takeout", source: "pos", customer: "Carol", payment: "stripe",
        items: [
          { menuIdx: 23, qty: 1, mods: [] },
          { menuIdx: 24, qty: 1, mods: [] },
          { menuIdx: 2, qty: 1, mods: [{ name: "100% Sugar", price: 0 }, { name: "Regular Ice", price: 0 }, { name: "Pudding", price: 0.75 }] },
        ],
        minutesAgo: 45,
      },
      {
        locId: 2, status: "pending", type: "delivery", source: "ubereats", customer: "David", payment: "external",
        items: [
          { menuIdx: 33, qty: 1, mods: [] },
          { menuIdx: 34, qty: 1, mods: [] },
          { menuIdx: 5, qty: 2, mods: [{ name: "50% Sugar", price: 0 }, { name: "Less Ice", price: 0 }] },
        ],
        minutesAgo: 10,
      },
      {
        locId: 3, status: "confirmed", type: "dine_in", source: "pos", customer: "Eve", payment: "stripe",
        items: [
          { menuIdx: 10, qty: 1, mods: [] },
          { menuIdx: 28, qty: 1, mods: [] },
          { menuIdx: 29, qty: 1, mods: [] },
          { menuIdx: 17, qty: 2, mods: [] },
        ],
        minutesAgo: 15,
      },
    ];

    for (let oi = 0; oi < orderSeeds.length; oi++) {
      const s = orderSeeds[oi];
      const counter = (this.orderCounters.get(s.locId) || 0) + 1;
      this.orderCounters.set(s.locId, counter);
      const orderNumber = `SH-${String(counter).padStart(3, "0")}`;

      // calculate subtotal from items
      let subtotal = 0;
      const orderItemDefs: { menuItem: MenuItem; qty: number; mods: { name: string; price: number }[] }[] = [];
      for (const itm of s.items) {
        const mi = this.menuItems.get(menuItemIds[itm.menuIdx]);
        if (!mi) continue;
        const modTotal = itm.mods.reduce((sum, m) => sum + m.price, 0);
        subtotal += (mi.price + modTotal) * itm.qty;
        orderItemDefs.push({ menuItem: mi, qty: itm.qty, mods: itm.mods });
      }
      subtotal = Math.round(subtotal * 100) / 100;
      const tax = Math.round(subtotal * 0.08 * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;

      const createdAt = new Date(now.getTime() - s.minutesAgo * 60000);
      const orderId = this.getId("orders");
      const order: Order = {
        id: orderId,
        locationId: s.locId,
        orderNumber,
        source: s.source,
        externalOrderId: s.source !== "pos" ? `ext-${orderId}-${Date.now()}` : null,
        status: s.status,
        type: s.type,
        customerName: s.customer,
        customerPhone: null,
        subtotal,
        tax,
        tip: 0,
        total,
        paymentMethod: s.payment,
        paymentIntentId: s.payment === "stripe" ? `pi_mock_${orderId}` : null,
        notes: null,
        createdAt,
        updatedAt: createdAt,
        completedAt: s.status === "completed" ? new Date(createdAt.getTime() + 20 * 60000) : null,
        cashierId: null,
      };
      this.orders.set(orderId, order);

      for (const d of orderItemDefs) {
        const oiId = this.getId("orderItems");
        this.orderItems.set(oiId, {
          id: oiId,
          orderId,
          menuItemId: d.menuItem.id,
          name: d.menuItem.name,
          quantity: d.qty,
          unitPrice: d.menuItem.price,
          modifiers: d.mods,
          notes: null,
          prepStation: d.menuItem.prepStation,
        });
      }
    }

    // --- Customers ---
    const customerDefs: { name: string; phone: string; email: string; points: number; lifetime: number; tier: string; visits: number; spend: number }[] = [
      { name: "Jennifer Chen", phone: "(770) 555-1234", email: "jennifer@email.com", points: 450, lifetime: 450, tier: "silver", visits: 12, spend: 385.50 },
      { name: "David Kim", phone: "(678) 555-5678", email: "david.kim@email.com", points: 120, lifetime: 620, tier: "silver", visits: 8, spend: 245.80 },
      { name: "Sarah Johnson", phone: "(404) 555-9012", email: "sarah.j@email.com", points: 2150, lifetime: 2150, tier: "gold", visits: 45, spend: 1875.25 },
      { name: "Michael Wang", phone: "(770) 555-3456", email: "m.wang@email.com", points: 35, lifetime: 35, tier: "bronze", visits: 3, spend: 52.50 },
      { name: "Lisa Park", phone: "(678) 555-7890", email: "lisa.park@email.com", points: 5200, lifetime: 5200, tier: "platinum", visits: 78, spend: 4250.00 },
    ];
    const customerIds: number[] = [];
    for (const c of customerDefs) {
      const id = this.getId("customers");
      this.customers.set(id, {
        id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        rewardPoints: c.points,
        lifetimePoints: c.lifetime,
        lifetimeSpend: c.spend,
        tier: c.tier,
        visitCount: c.visits,
        notes: null,
        isActive: true,
        createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60000), // 90 days ago
        lastVisit: new Date(now.getTime() - 2 * 24 * 60 * 60000), // 2 days ago
      });
      customerIds.push(id);
    }

    // --- Reward Config ---
    const rcId = this.getId("rewardConfigs");
    this.rewardConfigs.set(rcId, {
      id: rcId,
      pointsPerDollar: 1,
      bonusPointsEnabled: false,
      bonusMultiplier: 2,
      pointsPerReward: 100,
      rewardValue: 1,
      minRedeemPoints: 50,
      maxRedeemPercent: 50,
      silverThreshold: 500,
      goldThreshold: 2000,
      platinumThreshold: 5000,
      silverMultiplier: 1.25,
      goldMultiplier: 1.5,
      platinumMultiplier: 2,
      programName: "Sweet Rewards",
      isActive: true,
    });

    // --- Gift Cards ---
    const gc1 = this.getId("giftCards");
    this.giftCards.set(gc1, {
      id: gc1,
      code: "SH-ABCD-1234",
      balance: 25.00,
      initialValue: 50.00,
      customerId: null,
      purchasedBy: "John Smith",
      recipientName: "Jane Smith",
      recipientEmail: null,
      isActive: true,
      expiresAt: null,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60000),
    });

    const gc2 = this.getId("giftCards");
    this.giftCards.set(gc2, {
      id: gc2,
      code: "SH-EFGH-5678",
      balance: 100.00,
      initialValue: 100.00,
      customerId: customerIds[0],
      purchasedBy: "Jennifer Chen",
      recipientName: null,
      recipientEmail: null,
      isActive: true,
      expiresAt: null,
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60000),
    });

    const gc3 = this.getId("giftCards");
    this.giftCards.set(gc3, {
      id: gc3,
      code: "SH-IJKL-9012",
      balance: 0.00,
      initialValue: 25.00,
      customerId: null,
      purchasedBy: "Walk-in",
      recipientName: "Birthday Gift",
      recipientEmail: null,
      isActive: false,
      expiresAt: null,
      createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60000),
    });

    // --- Customer Transactions ---
    const txn1 = this.getId("customerTransactions");
    this.customerTransactions.set(txn1, {
      id: txn1,
      customerId: customerIds[0],
      giftCardId: null,
      type: "earn_points",
      amount: 45.00,
      points: 45,
      orderId: 1,
      description: "Points earned on order SH-001",
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60000),
    });

    const txn2 = this.getId("customerTransactions");
    this.customerTransactions.set(txn2, {
      id: txn2,
      customerId: customerIds[2],
      giftCardId: null,
      type: "redeem_points",
      amount: 2.00,
      points: -200,
      orderId: 3,
      description: "Redeemed 200 points for $2.00 off",
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60000),
    });

    const txn3 = this.getId("customerTransactions");
    this.customerTransactions.set(txn3, {
      id: txn3,
      customerId: null,
      giftCardId: gc1,
      type: "gift_card_use",
      amount: -25.00,
      points: null,
      orderId: null,
      description: "Gift card SH-ABCD-1234 used for $25.00 purchase",
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60000),
    });
  }

  // ============ SHIFTS (stubs - not used, DB storage is active) ============
  async getShifts() { return []; }
  async getShift() { return undefined; }
  async getActiveShift() { return undefined; }
  async createShift(data: any) { return { id: 0, ...data } as any; }
  async updateShift() { return undefined; }

  // ============ SETTLEMENTS (stubs) ============
  async getSettlements() { return []; }
  async getSettlement() { return undefined; }
  async getSettlementByDate() { return undefined; }
  async createSettlement(data: any) { return { id: 0, ...data } as any; }
  async updateSettlement() { return undefined; }

  // ============ CASH DRAWER (stubs) ============
  async getCashDrawerTransactions() { return []; }
  async createCashDrawerTransaction(data: any) { return { id: 0, ...data } as any; }
  async deleteCashDrawerTransaction() { return false; }

  // ============ REPORTS (stubs) ============
  async getReportDashboard(): Promise<DashboardReport> {
    return { kpis: { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, totalTips: 0 }, revenueTrend: [], ordersBySource: [], ordersByPayment: [], hourlyDistribution: [] };
  }
  async getReportSales(): Promise<SalesReport> {
    return { dailyBreakdown: [], paymentBreakdown: [], sourceBreakdown: [], typeBreakdown: [], totals: { orders: 0, grossSales: 0, discounts: 0, netSales: 0, tax: 0, tips: 0, total: 0 } };
  }
  async getReportProductMix(): Promise<ProductMixReport> {
    return { topByQuantity: [], topByRevenue: [], categoryBreakdown: [], itemProfitability: [] };
  }
  async getReportLabor(): Promise<LaborReport> {
    return { employeeSummary: [], dailyLaborTrend: [], laborVsRevenue: { totalLaborCost: 0, totalRevenue: 0, ratio: 0 }, overtimeFlags: [] };
  }
  async getReportCustomers(): Promise<CustomerReport> {
    return { newVsReturning: { newCustomers: 0, returningCustomers: 0 }, topBySpend: [], tierDistribution: [], acquisitionTrend: [] };
  }
}

import { DatabaseStorage } from "./database-storage";

export const storage: IStorage = new DatabaseStorage();
