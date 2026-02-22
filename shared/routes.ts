import { z } from 'zod';
import { insertTransactionSchema, insertInvestmentSchema, insertTargetSchema, transactions, investments, targets, users } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  user: {
    get: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    updateBalance: { // For manual "Current Cash" addition
      method: 'POST' as const,
      path: '/api/user/balance',
      input: z.object({ amount: z.number() }), // amount to add in cents
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
      },
    }
  },
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions',
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/transactions',
      input: insertTransactionSchema.omit({ userId: true }),
      responses: {
        201: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  investments: {
    list: {
      method: 'GET' as const,
      path: '/api/investments',
      responses: {
        200: z.array(z.custom<typeof investments.$inferSelect>()),
      },
    },
    buy: {
      method: 'POST' as const,
      path: '/api/investments/buy',
      input: z.object({ symbol: z.string(), quantity: z.number(), price: z.number() }),
      responses: {
        200: z.custom<typeof investments.$inferSelect>(),
        400: errorSchemas.validation, // Insufficient funds
      },
    },
    sell: {
      method: 'POST' as const,
      path: '/api/investments/sell',
      input: z.object({ symbol: z.string(), quantity: z.number(), price: z.number() }),
      responses: {
        200: z.custom<typeof investments.$inferSelect>(),
        400: errorSchemas.validation, // Insufficient qty
      },
    },
  },
  target: {
    get: {
      method: 'GET' as const,
      path: '/api/target',
      responses: {
        200: z.custom<typeof targets.$inferSelect>().nullable(),
      },
    },
    set: {
      method: 'POST' as const,
      path: '/api/target',
      input: z.object({ targetAmount: z.number(), durationMonths: z.number(), addCurrentCash: z.number().optional() }),
      responses: {
        200: z.custom<typeof targets.$inferSelect>(),
      },
    },
    resetMonth: {
      method: 'POST' as const,
      path: '/api/target/reset-month',
      responses: {
        200: z.custom<typeof targets.$inferSelect>(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;

// =================================================================
  // 8. AI CONTEXT PROVIDER (Data Feed untuk Chatbot)
  // =================================================================
  
  app.get("/api/ai/context", async (req, res) => {
      const userId = 1;
      const user = await storage.getUser(userId);
      const target = await storage.getTarget(userId);
      const allTx = await storage.getTransactions(userId);
      const investments = await storage.getInvestments(userId);
      
      // 1. Analisa Arus Kas (30 Hari Terakhir)
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      
      const recentTx = allTx.filter(t => new Date(t.date) >= thirtyDaysAgo);
      const income = recentTx.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = recentTx.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      
      // Top Pengeluaran
      const expenseCats: Record<string, number> = {};
      recentTx.filter(t => t.type === 'expense').forEach(t => {
          expenseCats[t.category] = (expenseCats[t.category] || 0) + t.amount;
      });
      const topExpense = Object.entries(expenseCats).sort((a,b) => b[1] - a[1])[0]; // Kategori terboros

      // 2. Analisa Portfolio
      let totalInvested = 0;
      let portfolioMap: Record<string, number> = {};
      
      investments.forEach(inv => {
          const type = inv.type || (inv.symbol.length === 4 ? 'saham' : 'other');
          const multiplier = (type === 'saham') ? 100 : 1;
          const val = inv.quantity * inv.avgPrice * multiplier;
          
          totalInvested += val;
          portfolioMap[type] = (portfolioMap[type] || 0) + val;
      });

      // 3. Status Target
      const cash = user?.cashBalance || 0;
      const totalWealth = cash + totalInvested;
      
      let targetStatus = "Belum ada target.";
      if (target && target.targetAmount > 0) {
          const progress = (totalWealth / target.targetAmount) * 100;
          targetStatus = `Target: Rp${target.targetAmount/100}, Tercapai: ${progress.toFixed(1)}%. Sisa waktu: ${target.durationMonths} bulan.`;
      }

      // Rangkum Data untuk AI
      const context = {
          cash,
          income,
          expense,
          cashflow: income - expense,
          topExpenseCategory: topExpense ? topExpense[0] : "Tidak ada",
          totalInvested,
          portfolioMap, // Sebaran aset (misal: saham 50%, crypto 20%)
          totalWealth,
          targetStatus,
          txCount: recentTx.length
      };

      res.json(context);
  });
}
