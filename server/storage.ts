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
} from "../shared/schema"; 
// -------------------------------------------------------

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(id: number, newBalance: number): Promise<User>;
  updateUserProfile(id: number, firstName: string, lastName: string, profilePicture?: string): Promise<User>;

  getTransactions(userId: number): Promise<Transaction[]>;
  createTransaction(userId: number, transaction: InsertTransaction): Promise<Transaction>;

  getInvestments(userId: number): Promise<Investment[]>;
  createInvestment(userId: number, investment: InsertInvestment): Promise<Investment>;
  getInvestmentBySymbol(userId: number, symbol: string): Promise<Investment | undefined>;
  updateInvestment(id: number, quantity: number, avgPrice: number): Promise<Investment>;
  deleteInvestment(id: number): Promise<void>;

  getTarget(userId: number): Promise<Target | undefined>;
  setTarget(userId: number, target: InsertTarget): Promise<Target>;
  deleteTarget(userId: number): Promise<void>;
  updateTargetPenalty(userId: number, penaltyAmount: number): Promise<Target>;

  getCategories(userId: number): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // FOREX METHODS (UPDATED)
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<number, Transaction>;
  private investments: Map<number, Investment>;
  private targets: Map<number, Target>;
  private categories: Map<number, Category>;
  private forexAssets: Map<number, ForexAsset>;
  private debts: Map<number, Debt>;
  private subscriptions: Map<number, Subscription>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.investments = new Map();
    this.targets = new Map();
    this.categories = new Map();
    this.forexAssets = new Map();
    this.debts = new Map();
    this.subscriptions = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> { return this.users.get(id); }
  
  async getUserByUsername(username: string): Promise<User | undefined> { 
    return Array.from(this.users.values()).find((user) => user.username === username); 
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
        ...insertUser, 
        id, 
        cashBalance: 0,
        firstName: insertUser.firstName || null,
        lastName: insertUser.lastName || null,
        profilePicture: insertUser.profilePicture || null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserBalance(id: number, newBalance: number): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    const updatedUser = { ...user, cashBalance: newBalance };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserProfile(id: number, firstName: string, lastName: string, profilePicture?: string): Promise<User> {
      const user = this.users.get(id);
      if (!user) throw new Error("User not found");
      
      const updatedUser = { 
          ...user, 
          firstName, 
          lastName,
          profilePicture: profilePicture !== undefined ? profilePicture : user.profilePicture
      };
      this.users.set(id, updatedUser);
      return updatedUser;
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter((t) => t.userId === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  async createTransaction(userId: number, tx: InsertTransaction): Promise<Transaction> {
    const id = this.currentId++;
    const transaction: Transaction = { ...tx, id, userId, date: new Date(), description: tx.description || null };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getInvestments(userId: number): Promise<Investment[]> { return Array.from(this.investments.values()).filter((i) => i.userId === userId); }
  async createInvestment(userId: number, inv: InsertInvestment): Promise<Investment> {
    const id = this.currentId++; const investment: Investment = { ...inv, id, userId, type: inv.type || 'saham' }; this.investments.set(id, investment); return investment;
  }
  async getInvestmentBySymbol(userId: number, symbol: string): Promise<Investment | undefined> { return Array.from(this.investments.values()).find((i) => i.userId === userId && i.symbol === symbol); }
  async updateInvestment(id: number, quantity: number, avgPrice: number): Promise<Investment> {
    const inv = this.investments.get(id); if (!inv) throw new Error("Not found"); const updated = { ...inv, quantity, avgPrice }; this.investments.set(id, updated); return updated;
  }
  async deleteInvestment(id: number): Promise<void> { this.investments.delete(id); }

  async getTarget(userId: number): Promise<Target | undefined> { return Array.from(this.targets.values()).find(t => t.userId === userId); }
  async setTarget(userId: number, t: InsertTarget): Promise<Target> {
    const existing = await this.getTarget(userId); if (existing) this.targets.delete(existing.id);
    const id = this.currentId++; 
    const target: Target = { ...t, id, userId, monthlyBudget: t.monthlyBudget||0, budgetType: t.budgetType||'static', startMonth: t.startMonth||1, startYear: t.startYear||2026 }; 
    this.targets.set(id, target); return target;
  }
  async deleteTarget(userId: number): Promise<void> { const existing = await this.getTarget(userId); if (existing) this.targets.delete(existing.id); }
  
  async updateTargetPenalty(userId: number, penaltyAmount: number): Promise<Target> {
      const target = await this.getTarget(userId);
      if (!target) throw new Error("Target not found");
      // Logic penalty mockup
      return target;
  }

  async getCategories(userId: number): Promise<Category[]> { return Array.from(this.categories.values()).filter(c => c.userId === userId); }
  async createCategory(cat: InsertCategory): Promise<Category> { const id = this.currentId++; const category: Category = { ...cat, id, userId: cat.userId||1, icon: cat.icon||null, color: cat.color||null }; this.categories.set(id, category); return category; }

  // --- FOREX METHODS (DIPERBAIKI AGAR SESUAI ROUTES) ---
  async getForexAssets(userId: number): Promise<ForexAsset[]> { return Array.from(this.forexAssets.values()).filter(f => f.userId === userId); }
  
  async createForexAsset(userId: number, asset: any): Promise<ForexAsset> {
    const id = this.currentId++;
    const newAsset: ForexAsset = { ...asset, id, userId };
    this.forexAssets.set(id, newAsset);
    return newAsset;
  }

  async updateForexAsset(id: number, amount: number): Promise<void> {
    const asset = this.forexAssets.get(id);
    if (asset) {
        const updated = { ...asset, amount };
        this.forexAssets.set(id, updated);
    }
  }

  async getForexByCurrency(userId: number, currency: string): Promise<ForexAsset | undefined> {
    return Array.from(this.forexAssets.values()).find(f => f.userId === userId && f.currency === currency);
  }

  async getDebts(userId: number): Promise<Debt[]> { return Array.from(this.debts.values()).filter(d => d.userId === userId).sort((a, b) => (Number(a.isPaid) - Number(b.isPaid))); }
  async createDebt(userId: number, debt: InsertDebt): Promise<Debt> { const id = this.currentId++; const newDebt: Debt = { ...debt, id, userId, isPaid: false, dueDate: debt.dueDate ? new Date(debt.dueDate) : null }; this.debts.set(id, newDebt); return newDebt; }
  async markDebtPaid(id: number): Promise<Debt> { const debt = this.debts.get(id); if (!debt) throw new Error("Not found"); const updated = { ...debt, isPaid: true }; this.debts.set(id, updated); return updated; }
  async deleteDebt(id: number): Promise<void> { this.debts.delete(id); }

  async getSubscriptions(userId: number): Promise<Subscription[]> {
      await this.processDueSubscriptions(userId);
      return Array.from(this.subscriptions.values()).filter(s => s.userId === userId);
  }
  async createSubscription(userId: number, sub: InsertSubscription): Promise<Subscription> {
      const id = this.currentId++; const newSub: Subscription = { ...sub, id, userId, isActive: true, nextBilling: sub.nextBilling ? new Date(sub.nextBilling) : null }; this.subscriptions.set(id, newSub); return newSub;
  }
  async toggleSubscriptionStatus(id: number, isActive: boolean): Promise<Subscription> {
      const sub = this.subscriptions.get(id); if(!sub) throw new Error("Subscription not found"); const updated = { ...sub, isActive }; this.subscriptions.set(id, updated); return updated;
  }
  async deleteSubscription(id: number): Promise<void> { this.subscriptions.delete(id); }

  async processDueSubscriptions(userId: number): Promise<string[]> {
      const today = new Date(); today.setHours(0,0,0,0);
      const logs: string[] = [];
      const userSubs = Array.from(this.subscriptions.values()).filter(s => s.userId === userId && s.isActive);

      for (const sub of userSubs) {
          if (!sub.nextBilling) continue;
          let nextPayment = new Date(sub.nextBilling); nextPayment.setHours(0,0,0,0);
          let processed = false; let loopGuard = 0; 
          while (nextPayment <= today && loopGuard < 12) {
              const amount = sub.cost;
              await this.createTransaction(userId, { type: 'expense', amount, category: 'Langganan', description: `Bayar Otomatis: ${sub.name}` });
              const user = await this.getUser(userId); if (user) await this.updateUserBalance(userId, user.cashBalance - amount);
              logs.push(`Membayar ${sub.name}`);
              
              // Next Cycle
              if (sub.cycle === 'bulanan') nextPayment.setMonth(nextPayment.getMonth() + 1);
              else if (sub.cycle === 'tahunan') nextPayment.setFullYear(nextPayment.getFullYear() + 1);
              else nextPayment.setMonth(nextPayment.getMonth() + 1);
              
              processed = true; loopGuard++;
          }
          if (processed) { const updatedSub = { ...sub, nextBilling: nextPayment }; this.subscriptions.set(sub.id, updatedSub); }
      }
      return logs;
  }
}
export const storage = new MemStorage();