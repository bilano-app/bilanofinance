import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Hardcode userId=1 for MVP single user mode
  const TEST_USER_ID = 1;

  // Ensure test user exists
  const existingUser = await storage.getUser(TEST_USER_ID);
  if (!existingUser) {
    await storage.createUser({ username: "demo", password: "password" });
    
    // Seed initial data
    await storage.updateUserBalance(TEST_USER_ID, 5000000); // 50k start
    await storage.createTransaction(TEST_USER_ID, {
      type: 'income',
      category: 'Salary',
      amount: 5000000,
      description: 'Initial Salary'
    });
    await storage.createTransaction(TEST_USER_ID, {
      type: 'expense',
      category: 'Food',
      amount: 15000, 
      description: 'Lunch'
    });
    await storage.createTransaction(TEST_USER_ID, {
      type: 'expense',
      category: 'Transport',
      amount: 5000, 
      description: 'Bus'
    });
  }

  app.get(api.user.get.path, async (req, res) => {
    const user = await storage.getUser(TEST_USER_ID);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.post(api.user.updateBalance.path, async (req, res) => {
    const { amount } = req.body; // Check type manually or via schema
    const user = await storage.getUser(TEST_USER_ID);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    const updated = await storage.updateUserBalance(TEST_USER_ID, user.cashBalance + amount);
    res.json(updated);
  });

  app.get(api.transactions.list.path, async (req, res) => {
    const transactions = await storage.getTransactions(TEST_USER_ID);
    res.json(transactions);
  });

  app.post(api.transactions.create.path, async (req, res) => {
    try {
      const input = api.transactions.create.input.parse(req.body);
      const user = await storage.getUser(TEST_USER_ID);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (input.type === 'expense') {
        if (user.cashBalance < input.amount) {
          return res.status(400).json({ message: "Insufficient Funds" });
        }
        await storage.updateUserBalance(TEST_USER_ID, user.cashBalance - input.amount);
      } else if (input.type === 'income') {
        await storage.updateUserBalance(TEST_USER_ID, user.cashBalance + input.amount);
      }

      const transaction = await storage.createTransaction(TEST_USER_ID, input);
      res.status(201).json(transaction);
    } catch (err) {
       if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.get(api.investments.list.path, async (req, res) => {
    const investments = await storage.getInvestments(TEST_USER_ID);
    res.json(investments);
  });

  app.post(api.investments.buy.path, async (req, res) => {
    const { symbol, quantity, price } = api.investments.buy.input.parse(req.body);
    const cost = quantity * price;
    
    const user = await storage.getUser(TEST_USER_ID);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    if (user.cashBalance < cost) {
      return res.status(400).json({ message: "Insufficient Funds for Investment" });
    }

    // Deduct FCF
    await storage.updateUserBalance(TEST_USER_ID, user.cashBalance - cost);
    // Log Transaction
    await storage.createTransaction(TEST_USER_ID, {
      type: 'buy',
      category: 'Investment',
      amount: cost,
      description: `Bought ${quantity} ${symbol} @ ${price/100}`,
    });

    // Update Portfolio
    const existing = await storage.getInvestmentBySymbol(TEST_USER_ID, symbol);
    if (existing) {
      const totalCost = (existing.quantity * existing.avgPrice) + cost;
      const newQty = existing.quantity + quantity;
      const newAvg = Math.round(totalCost / newQty);
      const updated = await storage.updateInvestment(existing.id, newQty, newAvg);
      return res.json(updated);
    } else {
      const newInv = await storage.createInvestment(TEST_USER_ID, {
        symbol, quantity, avgPrice: price
      });
      return res.json(newInv);
    }
  });

  app.post(api.investments.sell.path, async (req, res) => {
    const { symbol, quantity, price } = api.investments.sell.input.parse(req.body);
    const revenue = quantity * price;

    const existing = await storage.getInvestmentBySymbol(TEST_USER_ID, symbol);
    if (!existing || existing.quantity < quantity) {
      return res.status(400).json({ message: "Insufficient Quantity to Sell" });
    }

    const user = await storage.getUser(TEST_USER_ID);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Add FCF
    await storage.updateUserBalance(TEST_USER_ID, user.cashBalance + revenue);
    // Log Transaction
    await storage.createTransaction(TEST_USER_ID, {
      type: 'sell',
      category: 'Investment',
      amount: revenue,
      description: `Sold ${quantity} ${symbol} @ ${price/100}`,
    });

    // Update Portfolio
    const newQty = existing.quantity - quantity;
    if (newQty === 0) {
      await storage.deleteInvestment(existing.id);
      return res.json({ message: "Sold all position" });
    } else {
      // Avg price doesn't change on sell
      const updated = await storage.updateInvestment(existing.id, newQty, existing.avgPrice);
      return res.json(updated);
    }
  });

  app.get(api.target.get.path, async (req, res) => {
    const target = await storage.getTarget(TEST_USER_ID);
    res.json(target || null);
  });

  app.post(api.target.set.path, async (req, res) => {
    const { targetAmount, durationMonths, addCurrentCash } = req.body;
    
    if (addCurrentCash) {
      const user = await storage.getUser(TEST_USER_ID);
      if (user) {
        await storage.updateUserBalance(TEST_USER_ID, user.cashBalance + addCurrentCash);
      }
    }

    const target = await storage.setTarget(TEST_USER_ID, { targetAmount, durationMonths });
    res.json(target);
  });

  app.post(api.target.resetMonth.path, async (req, res) => {
    const target = await storage.getTarget(TEST_USER_ID);
    if (!target) return res.status(404).json({ message: "No target set" });
    
    if (target.durationMonths > 1) {
      const updated = await storage.updateTargetDuration(target.id, target.durationMonths - 1);
      res.json(updated);
    } else {
      res.json(target); // Cannot reduce below 1
    }
  });

  return httpServer;
}
