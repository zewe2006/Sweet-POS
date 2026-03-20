import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============ STORE HOURS TYPE ============
export type DayHours = {
  open: string;   // "09:00"
  close: string;  // "21:00"
  closed: boolean;
};

export type StoreHours = {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
};

// ============ LOCATIONS ============
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  timezone: text("timezone").default("America/New_York"),
  isActive: boolean("is_active").default(true),
  // Store hours (JSON: { monday: { open, close, closed }, ... })
  storeHours: jsonb("store_hours").$type<StoreHours>(),
  // Tax config
  taxRate: real("tax_rate").default(0.08), // 8% default
  taxName: text("tax_name").default("Sales Tax"),
  // Receipt customization
  receiptHeader: text("receipt_header").default("Thank you for visiting Sweet Hut!"),
  receiptFooter: text("receipt_footer").default("Follow us @sweethutbakery"),
  // Stripe integration
  stripeLocationId: text("stripe_location_id"),
  stripeTerminalId: text("stripe_terminal_id"),
  // Delivery platform IDs
  uberEatsStoreId: text("ubereats_store_id"),
  doordashStoreId: text("doordash_store_id"),
  // Operational settings
  autoAcceptOrders: boolean("auto_accept_orders").default(true),
  defaultPrepTime: integer("default_prep_time").default(15), // minutes
  orderNumberPrefix: text("order_number_prefix").default("SH"),
});

export const insertLocationSchema = createInsertSchema(locations).omit({ id: true });
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

// ============ PRINTERS ============
export const printers = pgTable("printers", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'receipt' | 'kitchen' | 'packing'
  model: text("model"), // e.g. "Star mC-Print3", "Star mC-Label3"
  ipAddress: text("ip_address").notNull(),
  port: integer("port").default(9100),
  isActive: boolean("is_active").default(true),
  paperWidth: integer("paper_width").default(80), // mm: 80, 58, 40
  autoCut: boolean("auto_cut").default(true),
  openDrawer: boolean("open_drawer").default(false), // kick drawer after print
});

export const insertPrinterSchema = createInsertSchema(printers).omit({ id: true });
export type InsertPrinter = z.infer<typeof insertPrinterSchema>;
export type Printer = typeof printers.$inferSelect;

// ============ MENU CATEGORIES ============
export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").default(0),
  color: text("color").default("#6366f1"), // for POS button color
  icon: text("icon"), // lucide icon name
  isActive: boolean("is_active").default(true),
});

export const insertMenuCategorySchema = createInsertSchema(menuCategories).omit({ id: true });
export type InsertMenuCategory = z.infer<typeof insertMenuCategorySchema>;
export type MenuCategory = typeof menuCategories.$inferSelect;

// ============ MENU ITEMS ============
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  nameZh: text("name_zh"), // Chinese name
  description: text("description"),
  price: real("price").notNull(),
  cost: real("cost"), // cost price for profit calculations
  image: text("image"),
  isAvailable: boolean("is_available").default(true),
  isPopular: boolean("is_popular").default(false),
  displayOrder: integer("display_order").default(0),
  prepStation: text("prep_station").default("kitchen"), // 'kitchen' | 'bar' | 'bakery'
  modifierGroups: jsonb("modifier_groups").$type<string[]>().default([]),
  sku: text("sku"),
  barcode: text("barcode"),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true });
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

// ============ MODIFIER GROUPS ============
export const modifierGroups = pgTable("modifier_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g. "Sugar Level", "Ice Level", "Toppings"
  type: text("type").default("single"), // 'single' | 'multiple'
  required: boolean("required").default(false),
  maxSelections: integer("max_selections").default(1),
});

export const insertModifierGroupSchema = createInsertSchema(modifierGroups).omit({ id: true });
export type InsertModifierGroup = z.infer<typeof insertModifierGroupSchema>;
export type ModifierGroup = typeof modifierGroups.$inferSelect;

// ============ MODIFIERS ============
export const modifiers = pgTable("modifiers", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  name: text("name").notNull(),
  priceAdjustment: real("price_adjustment").default(0),
  isDefault: boolean("is_default").default(false),
  displayOrder: integer("display_order").default(0),
});

export const insertModifierSchema = createInsertSchema(modifiers).omit({ id: true });
export type InsertModifier = z.infer<typeof insertModifierSchema>;
export type Modifier = typeof modifiers.$inferSelect;

// ============ ORDERS ============
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull(),
  orderNumber: text("order_number").notNull(),
  source: text("source").notNull(), // 'pos' | 'app' | 'ubereats' | 'doordash' | 'website'
  externalOrderId: text("external_order_id"), // ID from UberEats/DoorDash
  status: text("status").default("pending"), // 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  type: text("type").default("dine_in"), // 'dine_in' | 'takeout' | 'delivery' | 'pickup'
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  subtotal: real("subtotal").notNull(),
  tax: real("tax").notNull(),
  tip: real("tip").default(0),
  total: real("total").notNull(),
  paymentMethod: text("payment_method"), // 'stripe' | 'cash' | 'external' | 'gift_card' | 'split'
  paymentIntentId: text("payment_intent_id"),
  // Split payment details
  splitPayments: jsonb("split_payments").$type<Array<{method: string, amount: number}>>(),
  // Discount
  discountType: text("discount_type"), // 'percentage' | 'fixed' | 'promotion'
  discountValue: real("discount_value"), // amount or percentage
  discountAmount: real("discount_amount").default(0), // calculated discount in dollars
  promotionId: integer("promotion_id"), // linked promotion if applicable
  // Refund
  refundAmount: real("refund_amount").default(0),
  refundReason: text("refund_reason"),
  refundedBy: text("refunded_by"), // name of who issued refund
  refundedAt: timestamp("refunded_at"),
  // Customer email for digital receipts
  customerEmail: text("customer_email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  cashierId: integer("cashier_id"), // which staff processed this
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// ============ ORDER ITEMS ============
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  menuItemId: integer("menu_item_id").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").default(1),
  unitPrice: real("unit_price").notNull(),
  modifiers: jsonb("modifiers").$type<Array<{name: string, price: number}>>().default([]),
  notes: text("notes"),
  prepStation: text("prep_station").default("kitchen"),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// ============ PROMOTIONS ============
export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'percentage' | 'fixed' | 'bogo' | 'freeItem'
  value: real("value"), // discount amount or percentage
  code: text("code"), // promo code
  image: text("image"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  locationIds: jsonb("location_ids").$type<number[]>().default([]),
  pushNotification: boolean("push_notification").default(false),
});

export const insertPromotionSchema = createInsertSchema(promotions).omit({ id: true });
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type Promotion = typeof promotions.$inferSelect;

// ============ CUSTOMERS ============
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  rewardPoints: integer("reward_points").default(0),
  lifetimePoints: integer("lifetime_points").default(0),
  lifetimeSpend: real("lifetime_spend").default(0),
  tier: text("tier").default("bronze"), // 'bronze' | 'silver' | 'gold' | 'platinum'
  visitCount: integer("visit_count").default(0),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastVisit: timestamp("last_visit"),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// ============ REWARD CONFIG ============
export const rewardConfig = pgTable("reward_config", {
  id: serial("id").primaryKey(),
  // Earning rules
  pointsPerDollar: integer("points_per_dollar").default(1), // earn N points per $1 spent
  bonusPointsEnabled: boolean("bonus_points_enabled").default(false),
  bonusMultiplier: real("bonus_multiplier").default(2), // 2x points during bonus events
  // Redemption rules
  pointsPerReward: integer("points_per_reward").default(100), // N points = $1 discount
  rewardValue: real("reward_value").default(1), // $1 off per 100 points
  minRedeemPoints: integer("min_redeem_points").default(50), // minimum points to redeem
  maxRedeemPercent: integer("max_redeem_percent").default(50), // max % of order payable by points
  // Tier thresholds (lifetime points)
  silverThreshold: integer("silver_threshold").default(500),
  goldThreshold: integer("gold_threshold").default(2000),
  platinumThreshold: integer("platinum_threshold").default(5000),
  // Tier perks (bonus multiplier for that tier)
  silverMultiplier: real("silver_multiplier").default(1.25),
  goldMultiplier: real("gold_multiplier").default(1.5),
  platinumMultiplier: real("platinum_multiplier").default(2),
  // General
  programName: text("program_name").default("Sweet Rewards"),
  isActive: boolean("is_active").default(true),
});

export const insertRewardConfigSchema = createInsertSchema(rewardConfig).omit({ id: true });
export type InsertRewardConfig = z.infer<typeof insertRewardConfigSchema>;
export type RewardConfig = typeof rewardConfig.$inferSelect;

// ============ GIFT CARDS ============
export const giftCards = pgTable("gift_cards", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(), // e.g. "SH-XXXX-XXXX"
  balance: real("balance").notNull().default(0),
  initialValue: real("initial_value").notNull(),
  customerId: integer("customer_id"), // optional link to customer
  purchasedBy: text("purchased_by"), // name of buyer
  recipientName: text("recipient_name"),
  recipientEmail: text("recipient_email"),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGiftCardSchema = createInsertSchema(giftCards).omit({ id: true, createdAt: true });
export type InsertGiftCard = z.infer<typeof insertGiftCardSchema>;
export type GiftCard = typeof giftCards.$inferSelect;

// ============ CUSTOMER TRANSACTIONS (points + gift card history) ============
export const customerTransactions = pgTable("customer_transactions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id"),
  giftCardId: integer("gift_card_id"),
  type: text("type").notNull(), // 'earn_points' | 'redeem_points' | 'gift_card_purchase' | 'gift_card_reload' | 'gift_card_use'
  amount: real("amount"), // dollar amount
  points: integer("points"), // points earned or redeemed
  orderId: integer("order_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCustomerTransactionSchema = createInsertSchema(customerTransactions).omit({ id: true, createdAt: true });
export type InsertCustomerTransaction = z.infer<typeof insertCustomerTransactionSchema>;
export type CustomerTransaction = typeof customerTransactions.$inferSelect;

// ============ USERS (Admin/Staff) ============
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").default("cashier"), // 'admin' | 'manager' | 'cashier' | 'kitchen'
  locationId: integer("location_id"),
  pin: varchar("pin", { length: 6 }),
  email: text("email"),
  phone: text("phone"),
  hourlyRate: real("hourly_rate"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastLogin: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============ SHIFTS (Clock In/Out) ============
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  locationId: integer("location_id").notNull(),
  clockIn: timestamp("clock_in").notNull().defaultNow(),
  clockOut: timestamp("clock_out"),
  breakMinutes: integer("break_minutes").default(0),
  notes: text("notes"),
  status: text("status").default("active"), // 'active' | 'completed'
  totalHours: real("total_hours"), // calculated on clock-out
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertShiftSchema = createInsertSchema(shifts).omit({ id: true, createdAt: true, totalHours: true });
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;

// ============ SETTLEMENTS (End-of-Day) ============
export const settlements = pgTable("settlements", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  closedBy: integer("closed_by"), // user ID of manager who closed the day
  closedByName: text("closed_by_name"),
  // Cash reconciliation
  startingCash: real("starting_cash").default(200), // float amount at start of day
  expectedCash: real("expected_cash").default(0), // starting + cash sales - cash payouts
  actualCash: real("actual_cash").default(0), // counted by manager
  cashDifference: real("cash_difference").default(0), // actual - expected (over/short)
  // Sales summary
  totalOrders: integer("total_orders").default(0),
  totalRevenue: real("total_revenue").default(0),
  totalTax: real("total_tax").default(0),
  totalTips: real("total_tips").default(0),
  // Payment breakdown
  cashSales: real("cash_sales").default(0),
  cardSales: real("card_sales").default(0),
  giftCardSales: real("gift_card_sales").default(0),
  externalSales: real("external_sales").default(0), // UberEats, DoorDash, etc.
  // Refunds / voids
  totalRefunds: real("total_refunds").default(0),
  cancelledOrders: integer("cancelled_orders").default(0),
  // Labor
  totalLaborHours: real("total_labor_hours").default(0),
  totalLaborCost: real("total_labor_cost").default(0),
  // Notes
  notes: text("notes"),
  status: text("status").default("closed"), // 'closed' | 'adjusted'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSettlementSchema = createInsertSchema(settlements).omit({ id: true, createdAt: true });
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;
export type Settlement = typeof settlements.$inferSelect;

// ============ CASH DRAWER TRANSACTIONS ============
export const cashDrawerTransactions = pgTable("cash_drawer_transactions", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull(),
  type: text("type").notNull(), // 'cash_in' | 'cash_out'
  amount: real("amount").notNull(), // always positive
  reason: text("reason").notNull(), // e.g. "Starting float", "Bank deposit", "Petty cash", "Change added"
  performedBy: text("performed_by"), // name of person
  notes: text("notes"),
  date: text("date").notNull(), // YYYY-MM-DD for grouping by day
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCashDrawerTransactionSchema = createInsertSchema(cashDrawerTransactions).omit({ id: true, createdAt: true });
export type InsertCashDrawerTransaction = z.infer<typeof insertCashDrawerTransactionSchema>;
export type CashDrawerTransaction = typeof cashDrawerTransactions.$inferSelect;

// ============ AUDIT LOG ============
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id"),
  userId: integer("user_id"),
  userName: text("user_name"),
  action: text("action").notNull(), // 'void_order' | 'refund' | 'cancel_order' | 'cash_drawer_open' | 'price_change' | 'discount_applied' | 'split_payment' | 'login' | 'settings_change'
  targetType: text("target_type"), // 'order' | 'menu_item' | 'cash_drawer' | 'user' | 'shift'
  targetId: integer("target_id"),
  details: text("details"), // human-readable description
  metadata: jsonb("metadata").$type<Record<string, any>>(), // structured data
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ============ TIP POOL CONFIG ============
export const tipPoolConfig = pgTable("tip_pool_config", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull(),
  name: text("name").notNull(), // e.g. "Default Pool"
  isActive: boolean("is_active").default(true),
  // Role percentages (must sum to 100)
  cashierPercent: real("cashier_percent").default(40),
  kitchenPercent: real("kitchen_percent").default(30),
  managerPercent: real("manager_percent").default(30),
  // Distribution method
  method: text("method").default("equal"), // 'equal' | 'hours_worked' | 'custom'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTipPoolConfigSchema = createInsertSchema(tipPoolConfig).omit({ id: true, createdAt: true });
export type InsertTipPoolConfig = z.infer<typeof insertTipPoolConfigSchema>;
export type TipPoolConfig = typeof tipPoolConfig.$inferSelect;
