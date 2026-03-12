import { db } from "./db.js";
import { eq, and, desc } from "drizzle-orm";
import { 
  users, transactions, investments, targets, categories, forexAssets, debts, subscriptions,
  type User, type InsertUser, 
  type Transaction, type InsertTransaction,
  type Investment, type InsertInvestment,
  type Target, type InsertTarget,
  type Category, type InsertCategory,
  type ForexAsset, 
  type Debt, type InsertDebt,
  type Subscription, type InsertSubscription 
} from "../shared/schema.js"; 

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(id: number, newBalance: number): Promise<User>;
  updateUserProfile(id: number, firstName: string, lastName: string, profilePicture?: string): Promise<User>;
  
  getAllUsers(): Promise<User[]>;
  updateUserOneSignalId(userId: number, onesignalId: string): Promise<User>;

  getTransactions(userId: number): Promise<Transaction[]>;
  createTransaction(userId: number, transaction: InsertTransaction): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;

  getInvestments(userId: number): Promise<Investment[]>;
  createInvestment(userId: number, investment: InsertInvestment): Promise<Investment>;
  getInvestmentBySymbol(userId: number, symbol: string): Promise<Investment | undefined>;
  updateInvestment(id: number, quantity: number, avgPrice: number): Promise<Investment>;
  deleteInvestment(id: number): Promise<void>;

  getTarget(userId: number): Promise<Target | undefined>;
  setTarget(userId: number, target: InsertTarget): Promise<Target>;
  deleteTarget(userId: number): Promise<void>;
  updateTargetPenalty(userId: number, penaltyAmount: Promise<Target> | number): Promise<Target>;

  getCategories(userId: number): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  // 🚀 FIX: Deklarasi fungsi hapus kategori
  deleteCategory(id: number): Promise<void>;

  getForexAssets(userId: number): Promise<ForexAsset[]>;
  createForexAsset(userId: number, asset: any): Promise<ForexAsset>;
  updateForexAsset(id: number, amount: number): Promise<void>;
  getForexByCurrency(userId: number, currency: string): Promise<ForexAsset | undefined>;

  getDebts(userId: number): Promise<Debt[]>;
  createDebt(userId: number, debt: InsertDebt): Promise<Debt>;
  markDebtPaid(id: number): Promise<Debt>;
  deleteDebt(id: number): Promise<void>;

  getSubscriptions(userId: number): Promise<Subscription[]>;
  createSubscription(userId: number, sub: InsertSubscription): Promise<Subscription>;
  toggleSubscriptionStatus(id: number, isActive: boolean): Promise<Subscription>;
  deleteSubscription(id: number): Promise<void>;
  processDueSubscriptions(userId: number): Promise<string[]>; 

  updateUserProStatus(userId: number, isPro: boolean, validUntil: Date | null): Promise<User>;
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

  async getAllUsers(): Promise<User[]> {
      return await db.select().from(users);
  }

  async updateUserOneSignalId(userId: number, onesignalId: string): Promise<User> {
      const [updatedUser] = await db.update(users)
          .set({ onesignalId })
          .where(eq(users.id, userId))
          .returning();
      return updatedUser;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      cashBalance: 0,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      profilePicture: insertUser.profilePicture || null
    }).returning();
    return user;
  }
  
  async updateUserBalance(id: number, newBalance: number): Promise<User> {
    const [user] = await db.update(users).set({ cashBalance: newBalance }).where(eq(users.id, id)).returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateUserProStatus(userId: number, isPro: boolean, validUntil: Date | null): Promise<User> {
    const [updatedUser] = await db.update(users)
        .set({ isPro, proValidUntil: validUntil })
        .where(eq(users.id, userId))
        .returning();
    return updatedUser;
  }

  async updateUserProfile(id: number, firstName: string, lastName: string, profilePicture?: string): Promise<User> {
      const [user] = await db.update(users).set({ 
          firstName, 
          lastName,
          ...(profilePicture !== undefined ? { profilePicture } : {})
      }).where(eq(users.id, id)).returning();
      if (!user) throw new Error("User not found");
      return user;
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.date));
  }
  
  async createTransaction(userId: number, tx: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values({
        ...tx, 
        userId, 
        date: new Date(), 
        description: tx.description || null
    }).returning();
    return transaction;
  }

  async deleteTransaction(id: number): Promise<void> {
      await db.delete(transactions).where(eq(transactions.id, id));
  }

  async getInvestments(userId: number): Promise<Investment[]> {
      return await db.select().from(investments).where(eq(investments.userId, userId));
  }
  
  async createInvestment(userId: number, inv: InsertInvestment): Promise<Investment> {
      const [investment] = await db.insert(investments).values({
          ...inv, userId, type: inv.type || 'saham'
      }).returning();
      return investment;
  }
  
  async getInvestmentBySymbol(userId: number, symbol: string): Promise<Investment | undefined> {
      const [inv] = await db.select().from(investments).where(and(eq(investments.userId, userId), eq(investments.symbol, symbol)));
      return inv;
  }
  
  async updateInvestment(id: number, quantity: number, avgPrice: number): Promise<Investment> {
      const [updated] = await db.update(investments).set({ quantity, avgPrice }).where(eq(investments.id, id)).returning();
      if (!updated) throw new Error("Not found");
      return updated;
  }
  
  async deleteInvestment(id: number): Promise<void> {
      await db.delete(investments).where(eq(investments.id, id));
  }

  async getTarget(userId: number): Promise<Target | undefined> {
      const [target] = await db.select().from(targets).where(eq(targets.userId, userId));
      return target;
  }
  
  async setTarget(userId: number, t: InsertTarget): Promise<Target> {
      await db.delete(targets).where(eq(targets.userId, userId));
      const [target] = await db.insert(targets).values({
          ...t, 
          userId, 
          monthlyBudget: t.monthlyBudget || 0, 
          budgetType: t.budgetType || 'static', 
          startMonth: t.startMonth || 1, 
          startYear: t.startYear || 2026
      }).returning();
      return target;
  }
  
  async deleteTarget(userId: number): Promise<void> {
      await db.delete(targets).where(eq(targets.userId, userId));
  }
  
  async updateTargetPenalty(userId: number, penaltyAmount: any): Promise<Target> {
      const target = await this.getTarget(userId);
      if (!target) throw new Error("Target not found");
      return target; 
  }

  async getCategories(userId: number): Promise<Category[]> {
      return await db.select().from(categories).where(eq(categories.userId, userId));
  }
  
  async createCategory(cat: InsertCategory): Promise<Category> {
      const [category] = await db.insert(categories).values({
          ...cat, userId: cat.userId || 1, icon: cat.icon || null, color: cat.color || null
      }).returning();
      return category;
  }

  // 🚀 FIX: Implementasi fungsi hapus kategori yang hilang
  async deleteCategory(id: number): Promise<void> {
      await db.delete(categories).where(eq(categories.id, id));
  }

  async getForexAssets(userId: number): Promise<ForexAsset[]> {
      return await db.select().from(forexAssets).where(eq(forexAssets.userId, userId));
  }
  
  async createForexAsset(userId: number, asset: any): Promise<ForexAsset> {
      const [newAsset] = await db.insert(forexAssets).values({ ...asset, userId }).returning();
      return newAsset;
  }

  async updateForexAsset(id: number, amount: number): Promise<void> {
      await db.update(forexAssets).set({ amount }).where(eq(forexAssets.id, id));
  }

  async getForexByCurrency(userId: number, currency: string): Promise<ForexAsset | undefined> {
      const [asset] = await db.select().from(forexAssets).where(and(eq(forexAssets.userId, userId), eq(forexAssets.currency, currency)));
      return asset;
  }

  async getDebts(userId: number): Promise<Debt[]> {
      const list = await db.select().from(debts).where(eq(debts.userId, userId));
      return list.sort((a, b) => (Number(a.isPaid) - Number(b.isPaid)));
  }
  
  async createDebt(userId: number, debt: InsertDebt): Promise<Debt> {
      const [newDebt] = await db.insert(debts).values({
          ...debt, userId, isPaid: false, dueDate: debt.dueDate ? new Date(debt.dueDate) : null
      }).returning();
      return newDebt;
  }
  
  async markDebtPaid(id: number): Promise<Debt> {
      const [updated] = await db.update(debts).set({ isPaid: true }).where(eq(debts.id, id)).returning();
      if (!updated) throw new Error("Not found");
      return updated;
  }
  
  async deleteDebt(id: number): Promise<void> {
      await db.delete(debts).where(eq(debts.id, id));
  }

  async getSubscriptions(userId: number): Promise<Subscription[]> {
      await this.processDueSubscriptions(userId);
      return await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  }
  
  async createSubscription(userId: number, sub: InsertSubscription): Promise<Subscription> {
      const [newSub] = await db.insert(subscriptions).values({
          ...sub, userId, isActive: true, nextBilling: sub.nextBilling ? new Date(sub.nextBilling) : null
      }).returning();
      return newSub;
  }
  
  async toggleSubscriptionStatus(id: number, isActive: boolean): Promise<Subscription> {
      const [updated] = await db.update(subscriptions).set({ isActive }).where(eq(subscriptions.id, id)).returning();
      if(!updated) throw new Error("Subscription not found");
      return updated;
  }
  
  async deleteSubscription(id: number): Promise<void> {
      await db.delete(subscriptions).where(eq(subscriptions.id, id));
  }

  async processDueSubscriptions(userId: number): Promise<string[]> {
      const today = new Date(); today.setHours(0,0,0,0);
      const logs: string[] = [];
      const userSubs = await db.select().from(subscriptions).where(and(eq(subscriptions.userId, userId), eq(subscriptions.isActive, true)));

      for (const sub of userSubs) {
          if (!sub.nextBilling) continue;
          let nextPayment = new Date(sub.nextBilling); nextPayment.setHours(0,0,0,0);
          let processed = false; let loopGuard = 0; 
          
          while (nextPayment <= today && loopGuard < 12) {
              const amount = sub.cost;
              await this.createTransaction(userId, { type: 'expense', amount, category: 'Langganan', description: `Bayar Otomatis: ${sub.name}` } as any);
              const user = await this.getUser(userId); 
              if (user) await this.updateUserBalance(userId, user.cashBalance - amount);
              logs.push(`Membayar ${sub.name}`);
              
              if (sub.cycle === 'bulanan') nextPayment.setMonth(nextPayment.getMonth() + 1);
              else if (sub.cycle === 'tahunan') nextPayment.setFullYear(nextPayment.getFullYear() + 1);
              else nextPayment.setMonth(nextPayment.getMonth() + 1);
              
              processed = true; loopGuard++;
          }
          if (processed) { 
              await db.update(subscriptions).set({ nextBilling: nextPayment }).where(eq(subscriptions.id, sub.id));
          }
      }
      return logs;
  }
}

export const storage = new DatabaseStorage();