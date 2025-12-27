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
}
