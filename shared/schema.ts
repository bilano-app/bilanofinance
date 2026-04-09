import { pgTable, text, serial, integer, boolean, timestamp, real, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- 1. USERS ---
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email"),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profilePicture: text("profile_picture"),
  // 🚀 UPGRADE KE BIGINT
  cashBalance: bigint("cash_balance", { mode: "number" }).default(0).notNull(),
  isPro: boolean("is_pro").default(false),
  proValidUntil: timestamp("pro_valid_until"), 
  onesignalId: text("onesignal_id"), 
  createdAt: timestamp("created_at").defaultNow(), 
});

// --- 2. TRANSACTIONS ---
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), 
  // 🚀 UPGRADE KE BIGINT
  amount: bigint("amount", { mode: "number" }).notNull(),
  category: text("category").notNull(),
  description: text("description"),
  date: timestamp("date").notNull().defaultNow(),
});

// --- 3. INVESTMENTS ---
export const investments = pgTable("investments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  symbol: text("symbol").notNull(),
  quantity: real("quantity").notNull(),
  avgPrice: real("avg_price").notNull(),
  type: text("type").default('saham'),
});

// --- 4. TARGETS ---
export const targets = pgTable("targets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  // 🚀 UPGRADE KE BIGINT
  targetAmount: bigint("target_amount", { mode: "number" }).default(0).notNull(),
  durationMonths: integer("duration_months").default(12).notNull(),
  // 🚀 UPGRADE KE BIGINT
  monthlyBudget: bigint("monthly_budget", { mode: "number" }).default(0).notNull(),
  budgetType: text("budget_type").default('static'),
  startMonth: integer("start_month").default(1),
  startYear: integer("start_year").default(2026),
});

// --- 5. DEBTS ---
export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  // 🚀 UPGRADE KE BIGINT
  amount: bigint("amount", { mode: "number" }).notNull(),
  type: text("type").notNull(),
  dueDate: timestamp("due_date"),
  isPaid: boolean("is_paid").default(false),
});

// --- 6. SUBSCRIPTIONS ---
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  // 🚀 UPGRADE KE BIGINT
  cost: bigint("cost", { mode: "number" }).notNull(),
  cycle: text("cycle").default('bulanan'),
  nextBilling: timestamp("next_billing"),
  isActive: boolean("is_active").default(true),
});

// --- 7. CATEGORIES ---
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  icon: text("icon"),
  color: text("color"),
});

// --- 8. FOREX ASSETS (TABEL VALAS) ---
export const forexAssets = pgTable("forex_assets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  currency: text("currency").notNull(), 
  amount: real("amount").notNull(), 
});

// --- ZOD SCHEMAS ---
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTransactionSchema = createInsertSchema(transactions, { date: z.coerce.date() }).omit({ id: true, userId: true });
export const insertInvestmentSchema = createInsertSchema(investments).omit({ id: true, userId: true });
export const insertTargetSchema = createInsertSchema(targets).omit({ id: true, userId: true });
export const insertDebtSchema = createInsertSchema(debts, { dueDate: z.coerce.date() }).omit({ id: true, userId: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions, { nextBilling: z.coerce.date() }).omit({ id: true, userId: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, userId: true });
export const insertForexAssetSchema = createInsertSchema(forexAssets).omit({ id: true, userId: true });

// Export Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type Investment = typeof investments.$inferSelect;
export type Target = typeof targets.$inferSelect;
export type Debt = typeof debts.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type ForexAsset = typeof forexAssets.$inferSelect;