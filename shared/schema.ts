import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  cashBalance: integer("cash_balance").default(0).notNull(), // FCF in cents
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // 'income', 'expense', 'buy', 'sell'
  category: text("category").notNull(),
  amount: integer("amount").notNull(), // cents
  description: text("description"),
  date: timestamp("date").defaultNow().notNull(),
});

export const investments = pgTable("investments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  symbol: text("symbol").notNull(),
  quantity: integer("quantity").notNull(),
  avgPrice: integer("avg_price").notNull(), // cents
});

export const targets = pgTable("targets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  targetAmount: integer("target_amount").notNull(), // cents
  durationMonths: integer("duration_months").notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({ username: true, password: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, date: true });
export const insertInvestmentSchema = createInsertSchema(investments).omit({ id: true });
export const insertTargetSchema = createInsertSchema(targets).omit({ id: true, startDate: true });

// Types
export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Investment = typeof investments.$inferSelect;
export type Target = typeof targets.$inferSelect;
