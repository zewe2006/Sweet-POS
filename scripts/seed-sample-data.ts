/**
 * Seed sample data: orders + employee shifts for all 3 locations over the past 7 days.
 * Run: npx tsx scripts/seed-sample-data.ts
 */
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "../shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ── Config ──

const LOCATIONS = [
  { id: 1, prefix: "MT" },
  { id: 2, prefix: "DL" },
  { id: 3, prefix: "DV" },
];

// Employees per location (userId)
const EMPLOYEES: Record<number, number[]> = {
  1: [2, 3, 5],   // Midtown: David, Jessica, Sarah
  2: [3, 4],       // Duluth: Jessica, Michael
  3: [4, 5],       // Doraville: Michael, Sarah
};

const DRINKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29];
const FOOD = [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44];

const SOURCES = ["pos", "pos", "pos", "pos", "ubereats", "doordash"];
const ORDER_TYPES = ["dine_in", "dine_in", "dine_in", "takeout", "pickup", "delivery"];
const PAY_METHODS = ["cash", "cash", "cash", "stripe", "stripe", "stripe", "gift_card"];
const NAMES = [
  null, null, null, null, "Alice", "Bob", "Cindy", "Derek", "Emily", "Frank",
  "Grace", "Helen", "Ian", "Julia", "Kevin", "Linda", "Mike", "Nancy", "Oscar", "Pam",
];

// ── Helpers ──

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function round2(n: number): number { return Math.round(n * 100) / 100; }

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

function randomTime(date: string, hourMin: number, hourMax: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, randInt(hourMin, hourMax), randInt(0, 59), randInt(0, 59));
}

// ── Main ──

async function main() {
  // Load menu items with prices
  const menuItems = await db.select().from(schema.menuItems);
  const itemMap = new Map(menuItems.map(i => [i.id, i]));

  // Track order counters per location
  const counters: Record<number, number> = { 1: 3, 2: 0, 3: 0 }; // Location 1 already has 3 orders

  let totalOrders = 0;
  let totalShifts = 0;

  for (let daysAgo = 7; daysAgo >= 1; daysAgo--) {
    const ds = dateStr(daysAgo);
    console.log(`\n📅 ${ds}`);

    for (const loc of LOCATIONS) {
      // Orders: busier midtown, moderate others
      const numOrders = loc.id === 1 ? randInt(15, 25) : loc.id === 2 ? randInt(10, 18) : randInt(8, 14);

      for (let i = 0; i < numOrders; i++) {
        counters[loc.id]++;
        const orderNum = `${loc.prefix}-${String(counters[loc.id]).padStart(4, "0")}`;
        const orderTime = randomTime(ds, 9, 21);

        const source = pick(SOURCES);
        const isExternal = source === "ubereats" || source === "doordash";
        const paymentMethod = isExternal ? "external" : pick(PAY_METHODS);
        const type = isExternal ? "delivery" : pick(ORDER_TYPES);

        // Build items (1-4)
        const numItems = randInt(1, 4);
        const orderItemsList: Array<{ menuItemId: number; quantity: number; unitPrice: number; name: string }> = [];
        for (let j = 0; j < numItems; j++) {
          const itemId = Math.random() < 0.7 ? pick(DRINKS) : pick(FOOD);
          const item = itemMap.get(itemId);
          if (!item) continue;
          orderItemsList.push({
            menuItemId: item.id,
            quantity: Math.random() < 0.85 ? 1 : 2,
            unitPrice: item.price,
            name: item.name,
          });
        }
        if (orderItemsList.length === 0) continue;

        const subtotal = round2(orderItemsList.reduce((s, it) => s + it.unitPrice * it.quantity, 0));
        const tax = round2(subtotal * 0.08);
        const tip = isExternal ? round2(Math.random() < 0.6 ? randInt(1, 5) : 0) : 0;
        const total = round2(subtotal + tax + tip);

        // ~5% chance of cancelled
        const isCancelled = Math.random() < 0.05;
        // For POS: paid → "closed", unpaid → "open"; external → "closed"
        const status = isCancelled ? "cancelled" : "closed";

        const completedAt = isCancelled ? null : new Date(orderTime.getTime() + randInt(5, 30) * 60000);

        // Insert order
        const [order] = await db.insert(schema.orders).values({
          locationId: loc.id,
          orderNumber: orderNum,
          source,
          type,
          status,
          customerName: pick(NAMES),
          customerPhone: null,
          subtotal,
          tax,
          tip,
          total,
          paymentMethod,
          paymentIntentId: null,
          externalOrderId: isExternal ? `ext-${Date.now()}-${randInt(1000, 9999)}` : null,
          notes: null,
          createdAt: orderTime,
          updatedAt: orderTime,
          completedAt,
          cashierId: null,
        }).returning();

        // Insert order items
        for (const it of orderItemsList) {
          await db.insert(schema.orderItems).values({
            orderId: order.id,
            menuItemId: it.menuItemId,
            name: it.name,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            modifiers: [],
            notes: null,
            prepStation: null,
          });
        }
        totalOrders++;
      }

      // Shifts: each employee works most days (90% chance)
      const emps = EMPLOYEES[loc.id];
      for (const userId of emps) {
        if (Math.random() < 0.1) continue; // 10% day off

        const morning = Math.random() < 0.5;
        const clockIn = randomTime(ds, morning ? 8 : 13, morning ? 9 : 14);
        const hoursWorked = randInt(5, 9);
        const clockOut = new Date(clockIn.getTime() + hoursWorked * 3600000 + randInt(0, 30) * 60000);
        const breakMins = randInt(15, 45);
        const totalHours = round2(hoursWorked - breakMins / 60);

        await db.insert(schema.shifts).values({
          userId,
          locationId: loc.id,
          clockIn,
          clockOut,
          breakMinutes: breakMins,
          notes: null,
          status: "completed",
          totalHours: Math.max(0, totalHours),
        });
        totalShifts++;
      }

      console.log(`  📍 ${loc.prefix}: ${numOrders} orders, ${emps.length} shifts`);
    }
  }

  console.log(`\n✅ Done! Created ${totalOrders} orders and ${totalShifts} shifts across 7 days.`);
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  pool.end();
  process.exit(1);
});
