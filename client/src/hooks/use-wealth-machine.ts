import { useReducer, useEffect } from "react";
import { useUser, useTransactions } from "@/hooks/use-finance";

// =========================================================================
// 📐 KONTRAK STATE ID & DATA DATA TYPES (S0 - S15)
// =========================================================================
export type StateId = 
  | 'S0_LANDING' 
  | 'S1_Q_STATUS' 
  | 'S2_Q_TUJUAN' 
  | 'S3_Q_POLA_KERJA' 
  | 'S4_Q_LATAR_BELAKANG' 
  | 'S5_Q_KEAHLIAN' 
  | 'S6_Q_ASET' 
  | 'S7_Q_KONSTRAIN_WAKTU' 
  | 'S8_GENERATE_REKOMENDASI' 
  | 'S9_PILIH_IDE' 
  | 'S10_RENCANA_BAHAN' 
  | 'S11_RISET_HARGA' 
  | 'S12_CEK_KELAYAKAN' 
  | 'S13_STRATEGI_MODAL' 
  | 'S14_STRATEGI_JUAL' 
  | 'S15_TRACKING_OMSET';

export interface RecommendationIdea {
  id: string;
  title: string;
  pitch: string;
  why_it_fits: string;
  capital_level: 'TANPA_MODAL' | 'MODAL_KECIL' | 'MODAL_SEDANG';
  needs_upskilling: boolean;
  upskilling_note: string | null;
  difficulty: 'MUDAH' | 'SEDANG' | 'MENANTANG';
  estimated_time_to_first_income: string;
  risk_note: string;
}

export interface MaterialItem {
  id: string;
  name: string;
  price: number;
  note?: string | null;
}

export interface RevenueLog {
  id: string;
  date: string;
  amount: number;
  note: string;
}

export interface FinancialSnapshot {
  saldo_saat_ini: number;
  rata2_pengeluaran_bulanan: number;
  sisa_dana_aman: number;
  data_cukup_representatif: boolean;
}

export interface WealthState {
  currentState: StateId;
  profileData: {
    status: string;
    tujuan: string;
    polaKerja: string;
    latarBelakang: string;
    keahlian: string[];
    keahlianBebas: string;
    aset: string[];
    konstrainWaktu: {
      jam_per_minggu: number;
      urgensi?: string | null;
    };
  };
  financialSnapshot: FinancialSnapshot | null;
  recommendations: RecommendationIdea[];
  selectedIdea: RecommendationIdea | null;
  materials: MaterialItem[];
  totalCost: number;
  feasibilityVerdict: 'CUKUP_AMAN' | 'CUKUP_TAPI_RISIKO' | 'KURANG' | null;
  capitalStrategies: any[];
  chatHistory: { sender: 'user' | 'ai'; text: string }[];
  revenueLogs: RevenueLog[];
}

// =========================================================================
// 🎛️ REDUCER ACTIONS DEFINITION
// =========================================================================
type WealthAction =
  | { type: 'SET_STATE'; payload: StateId }
  | { type: 'UPDATE_PROFILE'; payload: Partial<WealthState['profileData']> }
  | { type: 'SET_FINANCIAL_SNAPSHOT'; payload: FinancialSnapshot }
  | { type: 'SET_RECOMMENDATIONS'; payload: RecommendationIdea[] }
  | { type: 'SELECT_IDEA'; payload: RecommendationIdea }
  | { type: 'SET_MATERIALS'; payload: MaterialItem[] }
  | { type: 'UPDATE_MATERIAL_PRICE'; payload: { id: string; price: number } }
  | { type: 'ADD_MANUAL_MATERIAL'; payload: MaterialItem }
  | { type: 'REMOVE_MATERIAL'; payload: string }
  | { type: 'SET_FEASIBILITY'; payload: { verdict: WealthState['feasibilityVerdict']; totalCost: number } }
  | { type: 'SET_CAPITAL_STRATEGIES'; payload: any[] }
  | { type: 'ADD_CHAT_MESSAGE'; payload: { sender: 'user' | 'ai'; text: string } }
  | { type: 'SET_CHAT_HISTORY'; payload: { sender: 'user' | 'ai'; text: string }[] }
  | { type: 'ADD_REVENUE_LOG'; payload: RevenueLog }
  | { type: 'RESET_ATTEMPT' };

const initialState: WealthState = {
  currentState: 'S0_LANDING',
  profileData: {
    status: '',
    tujuan: '',
    polaKerja: '',
    latarBelakang: '',
    keahlian: [],
    keahlianBebas: '',
    aset: [],
    konstrainWaktu: { jam_per_minggu: 0, urgensi: null }
  },
  financialSnapshot: null,
  recommendations: [],
  selectedIdea: null,
  materials: [],
  totalCost: 0,
  feasibilityVerdict: null,
  capitalStrategies: [],
  chatHistory: [],
  revenueLogs: []
};

function wealthReducer(state: WealthState, action: WealthAction): WealthState {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, currentState: action.payload };
    case 'UPDATE_PROFILE':
      return { ...state, profileData: { ...state.profileData, ...action.payload } };
    case 'SET_FINANCIAL_SNAPSHOT':
      return { ...state, financialSnapshot: action.payload };
    case 'SET_RECOMMENDATIONS':
      return { ...state, recommendations: action.payload };
    case 'SELECT_IDEA':
      return { ...state, selectedIdea: action.payload };
    case 'SET_MATERIALS':
      return { ...state, materials: action.payload, totalCost: action.payload.reduce((acc, m) => acc + m.price, 0) };
    case 'UPDATE_MATERIAL_PRICE': {
      const updatedMaterials = state.materials.map(m => m.id === action.payload.id ? { ...m, price: action.payload.price } : m);
      return { ...state, materials: updatedMaterials, totalCost: updatedMaterials.reduce((acc, m) => acc + m.price, 0) };
    }
    case 'ADD_MANUAL_MATERIAL': {
      const updated = [...state.materials, action.payload];
      return { ...state, materials: updated, totalCost: updated.reduce((acc, m) => acc + m.price, 0) };
    }
    case 'REMOVE_MATERIAL': {
      const filtered = state.materials.filter(m => m.id !== action.payload);
      return { ...state, materials: filtered, totalCost: filtered.reduce((acc, m) => acc + m.price, 0) };
    }
    case 'SET_FEASIBILITY':
      return { ...state, feasibilityVerdict: action.payload.verdict, totalCost: action.payload.totalCost };
    case 'SET_CAPITAL_STRATEGIES':
      return { ...state, capitalStrategies: action.payload };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatHistory: [...state.chatHistory, action.payload] };
    case 'SET_CHAT_HISTORY':
      return { ...state, chatHistory: action.payload };
    case 'ADD_REVENUE_LOG':
      return { ...state, revenueLogs: [action.payload, ...state.revenueLogs] };
    case 'RESET_ATTEMPT':
      return {
        ...state,
        currentState: 'S9_PILIH_IDE',
        selectedIdea: null,
        materials: [],
        totalCost: 0,
        feasibilityVerdict: null,
        capitalStrategies: [],
        chatHistory: []
      };
    default:
      return state;
  }
}

// =========================================================================
// 🚀 MAIN CUSTOM HOOK IMPLEMENTATION
// =========================================================================
export function useWealthMachine() {
  const { data: user } = useUser();
  const { data: transactions } = useTransactions();
  const [state, dispatch] = useReducer(wealthReducer, initialState);

  // PRINSIP 3: Auto-pull snapshot finansial dari database aktual Bilano tanpa tanya ulang
  useEffect(() => {
    if (user) {
      const currentCash = user.cashBalance || 0;
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      
      const monthlyExpenseTxs = transactions?.filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }) || [];
      
      const totalExpenseThisMonth = monthlyExpenseTxs.reduce((acc, t) => acc + Number(t.amount), 0);
      const baselineExpense = totalExpenseThisMonth > 0 ? totalExpenseThisMonth : 1500000; // Fallback minimal limit
      
      const snapshot: FinancialSnapshot = {
        saldo_saat_ini: currentCash,
        rata2_pengeluaran_bulanan: baselineExpense,
        sisa_dana_aman: Math.max(0, currentCash - baselineExpense), // Buffer proteksi cashflow 1 bulan
        data_cukup_representatif: (transactions?.length || 0) >= 5
      };
      
      dispatch({ type: 'SET_FINANCIAL_SNAPSHOT', payload: snapshot });
    }
  }, [user, transactions]);

  // PRINSIP 2: Logika Cek Kelayakan dihitung mutlak secara deterministik oleh Kode
  const calculateFeasibility = () => {
    const total = state.materials.reduce((acc, m) => acc + (Number(m.price) || 0), 0);
    const sisaDanaAman = state.financialSnapshot?.sisa_dana_aman || 0;
    const saldoSaatIni = state.financialSnapshot?.saldo_saat_ini || 0;

    let verdict: WealthState['feasibilityVerdict'] = 'KURANG';
    
    if (total <= sisaDanaAman) {
      verdict = 'CUKUP_AMAN';
    } else if (total <= saldoSaatIni) {
      verdict = 'CUKUP_TAPI_RISIKO'; // Memakan batas dana darurat
    }

    dispatch({ type: 'SET_FEASIBILITY', payload: { verdict, totalCost: total } });
    return verdict;
  };

  return {
    state,
    dispatch,
    calculateFeasibility
  };
}