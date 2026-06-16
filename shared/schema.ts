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
  createdAt: timestamp("created_at").defaultNow(),
});

// --- 4. TARGETS ---
export const targets = pgTable("targets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  targetAmount: bigint("target_amount", { mode: "number" }).default(0).notNull(),
  durationMonths: integer("duration_months").default(12).notNull(),
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
  amount: bigint("amount", { mode: "number" }).notNull(),
  type: text("type").notNull(),
  dueDate: timestamp("due_date"),
  isPaid: boolean("is_paid").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- 6. SUBSCRIPTIONS ---
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
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
  createdAt: timestamp("created_at").defaultNow(),
});

// --- 9. OTP SESSIONS ---
export const otpSessions = pgTable("otp_sessions", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- 10. PORTFOLIO SNAPSHOTS (EXPERT TERMINAL) ---
export const portfolioSnapshots = pgTable("portfolio_snapshots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  cashBalance: real("cash_balance").notNull(),
  investValue: real("invest_value").notNull(),
  totalValue: real("total_value").notNull(),
  assetsDetail: text("assets_detail"), // JSON Data Persentase
  createdAt: timestamp("created_at").defaultNow(),
});


// --- ZOD SCHEMAS ---
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTransactionSchema = createInsertSchema(transactions, { date: z.coerce.date() }).omit({ id: true, userId: true });
export const insertInvestmentSchema = createInsertSchema(investments).omit({ id: true, userId: true, createdAt: true });
export const insertTargetSchema = createInsertSchema(targets).omit({ id: true, userId: true });
export const insertDebtSchema = createInsertSchema(debts, { dueDate: z.coerce.date() }).omit({ id: true, userId: true, createdAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions, { nextBilling: z.coerce.date() }).omit({ id: true, userId: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, userId: true });
export const insertForexAssetSchema = createInsertSchema(forexAssets).omit({ id: true, userId: true, createdAt: true });
export const insertOtpSessionSchema = createInsertSchema(otpSessions).omit({ id: true, createdAt: true });

// =======================================================
// EXPORT TYPES (PERBAIKAN AGAR TIDAK ERROR DI FRONTEND)
// =======================================================
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

export type Investment = typeof investments.$inferSelect;
export type InsertInvestment = typeof investments.$inferInsert;

export type Target = typeof targets.$inferSelect;
export type InsertTarget = typeof targets.$inferInsert;

export type Debt = typeof debts.$inferSelect;
export type InsertDebt = typeof debts.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

export type ForexAsset = typeof forexAssets.$inferSelect;
export type InsertForexAsset = typeof forexAssets.$inferInsert;

export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;
export type InsertPortfolioSnapshot = typeof portfolioSnapshots.$inferInsert;