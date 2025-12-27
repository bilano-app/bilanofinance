import { db } from "./db";
import {
  users, transactions, investments, targets,
  type User, type Transaction, type Investment, type Target,
  type InsertUser, type InsertTransaction, type InsertInvestment, type InsertTarget
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(id: number, newBalance: number): Promise<User>;
  
  // Transactions
  getTransactions(userId: number): Promise<Transaction[]>;
  createTransaction(userId: number, transaction: Omit<InsertTransaction, "userId">): Promise<Transaction>;
  
  // Investments
  getInvestments(userId: number): Promise<Investment[]>;
  getInvestmentBySymbol(userId: number, symbol: string): Promise<Investment | undefined>;
  createInvestment(userId: number, investment: Omit<InsertInvestment, "userId">): Promise<Investment>;
  updateInvestment(id: number, quantity: number, avgPrice: number): Promise<Investment>;
  deleteInvestment(id: number): Promise<void>;
  
  // Targets
  getTarget(userId: number): Promise<Target | undefined>;
  setTarget(userId: number, target: Omit<InsertTarget, "userId">): Promise<Target>;
  updateTargetDuration(id: number, newDuration: number): Promise<Target>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({ ...insertUser, cashBalance: 0 }).returning();
    return user;
  }

  async updateUserBalance(id: number, newBalance: number): Promise<User> {
    const [user] = await db.update(users)
      .set({ cashBalance: newBalance })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
  }

  async createTransaction(userId: number, transaction: Omit<InsertTransaction, "userId">): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions)
      .values({ ...transaction, userId })
      .returning();
    return newTransaction;
  }

  async getInvestments(userId: number): Promise<Investment[]> {
    return await db.select().from(investments).where(eq(investments.userId, userId));
  }

  async getInvestmentBySymbol(userId: number, symbol: string): Promise<Investment | undefined> {
    const [investment] = await db.select().from(investments)
      .where(and(eq(investments.userId, userId), eq(investments.symbol, symbol)));
    return investment;
  }

  async createInvestment(userId: number, investment: Omit<InsertInvestment, "userId">): Promise<Investment> {
    const [newInvestment] = await db.insert(investments)
      .values({ ...investment, userId })
      .returning();
    return newInvestment;
  }

  async updateInvestment(id: number, quantity: number, avgPrice: number): Promise<Investment> {
    const [updated] = await db.update(investments)
      .set({ quantity, avgPrice })
      .where(eq(investments.id, id))
      .returning();
    return updated;
  }

  async deleteInvestment(id: number): Promise<void> {
    await db.delete(investments).where(eq(investments.id, id));
  }

  async getTarget(userId: number): Promise<Target | undefined> {
    const [target] = await db.select().from(targets).where(eq(targets.userId, userId));
    return target;
  }

  async setTarget(userId: number, target: Omit<InsertTarget, "userId">): Promise<Target> {
    // Upsert logic could be better, but simple delete-create for now or check exist
    const existing = await this.getTarget(userId);
    if (existing) {
      const [updated] = await db.update(targets)
        .set(target)
        .where(eq(targets.id, existing.id))
        .returning();
      return updated;
    }
    const [newTarget] = await db.insert(targets)
      .values({ ...target, userId })
      .returning();
    return newTarget;
  }

  async updateTargetDuration(id: number, newDuration: number): Promise<Target> {
    const [updated] = await db.update(targets)
      .set({ durationMonths: newDuration })
      .where(eq(targets.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
