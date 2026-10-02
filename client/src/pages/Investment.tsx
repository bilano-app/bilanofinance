import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { 
    TrendingUp, PieChart, Layers,
    ArrowLeft, Loader2, RefreshCcw,
    Wallet, Info, AlertCircle,
    Gem, HandCoins, Building2, ShieldCheck, Store, Coins,
    Calculator, CheckCircle2, ArrowRight, ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useInvestments, useForexRates } from "@/hooks/use-finance";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SourceSelectionPopup from "@/components/SourceSelectionPopup";
import { trackEvent } from "@/lib/tracking";
import { TrialFeatureNotice } from "@/components/TrialFeatureNotice";
import { formatDecimalInput, parseFormattedNumber, formatRp } from "@/lib/utils";

export type AssetType = 'saham' | 'reksadana' | 'kripto' | 'emas' | 'p2p' | 'properti' | 'obligasi' | 'bisnis';

export interface AssetSpec {
    unitLabel: string;
    unitHint: string;
    unitShort: string;
    priceLabel: string;
    priceShort: string;
    tickerLabel: string;
    tickerPlaceholder: string;
    qtyPlaceholder: string;
    pricePlaceholder: string;
    multiplier: number;
    formatFormula: (qty: number, price: number, curr: string, rate: number) => {
        formula: string;
        subFormula?: string;
    };
}

export const getAssetSpec = (category: AssetType, currency: string): AssetSpec => {
    const curr = (currency || 'IDR').toUpperCase();
    const isIDR = curr === 'IDR';

    switch (category) {
        case 'saham':
            if (isIDR) {
                return {
                    unitLabel: "Jumlah (Lot)",
                    unitHint: "1 Lot = 100 Lembar Saham (BEI/IHSG)",
                    unitShort: "Lot",
                    priceLabel: "Harga per Lembar (IDR)",
                    priceShort: "per lbr",
                    tickerLabel: "Kode Saham (Ticker IHSG/BEI)",
                    tickerPlaceholder: "Cth: BBCA / BBRI / BMRI / ASII",
                    qtyPlaceholder: "1",
                    pricePlaceholder: "9500",
                    multiplier: 100,
                    formatFormula: (qty, price) => ({
                        formula: `${qty.toLocaleString('id-ID')} Lot × 100 Lembar × Rp ${price.toLocaleString('id-ID')} = Rp ${(qty * 100 * price).toLocaleString('id-ID')}`
                    })
                };
            } else {
                return {
                    unitLabel: "Jumlah Lembar (Shares)",
                    unitHint: "1 Share = 1 Lembar (Bisa pecahan/desimal)",
                    unitShort: "Shares",
                    priceLabel: `Harga per Share / Lembar (${curr})`,
                    priceShort: "per share",
                    tickerLabel: "Kode Saham US / Global (Ticker)",
                    tickerPlaceholder: "Cth: AAPL / NVDA / TSLA / MSFT / VOO",
                    qtyPlaceholder: "1",
                    pricePlaceholder: "180.50",
                    multiplier: 1,
                    formatFormula: (qty, price, c, rate) => ({
                        formula: `${qty.toLocaleString('en-US')} Shares × ${c} ${price.toLocaleString('en-US')} = ${c} ${(qty * price).toLocaleString('en-US')}`,
                        subFormula: `Setara Rp ${Math.round(qty * price * rate).toLocaleString('id-ID')} (@ Kurs Rp ${Math.round(rate).toLocaleString('id-ID')}/${c})`
                    })
                };
            }
        case 'emas':
            return {
                unitLabel: "Jumlah Berat (Gram / gr)",
                unitHint: "Dalam gram murni (bisa desimal cth: 0.5 / 1 / 10 gr)",
                unitShort: "Gram",
                priceLabel: `Harga per Gram (${curr})`,
                priceShort: "per gram",
                tickerLabel: "Merek / Jenis Emas & Logam",
                tickerPlaceholder: "Cth: Antam CertiCard / UBS Gold / Emas Digital",
                qtyPlaceholder: "1",
                pricePlaceholder: isIDR ? "1450000" : "85",
                multiplier: 1,
                formatFormula: (qty, price, c, rate) => ({
                    formula: `${qty.toLocaleString('id-ID')} Gram × ${c === 'IDR' ? 'Rp ' : c + ' '}${price.toLocaleString(isIDR ? 'id-ID' : 'en-US')} = ${c === 'IDR' ? 'Rp ' : c + ' '}${(qty * price).toLocaleString(isIDR ? 'id-ID' : 'en-US')}`,
                    subFormula: !isIDR ? `Setara Rp ${Math.round(qty * price * rate).toLocaleString('id-ID')} (@ Kurs Rp ${Math.round(rate).toLocaleString('id-ID')})` : undefined
                })
            };
        case 'reksadana':
            return {
                unitLabel: "Jumlah Unit Penyertaan (UP)",
                unitHint: "Unit Penyertaan (bisa desimal hingga 4 angka)",
                unitShort: "UP",
                priceLabel: `NAB per Unit UP (${curr})`,
                priceShort: "per UP",
                tickerLabel: "Nama Produk Reksa Dana",
                tickerPlaceholder: "Cth: Sucorinvest Money Market / Mandiri Saham",
                qtyPlaceholder: "1000",
                pricePlaceholder: isIDR ? "1500" : "1.25",
                multiplier: 1,
                formatFormula: (qty, price, c, rate) => ({
                    formula: `${qty.toLocaleString('id-ID')} UP × ${c === 'IDR' ? 'Rp ' : c + ' '}${price.toLocaleString(isIDR ? 'id-ID' : 'en-US')} = ${c === 'IDR' ? 'Rp ' : c + ' '}${(qty * price).toLocaleString(isIDR ? 'id-ID' : 'en-US')}`,
                    subFormula: !isIDR ? `Setara Rp ${Math.round(qty * price * rate).toLocaleString('id-ID')} (@ Kurs Rp ${Math.round(rate).toLocaleString('id-ID')})` : undefined
                })
            };
        case 'kripto':
            return {
                unitLabel: "Jumlah Koin / Token",
                unitHint: "Bisa pecahan desimal presisi tinggi (cth: 0.05 BTC)",
                unitShort: "Koin",
                priceLabel: `Harga per Koin / Token (${curr})`,
                priceShort: "per koin",
                tickerLabel: "Simbol Kripto (Ticker)",
                tickerPlaceholder: "Cth: BTC / ETH / SOL / DOGE / USDT",
                qtyPlaceholder: "0.1",
                pricePlaceholder: isIDR ? "1000000000" : "65000",
                multiplier: 1,
                formatFormula: (qty, price, c, rate) => ({
                    formula: `${qty.toLocaleString('en-US')} Koin × ${c === 'IDR' ? 'Rp ' : c + ' '}${price.toLocaleString(isIDR ? 'id-ID' : 'en-US')} = ${c === 'IDR' ? 'Rp ' : c + ' '}${(qty * price).toLocaleString(isIDR ? 'id-ID' : 'en-US')}`,
                    subFormula: !isIDR ? `Setara Rp ${Math.round(qty * price * rate).toLocaleString('id-ID')} (@ Kurs Rp ${Math.round(rate).toLocaleString('id-ID')})` : undefined
                })
            };
        case 'obligasi':
            return {
                unitLabel: "Jumlah Unit / Lembar Surat Berharga",
                unitHint: "1 Unit = Rp 1.000.000 nominal standar SBN ritel",
                unitShort: "Unit SBN",
                priceLabel: `Harga Nominal per Unit (${curr})`,
                priceShort: "per unit",
                tickerLabel: "Seri Surat Berharga / SBN / Sukuk",
                tickerPlaceholder: "Cth: ORI025 / SR020 / PBS038 / FR0091",
                qtyPlaceholder: "1",
                pricePlaceholder: isIDR ? "1000000" : "1000",
                multiplier: 1,
                formatFormula: (qty, price, c, rate) => ({
                    formula: `${qty.toLocaleString('id-ID')} Unit × ${c === 'IDR' ? 'Rp ' : c + ' '}${price.toLocaleString(isIDR ? 'id-ID' : 'en-US')} = ${c === 'IDR' ? 'Rp ' : c + ' '}${(qty * price).toLocaleString(isIDR ? 'id-ID' : 'en-US')}`,
                    subFormula: !isIDR ? `Setara Rp ${Math.round(qty * price * rate).toLocaleString('id-ID')} (@ Kurs Rp ${Math.round(rate).toLocaleString('id-ID')})` : undefined
                })
            };
        case 'p2p':
            return {
                unitLabel: "Jumlah Paket Pendanaan",
                unitHint: "Porsi / Paket Pinjaman Pendanaan",
                unitShort: "Paket",
                priceLabel: `Nominal Pokok per Paket (${curr})`,
                priceShort: "per paket",
                tickerLabel: "Platform & Nama Pinjaman",
                tickerPlaceholder: "Cth: Akseleran Invoice Financing / Amartha",
                qtyPlaceholder: "1",
                pricePlaceholder: isIDR ? "1000000" : "100",
                multiplier: 1,
                formatFormula: (qty, price, c, rate) => ({
                    formula: `${qty.toLocaleString('id-ID')} Paket × ${c === 'IDR' ? 'Rp ' : c + ' '}${price.toLocaleString(isIDR ? 'id-ID' : 'en-US')} = ${c === 'IDR' ? 'Rp ' : c + ' '}${(qty * price).toLocaleString(isIDR ? 'id-ID' : 'en-US')}`,
                    subFormula: !isIDR ? `Setara Rp ${Math.round(qty * price * rate).toLocaleString('id-ID')} (@ Kurs Rp ${Math.round(rate).toLocaleString('id-ID')})` : undefined
                })
            };
        case 'properti':
            return {
                unitLabel: "Jumlah Unit / Porsi Properti",
                unitHint: "Unit fisik atau porsi kepemilikan crowdfunding",
                unitShort: "Porsi",
                priceLabel: `Nilai Modal per Unit / Porsi (${curr})`,
                priceShort: "per unit",
                tickerLabel: "Nama Properti / Lokasi Aset",
                tickerPlaceholder: "Cth: Ruko Sudirman / Apartemen Kemang / Tanah",
                qtyPlaceholder: "1",
                pricePlaceholder: isIDR ? "50000000" : "5000",
                multiplier: 1,
                formatFormula: (qty, price, c, rate) => ({
                    formula: `${qty.toLocaleString('id-ID')} Unit × ${c === 'IDR' ? 'Rp ' : c + ' '}${price.toLocaleString(isIDR ? 'id-ID' : 'en-US')} = ${c === 'IDR' ? 'Rp ' : c + ' '}${(qty * price).toLocaleString(isIDR ? 'id-ID' : 'en-US')}`,
                    subFormula: !isIDR ? `Setara Rp ${Math.round(qty * price * rate).toLocaleString('id-ID')} (@ Kurs Rp ${Math.round(rate).toLocaleString('id-ID')})` : undefined
                })
            };
        case 'bisnis':
            return {
                unitLabel: "Jumlah Slot / Lembar Saham Bisnis",
                unitHint: "Slot kemitraan, franchise, atau lembar saham UMKM",
                unitShort: "Slot",
                priceLabel: `Modal per Slot / Lembar (${curr})`,
                priceShort: "per slot",
                tickerLabel: "Nama Usaha / Mitra Bisnis",
                tickerPlaceholder: "Cth: Franchise Kopi Kenangan / UMKM Bakery",
                qtyPlaceholder: "1",
                pricePlaceholder: isIDR ? "10000000" : "1000",
                multiplier: 1,
                formatFormula: (qty, price, c, rate) => ({
                    formula: `${qty.toLocaleString('id-ID')} Slot × ${c === 'IDR' ? 'Rp ' : c + ' '}${price.toLocaleString(isIDR ? 'id-ID' : 'en-US')} = ${c === 'IDR' ? 'Rp ' : c + ' '}${(qty * price).toLocaleString(isIDR ? 'id-ID' : 'en-US')}`,
                    subFormula: !isIDR ? `Setara Rp ${Math.round(qty * price * rate).toLocaleString('id-ID')} (@ Kurs Rp ${Math.round(rate).toLocaleString('id-ID')})` : undefined
                })
            };
        default:
            return {
                unitLabel: "Jumlah Unit",
                unitHint: "Jumlah kepemilikan aset",
                unitShort: "Unit",
                priceLabel: `Harga per Unit (${curr})`,
                priceShort: "per unit",
                tickerLabel: "Nama / Simbol Aset",
                tickerPlaceholder: "Cth: Nama Aset",
                qtyPlaceholder: "1",
                pricePlaceholder: "1000",
                multiplier: 1,
                formatFormula: (qty, price, c) => ({
                    formula: `${qty} × ${c} ${price} = ${c} ${qty * price}`
                })
            };
    }
};

export default function Investment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";

  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: investments, isLoading: isInvLoading } = useInvestments();
  const { data: forexRates = {}, refetch: refetchRates } = useForexRates();

  // Query Saldo Valas Fisik
  const { data: forexAssetsData = [], isLoading: isForexLoading } = useQuery<any[]>({
      queryKey: ["forexAssets", currentUserEmail],
      queryFn: async () => {
          const res = await fetch("/api/forex/assets", { headers: { "x-user-email": currentUserEmail } });
          if (!res.ok) return [];
          return res.json();
      },
      staleTime: 1000 * 30,
  });

  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(["IDR", "USD", "EUR", "SGD", "GBP", "JPY", "AUD", "MYR", "USDT"]);

  useEffect(() => {
      if (forexRates && Object.keys(forexRates).length > 0) {
          const keys = Object.keys(forexRates).filter(c => c !== "IDR");
          setAvailableCurrencies(["IDR", ...keys]);
      }
  }, [forexRates]);

  const [viewState, setViewState] = useState<'main' | 'detail'>('main');
  const [activeCategory, setActiveCategory] = useState<AssetType | null>(null);

  const [txType, setTxType] = useState<'BUY' | 'SELL'>('BUY');
  const [inputName, setInputName] = useState("");
  const [inputCurrency, setInputCurrency] = useState("IDR");
  const [inputQty, setInputQty] = useState("");
  const [inputPrice, setInputPrice] = useState("");
  const [selectedSellSymbol, setSelectedSellSymbol] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showSourcePopup, setShowSourcePopup] = useState(false);
  const [sourcePopupConfig, setSourcePopupConfig] = useState<{
    type: 'income' | 'expense';
    title: string;
    description: string;
  } | null>(null);

  const formatNum = (val: string) => formatDecimalInput(val);
  const parseNum = (val: string) => parseFormattedNumber(val);

  const wsSum = (user?.walletSources && Array.isArray(user.walletSources))
      ? (user.walletSources as any[]).filter((w: any) => (Number(w.balance) || 0) > 0).reduce((acc: number, w: any) => acc + (Number(w.balance) || 0), 0)
      : 0;
  const hasRealWallet = user?.walletSources && Array.isArray(user.walletSources) && user.walletSources.filter((w: any) => (Number(w.balance) || 0) > 0).length > 0;
  const fcf = hasRealWallet ? wsSum : (user?.cashBalance || 0);
  const portfolioRaw = investments || [];

  // Saldo valas yang cocok dengan inputCurrency
  const availableForex = (forexAssetsData || []).find((f: any) => f.currency?.toUpperCase() === inputCurrency.toUpperCase())?.amount || 0;
  const availableSourceBalance = inputCurrency === 'IDR' ? fcf : availableForex;

  const assetConfig: Record<AssetType, { label: string; icon: any; bg: string; iconColor: string; description: string }> = {
      saham: {
          label: "Saham",
          icon: TrendingUp,
          bg: "bg-sky-50 border-sky-200",
          iconColor: "text-sky-600",
          description: "IHSG (1 Lot = 100 lbr) & US Wall Street (per share)"
      },
      reksadana: {
          label: "Reksa Dana",
          icon: PieChart,
          bg: "bg-emerald-50 border-emerald-200",
          iconColor: "text-emerald-600",
          description: "Pasar Uang, Obligasi & Saham (Unit Penyertaan / NAB)"
      },
      kripto: {
          label: "Kripto",
          icon: Coins,
          bg: "bg-amber-50 border-amber-200",
          iconColor: "text-amber-600",
          description: "Bitcoin, Ethereum & Altcoins (Koin/Token desimal)"
      },
      emas: {
          label: "Emas & Logam",
          icon: Gem,
          bg: "bg-yellow-50 border-yellow-200",
          iconColor: "text-yellow-600",
          description: "Antam, UBS, Emas Digital (Berat dalam Gram murni)"
      },
      p2p: {
          label: "P2P Lending",
          icon: HandCoins,
          bg: "bg-indigo-50 border-indigo-200",
          iconColor: "text-indigo-600",
          description: "Pendanaan Produktif & Invoice Financing (Paket Pokok)"
      },
      properti: {
          label: "Properti",
          icon: Building2,
          bg: "bg-orange-50 border-orange-200",
          iconColor: "text-orange-600",
          description: "Tanah, Rumah, Ruko & Crowdfunding Properti"
      },
      obligasi: {
          label: "Surat Berharga / SBN",
          icon: ShieldCheck,
          bg: "bg-teal-50 border-teal-200",
          iconColor: "text-teal-600",
          description: "ORI, SR, SBR, Sukuk Negara & Obligasi Korporasi"
      },
      bisnis: {
          label: "Bisnis Riil / UMKM",
          icon: Store,
          bg: "bg-rose-50 border-rose-200",
          iconColor: "text-rose-600",
          description: "Kemitraan, Franchise & Saham Usaha Privat"
      },
  };

  const aggregatedPortfolio = Object.values(portfolioRaw.reduce((acc: any, p: any) => {
      if (!acc[p.symbol]) { acc[p.symbol] = { ...p, quantity: 0, totalVal: 0 }; }
      acc[p.symbol].quantity += p.quantity;
      acc[p.symbol].totalVal += (p.quantity * p.avgPrice);
      return acc;
  }, {} as Record<string, any>)).map((g: any) => ({
      ...g,
      avgPrice: g.quantity > 0 ? (g.totalVal / g.quantity) : 0
  }));

  const getFilteredPortfolio = () => {
      if (!activeCategory) return aggregatedPortfolio;
      return aggregatedPortfolio.filter((p: any) => {
          const typeLower = (p.type || '').toLowerCase();
          if (typeLower) {
              if (typeLower === 'crypto') return activeCategory === 'kripto';
              if (typeLower === 'gold') return activeCategory === 'emas';
              if (typeLower === 'deposito') return activeCategory === 'obligasi';
              return typeLower === activeCategory.toLowerCase();
          }
          const parts = (p.symbol||"").split('|');
          const sym = parts[0] || "";
          const isLegacyStock = sym.length === 4 && !sym.includes(" ");
          if (activeCategory === 'saham') return isLegacyStock;
          if (isLegacyStock) return false; 
          return true; 
      });
  };

  const filteredItems = getFilteredPortfolio();

  const getConversionRate = (currency: string) => {
      if (currency === 'IDR') return 1;
      return forexRates[currency] || 16000;
  };

  const calculateLiveValue = (p: any) => {
      const parts = (p.symbol || "").split('|');
      const sym = parts[0] || "";
      const curr = (parts[1] || 'IDR').toUpperCase();
      const rate = curr === 'IDR' ? 1 : (forexRates[curr] || 16000);
      const isIDRStock = (p.type?.toLowerCase() === 'saham' || (!p.type && sym.length === 4)) && curr === 'IDR';
      const multiplier = isIDRStock ? 100 : 1; 
      return p.quantity * (p.avgPrice || 0) * multiplier * rate;
  };

  const totalPortfolioValue = aggregatedPortfolio.reduce((acc: number, p: any) => acc + calculateLiveValue(p), 0);
  const categoryValue = filteredItems.reduce((acc: number, p: any) => acc + calculateLiveValue(p), 0);

  const displayTotalPortfolio = formatRp(totalPortfolioValue);
  const displayCategoryValue = formatRp(categoryValue);

  const currentSpec = activeCategory ? getAssetSpec(activeCategory, inputCurrency) : null;

  const calculateTotalCost = () => {
      if (!activeCategory || !currentSpec) return 0;
      const qty = parseNum(inputQty);
      const prc = parseNum(inputPrice);
      if (!qty || !prc) return 0;
      return qty * prc * currentSpec.multiplier;
  };

  const calculateTotalCostInIDR = () => {
      const totalInNative = calculateTotalCost();
      const rate = getConversionRate(inputCurrency);
      return totalInNative * rate;
  };

  const executeTransaction = async (targetSource?: string) => {
      if (!activeCategory) return;
      const qty = parseNum(inputQty);
      const prc = parseNum(inputPrice);
      const totalCostNative = calculateTotalCost();
      const totalIDR = calculateTotalCostInIDR();

      // Validasi Saldo Sesuai Mata Uang
      if (txType === 'BUY') {
          if (inputCurrency === 'IDR' && totalCostNative > fcf) {
              toast({
                  title: "Saldo Kas IDR Tidak Cukup",
                  description: `Total pembelian (${formatRp(totalCostNative)}) melebihi Saldo Kas FCF Anda (${formatRp(fcf)}).`,
                  variant: "destructive"
              });
              return;
          }
          if (inputCurrency !== 'IDR' && totalCostNative > availableForex) {
              toast({
                  title: `Saldo Valas ${inputCurrency} Tidak Cukup`,
                  description: `Total pembelian (${inputCurrency} ${totalCostNative.toLocaleString('en-US')}) melebihi Saldo Valas ${inputCurrency} Anda (${inputCurrency} ${availableForex.toLocaleString('en-US')}). Silakan top up di menu Valas.`,
                  variant: "destructive"
              });
              return;
          }
      }

      setIsSubmitting(true);
      try {
          const finalSymbol = inputCurrency !== 'IDR' ? `${inputName.trim().toUpperCase()}|${inputCurrency}` : inputName.trim().toUpperCase();
          const finalSource = inputCurrency !== 'IDR' ? `Dompet Valas ${inputCurrency}` : (targetSource || "Kas Utama");

          const res = await fetch(txType === 'BUY' ? "/api/investments/buy" : "/api/investments/sell", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "x-user-email": currentUserEmail
              },
              body: JSON.stringify({
                  action: txType,
                  symbol: txType === 'BUY' ? finalSymbol : selectedSellSymbol,
                  type: activeCategory,
                  quantity: qty,
                  price: prc,
                  source: finalSource,
                  currency: inputCurrency
              })
          });

          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.message || "Gagal memproses transaksi investasi.");
          }

          trackEvent("investment_transaction_created", {
              action: txType,
              type: activeCategory,
              symbol: txType === 'BUY' ? finalSymbol : selectedSellSymbol,
              amountIdr: totalIDR
          });

          toast({
              title: txType === 'BUY' ? "Pembelian Sukses! 📈" : "Penjualan Sukses! 💰",
              description: `Transaksi ${assetConfig[activeCategory].label} berhasil tercatat dan saldo ${inputCurrency} diperbarui.`
          });

          setInputName("");
          setInputQty("");
          setInputPrice("");
          setSelectedSellSymbol("");
          setShowSourcePopup(false);
          setIsSubmitting(false);

          Promise.all([
              queryClient.invalidateQueries({ queryKey: ["investments"] }),
              queryClient.invalidateQueries({ queryKey: ["user"] }),
              queryClient.invalidateQueries({ queryKey: ["forexAssets"] }),
              queryClient.invalidateQueries({ queryKey: ["transactions"] })
          ]).catch(() => {});
      } catch (e: any) {
          toast({
              title: "Transaksi Gagal",
              description: e.message || "Terjadi kesalahan server.",
              variant: "destructive"
          });
          setIsSubmitting(false);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputQty || !inputPrice) {
          toast({ title: "Form Belum Lengkap", description: "Harap isi jumlah dan harga transaksi.", variant: "destructive" });
          return;
      }
      if (txType === 'BUY' && !inputName.trim()) {
          toast({ title: "Nama/Ticker Belum Diisi", description: "Harap masukkan kode atau nama aset.", variant: "destructive" });
          return;
      }
      if (txType === 'SELL' && !selectedSellSymbol) {
          toast({ title: "Pilih Aset Yang Dijual", description: "Pilih aset dari portofolio Anda.", variant: "destructive" });
          return;
      }

      const targetCurrency = txType === 'SELL'
          ? ((selectedSellSymbol || '').split('|')[1] || inputCurrency || 'IDR').toUpperCase()
          : (inputCurrency || 'IDR').toUpperCase();

      if (txType === 'SELL') {
          setSourcePopupConfig({
              type: 'income',
              title: targetCurrency === 'IDR' ? 'Tujuan Masuk Saldo Penjualan' : `Pilih Rekening Penerima ${targetCurrency}`,
              description: targetCurrency === 'IDR' 
                  ? 'Pilih akun atau dompet rupiah yang menerima dana hasil penjualan aset ini:' 
                  : `Pilih rekening / kantong ${targetCurrency} yang menerima hasil penjualan aset ini:`
          });
      } else {
          setSourcePopupConfig({
              type: 'expense',
              title: targetCurrency === 'IDR' ? 'Pilih Sumber Dana Pembelian' : `Pilih Sumber Dana Valas ${targetCurrency}`,
              description: targetCurrency === 'IDR' 
                  ? 'Dana pembelian aset investasi diambil dari rekening atau dompet mana?' 
                  : `Dana pembelian aset ${targetCurrency} ditarik dari rekening/kantong mana?`
          });
      }
      setShowSourcePopup(true);
  };

  const renderDynamicForm = () => {
      if (!activeCategory || !currentSpec) return null;
      const totalCostNative = calculateTotalCost();
      const totalIDR = calculateTotalCostInIDR();
      const qtyNum = parseNum(inputQty);
      const prcNum = parseNum(inputPrice);
      const rate = getConversionRate(inputCurrency);
      const formulaResult = currentSpec.formatFormula(qtyNum, prcNum, inputCurrency, rate);

      const isInsufficient = txType === 'BUY' && (
          inputCurrency === 'IDR' ? totalCostNative > fcf : totalCostNative > availableForex
      );

      return (
          <form onSubmit={handleSubmit} className="space-y-4">
              {/* TABS BELI / JUAL */}
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button
                      type="button"
                      onClick={() => { setTxType('BUY'); setInputQty(""); setInputPrice(""); }}
                      className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                          txType === 'BUY' 
                              ? 'bg-sky-600 text-white shadow-xs' 
                              : 'text-slate-500 hover:text-slate-900'
                      }`}
                  >
                      BELI / TOP UP
                  </button>
                  <button
                      type="button"
                      onClick={() => { setTxType('SELL'); setInputQty(""); setInputPrice(""); }}
                      className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                          txType === 'SELL' 
                              ? 'bg-amber-500 text-white shadow-xs' 
                              : 'text-slate-500 hover:text-slate-900'
                      }`}
                  >
                      JUAL / WITHDRAW
                  </button>
              </div>

              {txType === 'BUY' ? (
                  <div>
                      <div className="flex justify-between items-center mb-1.5 ml-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                              {currentSpec.tickerLabel}
                          </label>
                          <span className="text-[10px] font-bold text-sky-700">
                              Mata Uang Transaksi
                          </span>
                      </div>
                      <div className="flex gap-2">
                          <input
                              type="text"
                              placeholder={currentSpec.tickerPlaceholder}
                              value={inputName}
                              onChange={(e) => setInputName(activeCategory === 'saham' || activeCategory === 'kripto' ? e.target.value.toUpperCase() : e.target.value)}
                              className="flex-1 h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:border-sky-500 focus:bg-white transition-all"
                          />
                          <select
                              value={inputCurrency}
                              onChange={(e) => setInputCurrency(e.target.value)}
                              className="w-28 h-12 px-2 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs text-sky-900 outline-none focus:border-sky-500 focus:bg-white text-center cursor-pointer shadow-xs"
                          >
                              {availableCurrencies.map(c => (
                                  <option key={c} value={c}>{c}</option>
                              ))}
                          </select>
                      </div>
                  </div>
              ) : (
                  <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                          Pilih Aset Yang Ingin Dijual
                      </label>
                      <select
                          value={selectedSellSymbol}
                          onChange={(e) => {
                              setSelectedSellSymbol(e.target.value);
                              const found = filteredItems.find(p => p.symbol === e.target.value);
                              if (found) {
                                  const parts = found.symbol.split('|');
                                  setInputCurrency(parts[1] || 'IDR');
                              }
                          }}
                          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:border-sky-500 focus:bg-white cursor-pointer"
                      >
                          <option value="">-- Pilih dari Portofolio --</option>
                          {filteredItems.map((item: any) => {
                              const itemParts = (item.symbol || "").split('|');
                              const itemCurr = itemParts[1] || 'IDR';
                              const itemSpec = getAssetSpec(activeCategory, itemCurr);
                              return (
                                  <option key={item.symbol} value={item.symbol}>
                                      {item.symbol} (Sisa: {item.quantity.toLocaleString(itemCurr === 'IDR' ? 'id-ID' : 'en-US')} {itemSpec.unitShort})
                                  </option>
                              );
                          })}
                      </select>
                  </div>
              )}

              {/* INPUT JUMLAH & HARGA DENGAN PANDUAN PENGUKURAN PRESISI */}
              <div className="grid grid-cols-2 gap-3">
                  <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1 truncate" title={currentSpec.unitLabel}>
                          {currentSpec.unitLabel}
                      </label>
                      <input
                          type="text"
                          inputMode="decimal"
                          placeholder={currentSpec.qtyPlaceholder}
                          value={inputQty}
                          onChange={(e) => setInputQty(formatNum(e.target.value))}
                          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white tabular-nums shadow-xs"
                      />
                      <p className="text-[9px] font-semibold text-sky-700 mt-1 ml-1 leading-tight">
                          💡 {currentSpec.unitHint}
                      </p>
                  </div>
                  <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1 truncate" title={currentSpec.priceLabel}>
                          {currentSpec.priceLabel}
                      </label>
                      <input
                          type="text"
                          inputMode="decimal"
                          placeholder={currentSpec.pricePlaceholder}
                          value={inputPrice}
                          onChange={(e) => setInputPrice(formatNum(e.target.value))}
                          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm text-slate-900 outline-none focus:border-sky-500 focus:bg-white tabular-nums shadow-xs"
                      />
                      <p className="text-[9px] font-semibold text-slate-500 mt-1 ml-1 leading-tight">
                          Satuan {currentSpec.priceShort} ({inputCurrency})
                      </p>
                  </div>
              </div>

              {/* INFO SALDO SUMBER DANA SPESIFIK MATA UANG */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100/90 border border-slate-200 text-xs">
                  <span className="font-bold text-slate-600 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-sky-600" />
                      Sumber Dana ({inputCurrency === 'IDR' ? 'Kas Rupiah / FCF' : `Saldo Valas ${inputCurrency}`}):
                  </span>
                  <span className={`font-black tabular-nums ${availableSourceBalance > 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                      {inputCurrency === 'IDR' ? formatRp(fcf) : `${inputCurrency} ${availableForex.toLocaleString('en-US')}`}
                  </span>
              </div>

              {/* LIVE CALCULATION & BREAKDOWN CARD */}
              <div className="bg-gradient-to-br from-sky-50/90 via-sky-50/50 to-blue-50/60 border border-sky-200/90 rounded-2xl p-4 text-center space-y-1.5 relative overflow-hidden">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-sky-900 uppercase tracking-widest">
                      <Calculator className="w-3.5 h-3.5 text-sky-600" />
                      <span>Kalkulasi Nilai Transaksi ({inputCurrency})</span>
                  </div>

                  {qtyNum > 0 && prcNum > 0 ? (
                      <div className="bg-white/80 border border-sky-200/60 rounded-xl p-2.5 text-xs text-sky-950 font-bold space-y-0.5 shadow-2xs">
                          <p className="tabular-nums font-mono text-[11px] text-sky-900">
                              {formulaResult.formula}
                          </p>
                          {formulaResult.subFormula && (
                              <p className="text-[10px] text-emerald-700 font-bold">
                                  {formulaResult.subFormula}
                              </p>
                          )}
                      </div>
                  ) : (
                      <p className="text-[11px] text-slate-400 italic">
                          Masukkan jumlah dan harga di atas untuk melihat rincian kalkulasi.
                      </p>
                  )}

                  <div className="pt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Total Nilai Transaksi ({inputCurrency})
                      </p>
                      <p className="text-2xl font-black text-brand-navy tabular-nums">
                          {inputCurrency === 'IDR' ? formatRp(totalCostNative) : `${inputCurrency} ${totalCostNative.toLocaleString('en-US')}`}
                      </p>
                      {inputCurrency !== 'IDR' && (
                          <p className="text-[11px] font-bold text-sky-700 mt-0.5 tabular-nums">
                              (Setara {formatRp(totalIDR)})
                          </p>
                      )}
                  </div>
              </div>

              {/* ALERT JIKA SALDO VALAS / KAS KURANG */}
              {isInsufficient && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-2xl flex flex-col gap-2 font-medium">
                      <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                          <span>
                              {inputCurrency === 'IDR' 
                                  ? `Saldo Kas Rupiah Anda (${formatRp(fcf)}) tidak cukup untuk pembelian ini.`
                                  : `Saldo Valas ${inputCurrency} Anda (${inputCurrency} ${availableForex.toLocaleString('en-US')}) tidak cukup (Dibutuhkan: ${inputCurrency} ${totalCostNative.toLocaleString('en-US')}). Sumber dana dipotong langsung dari saldo ${inputCurrency}.`
                              }
                          </span>
                      </div>
                      {inputCurrency !== 'IDR' && (
                          <Link 
                              href="/forex" 
                              className="self-start inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                          >
                              <span>Buka Menu Valas & Top Up {inputCurrency}</span>
                              <ArrowRight className="w-3 h-3" />
                          </Link>
                      )}
                  </div>
              )}

              <button
                  type="submit"
                  disabled={isSubmitting || (txType === 'BUY' && isInsufficient)}
                  className={`w-full h-14 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                      txType === 'BUY' 
                          ? 'bg-sky-600 hover:bg-sky-700 text-white' 
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
              >
                  {isSubmitting ? (
                      <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>MEMPROSES...</span>
                      </>
                  ) : (
                      <span>{txType === 'BUY' ? `KONFIRMASI BELI (${inputCurrency})` : `KONFIRMASI JUAL (${inputCurrency})`}</span>
                  )}
              </button>
          </form>
      );
  };

  if (isUserLoading || isInvLoading || isForexLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
              <img src="/BILANO-ICON-NEW.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
              <div className="flex items-center gap-2 text-brand-navy font-bold text-sm bg-amber-50 border border-amber-200 px-5 py-2.5 rounded-full shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-gold"/>
                  <span>Memuat Portofolio Investasi...</span>
              </div>
          </div>
      );
  }

  return (
    <MobileLayout>
      <TrialFeatureNotice featureKey="investment" featureName="Investasi" />
      <div className="flex flex-col -mx-5 -mt-5">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BANNER DENGAN TEMA SKY BLUE & NAVY */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-8 bg-gradient-to-b from-[#E0F2FE] via-[#BAE6FD] to-[#7DD3FC] flex flex-col relative z-10 border-b border-sky-300/60">
            
            {/* Top Navigation Bar */}
            <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(12,74,110,0.06)] flex items-center justify-between relative z-30 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <button 
                        type="button"
                        onClick={() => {
                            if (viewState === 'detail') {
                                setViewState('main');
                                setActiveCategory(null);
                            } else {
                                setLocation("/");
                            }
                        }}
                        className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                        title="Kembali"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-800" strokeWidth={2.5} />
                    </button>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                            <p className="text-[10px] font-bold text-sky-900 uppercase tracking-widest">
                                Aset & Pasar Modal
                            </p>
                        </div>
                        <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                            {viewState === 'detail' && activeCategory ? `Portofolio ${assetConfig[activeCategory].label}` : "Investasi & Portofolio"}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        onClick={() => { refetchRates(); toast({ title: "Kurs Diperbarui! 🔄", description: "Nilai valas portofolio disinkronkan ke pasar live." }); }}
                        className="flex items-center gap-1 bg-white border border-slate-200 text-brand-navy px-3 py-1.5 rounded-full text-[10px] font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                        <RefreshCcw className="w-3.5 h-3.5 text-sky-600" />
                        <span>LIVE KURS</span>
                    </button>
                </div>
            </div>

            {/* 2. HERO CARD INVESTASI */}
            <div className="bg-gradient-to-br from-[#1D3E72] via-[#0C4A6E] to-[#0369A1] text-white p-6 rounded-[28px] border-l-[6px] border-l-sky-400 shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                <TrendingUp className="absolute -right-4 -bottom-4 w-36 h-36 text-sky-300/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                <div className="absolute right-0 top-0 w-32 h-32 bg-sky-400/20 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <span className="bg-sky-400 text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                            <PieChart className="w-3 h-3 text-brand-navy fill-current" />
                            {viewState === 'detail' && activeCategory ? `KATEGORI ${assetConfig[activeCategory].label.toUpperCase()}` : "TOTAL NILAI PORTOFOLIO"}
                        </span>

                        <span className="text-[10px] text-sky-200 font-bold bg-black/30 px-2.5 py-0.5 rounded-full border border-sky-300/20">
                            Realtime Asset
                        </span>
                    </div>

                    <p className="text-[10px] font-bold text-sky-200 uppercase tracking-widest mt-1">
                        {viewState === 'detail' && activeCategory ? `Estimasi Nilai ${assetConfig[activeCategory].label}` : "Total Akumulasi Semua Aset"}
                    </p>

                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3 leading-tight tabular-nums">
                        {viewState === 'detail' ? displayCategoryValue : displayTotalPortfolio}
                    </h2>

                    <div className="flex items-center justify-between pt-2.5 border-t border-white/15 text-[11px] font-bold">
                        <span className="flex items-center gap-1.5 text-sky-100">
                            <Wallet className="w-3.5 h-3.5 text-sky-300" /> Saldo Kas Rupiah (FCF):
                        </span>
                        <span className="bg-sky-400/20 border border-sky-300/40 text-sky-100 px-2.5 py-0.5 rounded-lg font-black tabular-nums">
                            {formatRp(fcf)}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BODY CONTENT SECTION */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-28 bg-slate-50 flex flex-col gap-4">
            
            {viewState === 'main' ? (
                <div className="space-y-4 animate-in fade-in">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <PieChart className="w-4 h-4 text-sky-600" />
                            Pilih Kategori Portofolio
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400">8 Kelas Aset Terpadu</span>
                    </div>

                    {/* 8 GRID KELAS ASET DENGAN SATUAN PENGUKURAN LENGKAP */}
                    <div className="grid grid-cols-2 gap-3">
                        {(Object.keys(assetConfig) as AssetType[]).map((key) => {
                            const cfg = assetConfig[key];
                            const Icon = cfg.icon;
                            
                            const catItems = aggregatedPortfolio.filter((p: any) => {
                                const typeLower = (p.type || '').toLowerCase();
                                if (typeLower) {
                                    if (typeLower === 'crypto') return key === 'kripto';
                                    if (typeLower === 'gold') return key === 'emas';
                                    if (typeLower === 'deposito') return key === 'obligasi';
                                    return typeLower === key.toLowerCase();
                                }
                                const parts = (p.symbol||"").split('|');
                                const sym = parts[0] || "";
                                const isLegacyStock = sym.length === 4 && !sym.includes(" ");
                                if (key === 'saham') return isLegacyStock;
                                return !isLegacyStock;
                            });
                            const catVal = catItems.reduce((acc: number, p: any) => acc + calculateLiveValue(p), 0);

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => { 
                                        setActiveCategory(key); 
                                        setViewState('detail'); 
                                    }}
                                    className="bg-white rounded-3xl p-4 border border-slate-200/80 hover:border-sky-300 shadow-xs hover:shadow-sm active:scale-[0.98] transition-all flex flex-col items-center text-center gap-2 cursor-pointer group relative overflow-hidden"
                                >
                                    <div className={`w-13 h-13 rounded-2xl flex items-center justify-center p-3 transition-transform group-hover:scale-105 shadow-xs border ${cfg.bg}`}>
                                        <Icon className={`w-6 h-6 ${cfg.iconColor}`} strokeWidth={2.2} />
                                    </div>
                                    <div className="w-full">
                                        <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">{cfg.label}</h4>
                                        <p className="text-[9px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                                            {cfg.description}
                                        </p>
                                        <p className="text-[10px] font-bold text-sky-700 bg-sky-50 py-0.5 px-2 rounded-md border border-sky-200/80 inline-block mt-1.5 tabular-nums">
                                            {catVal > 0 ? formatRp(catVal) : "0 Aset"}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="space-y-4 animate-in slide-in-from-right duration-300">
                    {/* TAB TRANSAKSI */}
                    <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-5 space-y-4">
                        {renderDynamicForm()}
                    </div>

                    {/* DAFTAR ASET TERDAFTAR DI PORTOFOLIO */}
                    <div className="space-y-3 pt-1">
                        <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider px-1 flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-sky-600" />
                            Daftar Kepemilikan {activeCategory ? assetConfig[activeCategory].label : 'Aset'} ({filteredItems.length})
                        </h3>

                        {filteredItems.length === 0 ? (
                            <div className="bg-white rounded-3xl p-8 border border-dashed border-sky-200 text-center shadow-xs">
                                <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-sky-100">
                                    <Info className="w-6 h-6" />
                                </div>
                                <p className="font-bold text-slate-800 text-xs">Belum ada aset di kategori {activeCategory ? assetConfig[activeCategory].label : ''}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Catat transaksi pembelian pertama Anda melalui form di atas.</p>
                            </div>
                        ) : (
                            filteredItems.map((item: any) => {
                                const parts = (item.symbol||"").split('|');
                                const sym = parts[0] || "";
                                const curr = (parts[1] || 'IDR').toUpperCase();
                                const isIDR = curr === 'IDR';
                                const itemSpec = activeCategory ? getAssetSpec(activeCategory, curr) : null;
                                const totalVal = calculateLiveValue(item);

                                // Format quantity & price display
                                let qtyDisplay = `${item.quantity.toLocaleString(isIDR ? 'id-ID' : 'en-US')} ${itemSpec?.unitShort || 'Unit'}`;
                                if (activeCategory === 'saham' && isIDR) {
                                    qtyDisplay = `${item.quantity.toLocaleString('id-ID')} Lot (${(item.quantity * 100).toLocaleString('id-ID')} Lembar)`;
                                }

                                const priceDisplay = isIDR 
                                    ? `Rp ${Math.round(item.avgPrice).toLocaleString('id-ID')}`
                                    : `${curr} ${item.avgPrice.toLocaleString('en-US')}`;

                                return (
                                    <div 
                                        key={item.symbol} 
                                        className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 font-black text-xs flex items-center justify-center shrink-0">
                                                {!isIDR ? curr : sym.slice(0, 4)}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate">{sym}</h4>
                                                <p className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate">
                                                    {qtyDisplay} @ {priceDisplay}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <p className="font-black text-slate-900 text-xs sm:text-sm tabular-nums">
                                                {formatRp(totalVal)}
                                            </p>
                                            {!isIDR && (
                                                <p className="text-[9px] text-slate-400 font-medium tabular-nums">
                                                    {curr} {(item.quantity * item.avgPrice).toLocaleString('en-US')}
                                                </p>
                                            )}
                                            <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60 inline-block mt-0.5">
                                                Live Asset
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

        </div>
      </div>

      {/* POPUP SUMBER DANA KETIKA MEMBELI / MENJUAL ASET (TERISOLASI SESUAI MATA UANG) */}
      {showSourcePopup && sourcePopupConfig && (
          <SourceSelectionPopup
              type={sourcePopupConfig.type}
              currency={txType === 'SELL' ? ((selectedSellSymbol || '').split('|')[1] || inputCurrency || 'IDR') : inputCurrency}
              onCancel={() => setShowSourcePopup(false)}
              onSelect={(source) => {
                  setShowSourcePopup(false);
                  executeTransaction(source);
              }}
              title={sourcePopupConfig.title}
              description={sourcePopupConfig.description}
          />
      )}
    </MobileLayout>
  );
}