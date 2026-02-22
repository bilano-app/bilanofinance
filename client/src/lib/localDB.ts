// client/src/lib/localDB.ts

// --- 1. TIPE DATA (Interfaces) ---
export interface User {
  id: number;
  username: string;
  cashBalance: number; // Disimpan dalam angka murni (bukan Rp), nanti diformat di tampilan
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface Investment {
  id: number;
  symbol: string;
  quantity: number;
  avgPrice: number;
}

export interface Target {
  id: number;
  targetAmount: number;
  durationMonths: number;
  currentMonthlyRequired: number; // Angka target stabil (fix) bulan ini
}

// --- 2. KUNCI PENYIMPANAN (BRANDING BILANO) ---
// Ini adalah "nama laci" di memori HP kamu.
const KEYS = {
  USER: 'bilano_user',
  TX: 'bilano_transactions',
  INV: 'bilano_investments',
  TARGET: 'bilano_target'
};

// --- 3. HELPER (Alat bantu simpan/baca) ---
const load = <T>(key: string, defaultVal: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultVal;
};

const save = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- 4. DATABASE LOKAL (PENGGANTI SERVER) ---
export const localDB = {
  
  // --- USER & SALDO ---
  getUser: async (): Promise<User> => {
    let user = load<User | null>(KEYS.USER, null);
    if (!user) {
      // Data default pengguna baru
      user = { id: 1, username: 'Pengguna Bilano', cashBalance: 0 };
      save(KEYS.USER, user);
    }
    return user;
  },

  updateBalance: async (amountToAdd: number) => { 
    const user = await localDB.getUser();
    user.cashBalance += amountToAdd;
    save(KEYS.USER, user);
    return user;
  },

  // --- TRANSAKSI (Income/Expense) ---
  getTransactions: async (): Promise<Transaction[]> => {
    return load<Transaction[]>(KEYS.TX, []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  addTransaction: async (tx: Omit<Transaction, 'id' | 'date'>) => {
    const list = await localDB.getTransactions();
    const newTx: Transaction = {
      ...tx,
      id: Date.now(), // ID unik berdasarkan waktu
      date: new Date().toISOString()
    };
    
    // Simpan ke list
    list.unshift(newTx);
    save(KEYS.TX, list);

    // Otomatis update saldo dompet
    if (tx.type === 'income') await localDB.updateBalance(tx.amount);
    if (tx.type === 'expense') await localDB.updateBalance(-tx.amount);

    return newTx;
  },

  // --- INVESTASI ---
  getInvestments: async (): Promise<Investment[]> => {
    return load<Investment[]>(KEYS.INV, []);
  },

  buyInvestment: async (symbol: string, quantity: number, price: number) => {
    const user = await localDB.getUser();
    const totalCost = price * quantity;

    if (user.cashBalance < totalCost) throw new Error("Saldo BILANO tidak cukup");

    // Potong Saldo
    user.cashBalance -= totalCost;
    save(KEYS.USER, user);

    // Update Portfolio
    const list = await localDB.getInvestments();
    const existing = list.find(i => i.symbol === symbol);

    if (existing) {
      // Logic Average Price (Harga Rata-rata)
      const oldVal = existing.quantity * existing.avgPrice;
      const newVal = oldVal + totalCost;
      const newQty = existing.quantity + quantity;
      
      existing.quantity = newQty;
      existing.avgPrice = Math.round(newVal / newQty);
    } else {
      // Barang Baru
      list.push({ id: Date.now(), symbol, quantity, avgPrice: price });
    }
    save(KEYS.INV, list);
    return list;
  },

  sellInvestment: async (symbol: string, quantity: number, price: number) => {
    const list = await localDB.getInvestments();
    const existing = list.find(i => i.symbol === symbol);

    if (!existing || existing.quantity < quantity) throw new Error("Lot tidak cukup");

    // Tambah Saldo (Hasil Jual)
    const proceeds = price * quantity;
    await localDB.updateBalance(proceeds);

    // Update Portfolio
    existing.quantity -= quantity;
    // Jika habis, hapus dari list. Jika sisa, simpan sisanya.
    const newList = existing.quantity <= 0 ? list.filter(i => i.symbol !== symbol) : list;
    
    save(KEYS.INV, newList);
    return newList;
  },

  // --- TARGET & GOALS ---
  getTarget: async (): Promise<Target | null> => {
    return load<Target | null>(KEYS.TARGET, null);
  },

  setTarget: async (targetAmount: number, durationMonths: number, addCurrentCash: number = 0) => {
    // Jika user nambah modal awal
    if (addCurrentCash > 0) await localDB.updateBalance(addCurrentCash);
    
    const user = await localDB.getUser();
    
    // Hitung Target Awal
    const remainingNeeded = Math.max(0, targetAmount - user.cashBalance);
    const monthlyReq = Math.ceil(remainingNeeded / durationMonths);

    const newTarget: Target = {
      id: Date.now(),
      targetAmount,
      durationMonths,
      currentMonthlyRequired: monthlyReq // Ini patokan awal
    };
    
    save(KEYS.TARGET, newTarget);
    return newTarget;
  },

  // --- LOGIC RESET BULAN (Sangat Penting) ---
  resetMonth: async (danaBebas: number) => {
    const user = await localDB.getUser();
    const target = await localDB.getTarget();

    if (!target) throw new Error("Target belum diset");
    if (danaBebas > user.cashBalance) throw new Error("Saldo Cash tidak cukup");

    // 1. Potong Dana Bebas (Uang Jajan)
    user.cashBalance -= danaBebas;
    save(KEYS.USER, user);

    // 2. Hitung Total Kekayaan Bersih Baru (Cash Sisa + Investasi)
    const investments = await localDB.getInvestments();
    const investVal = investments.reduce((acc, inv) => acc + (inv.quantity * inv.avgPrice), 0);
    const totalWealth = user.cashBalance + investVal;

    // 3. Hitung Ulang Target
    const newDuration = Math.max(1, target.durationMonths - 1);
    const remainingGoal = target.targetAmount - totalWealth;
    
    // Target per bulan yang BARU (Fix untuk bulan depan)
    const newMonthlyReq = remainingGoal <= 0 ? 0 : Math.ceil(remainingGoal / newDuration);

    // 4. Update Target di Database Lokal
    target.durationMonths = newDuration;
    target.currentMonthlyRequired = newMonthlyReq;
    save(KEYS.TARGET, target);

    return target;
  },

  deleteTarget: async () => {
    localStorage.removeItem(KEYS.TARGET);
  },
  
  extendTarget: async (months: number) => {
    const target = await localDB.getTarget();
    if(target) {
        target.durationMonths += months;
        save(KEYS.TARGET, target);
    }
  },

  // --- FITUR BACKUP & RESTORE (Untuk Pindah HP) ---
  getAllData: () => {
     return {
         user: load(KEYS.USER, null),
         transactions: load(KEYS.TX, []),
         investments: load(KEYS.INV, []),
         target: load(KEYS.TARGET, null),
         app: "BILANO",
         timestamp: new Date().toISOString()
     }
  },
  
  restoreData: (jsonData: any) => {
      // Validasi sederhana
      if(jsonData.user) save(KEYS.USER, jsonData.user);
      if(jsonData.transactions) save(KEYS.TX, jsonData.transactions);
      if(jsonData.investments) save(KEYS.INV, jsonData.investments);
      if(jsonData.target) save(KEYS.TARGET, jsonData.target);
  }
};