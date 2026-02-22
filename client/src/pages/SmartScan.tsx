import { useState, useRef, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input, Card } from "@/components/UIComponents";
// HANYA MENGGUNAKAN IKON YANG PASTI ADA DI SEMUA VERSI (ANTI-CRASH)
import { 
    Mic, ImagePlus, Check, X, 
    Globe, AlertTriangle, RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Tesseract from 'tesseract.js';

export default function SmartScan() {
    const { toast } = useToast();
    
    // --- STATE ---
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0); 
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [liveRates, setLiveRates] = useState<Record<string, number>>({});
    
    // Budget Data
    const [targetData, setTargetData] = useState<any>(null);
    const [currentExpense, setCurrentExpense] = useState(0);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    
    // Form Hasil
    const [showResultForm, setShowResultForm] = useState(false);
    const [detectedType, setDetectedType] = useState<'income' | 'expense' | 'debt' | 'receivable'>('expense');
    const [isForex, setIsForex] = useState(false);
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [desc, setDesc] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [rate, setRate] = useState("16000");
    const [debtName, setDebtName] = useState("");

    // STATE MODAL DARURAT (Persis seperti Expense.tsx)
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [emergencyDetails, setEmergencyDetails] = useState({ deficit: 0, nextMonthLimit: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const recognitionRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // PRELOAD DATA
    useEffect(() => {
        const loadData = async () => {
            try {
                fetch("/api/forex/rates").then(r => r.json()).then(d => {
                    setLiveRates(d);
                    if(d['USD']) setRate(Math.floor(d['USD']).toString());
                }).catch(() => {});

                const [resTarget, resTx] = await Promise.all([
                    fetch("/api/target"), 
                    fetch("/api/transactions")
                ]);
                
                if (resTarget.ok && resTx.ok) {
                    const target = await resTarget.json();
                    const txs = await resTx.json();
                    
                    setTargetData(target);

                    const now = new Date();
                    const exp = txs.filter((t: any) => {
                        const d = new Date(t.date);
                        return t.type === 'expense' && 
                               d.getMonth() === now.getMonth() && 
                               d.getFullYear() === now.getFullYear();
                    }).reduce((acc: number, t: any) => acc + t.amount, 0);
                    
                    setCurrentExpense(exp);
                    setIsDataLoaded(true);
                } else {
                    setIsDataLoaded(true); 
                }
            } catch (e) {
                setIsDataLoaded(true); 
            }
        };
        loadData();
    }, []);

    const formatRp = (val: number) => "Rp " + Math.round(val).toLocaleString("id-ID");

    const processTextLogic = (text: string) => {
        const lower = text.toLowerCase();
        
        if (lower.includes("saham") || lower.includes("reksa") || lower.includes("crypto") || lower.includes("invest")) {
            alert("⚠️ Transaksi Investasi harap diinput manual di menu Investasi."); 
            setIsListening(false); setIsScanning(false); return;
        }

        let newType: any = 'expense';
        if (lower.includes("terima") || lower.includes("dapat") || lower.includes("dikasih") || lower.includes("masuk") || lower.includes("gaji") || lower.includes("transfer dari")) {
            newType = 'income';
        } else if (lower.includes("utang") || lower.includes("pinjam")) {
            newType = lower.includes("saya") || lower.includes("aku") ? 'debt' : 'receivable';
        }

        let newIsForex = false;
        let newCurrency = "USD";
        const currencyMap: Record<string, string> = {
            'ringgit': 'MYR', 'myr': 'MYR', 'yen': 'JPY', 'jpy': 'JPY', 'won': 'KRW', 'krw': 'KRW',
            'real': 'SAR', 'riyal': 'SAR', 'sar': 'SAR', 'euro': 'EUR', 'eur': 'EUR', 'yuro': 'EUR', 'uro': 'EUR',
            'singapura': 'SGD', 'sgd': 'SGD', 'pound': 'GBP', 'sterling': 'GBP', 'dolar': 'USD', 'dollar': 'USD', 'usd': 'USD'
        };

        for (const [key, code] of Object.entries(currencyMap)) {
            if (lower.includes(key)) { newIsForex = true; newCurrency = code; break; }
        }
        
        let newAmount = 0;
        const lines = text.split(/\r?\n/);
        const candidates: number[] = [];
        
        lines.forEach(line => {
            const l = line.toLowerCase();
            if (l.includes("ref") || l.includes("id") || l.includes("kode") || l.includes("no.")) return; 
            const nums = line.match(/\d+[.,\d]*/g) || [];
            nums.forEach(raw => {
                let clean = raw.replace(/\./g, "").replace(/,/g, ".");
                if (l.includes("juta")) clean = (parseFloat(clean) * 1000000).toString();
                else if (l.includes("ribu")) clean = (parseFloat(clean) * 1000).toString();
                const val = parseFloat(clean);
                if (!isNaN(val)) {
                    if (val > 1000000000000) return; 
                    if (raw.startsWith("202") && raw.length >= 8) return;
                    if (newIsForex) { if (val > 0) candidates.push(val); }
                    else { if (val >= 500) candidates.push(val); }
                }
            });
        });
        if (candidates.length > 0) newAmount = Math.max(...candidates);

        let newCategory = "Lainnya";
        if (lower.includes("makan") || lower.includes("kopi")) newCategory = "Makan/Minum";
        else if (lower.includes("gojek") || lower.includes("grab") || lower.includes("bensin")) newCategory = "Transport";

        setDetectedType(newType);
        setIsForex(newIsForex);
        setCurrency(newCurrency);
        setAmount(newAmount > 0 ? newAmount.toString() : ""); 
        setCategory(newCategory);
        setDesc(isScanning ? "Hasil Scan" : text);
        if (newIsForex && liveRates[newCurrency]) setRate(Math.floor(liveRates[newCurrency]).toString());

        setShowResultForm(true);
    };

    const startListening = () => {
        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) { toast({ title: "Gunakan Chrome", variant: "destructive" }); return; }
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.lang = 'id-ID'; 
            recognitionRef.current.onstart = () => setIsListening(true);
            recognitionRef.current.onend = () => setIsListening(false);
            recognitionRef.current.onresult = (e: any) => processTextLogic(e.results[0][0].transcript);
            recognitionRef.current.start();
        } catch (e) { toast({ title: "Mic Error", variant: "destructive" }); }
    };
    const stopListening = () => { if (recognitionRef.current) recognitionRef.current.stop(); };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImagePreview(URL.createObjectURL(file));
            setIsScanning(true);
            setScanProgress(10);
            try {
                const result = await Tesseract.recognize(file, 'eng', { logger: m => { if (m.status === 'recognizing text') setScanProgress(Math.floor(m.progress * 100)); }});
                setScanProgress(100);
                setTimeout(() => { processTextLogic(result.data.text); setIsScanning(false); toast({ title: "Selesai", description: "Data dibaca." }); }, 500);
            } catch (err) { setIsScanning(false); setShowResultForm(true); }
        }
    };

    // --- LOGIKA SIMPAN & MODAL DARURAT ---
    const handleSave = async (isEmergencyOverride = false) => {
        if (!amount) { toast({title: "Nominal kosong", variant:"destructive"}); return; }
        
        const sanitizedAmount = amount.toString().replace(/\./g, "").replace(/,/g, ".");
        const finalAmount = parseFloat(sanitizedAmount); 

        // 1. MUNCULKAN MODAL DARURAT INTERNAL JIKA MELEBIHI BATAS
        if (!isEmergencyOverride && isDataLoaded && detectedType === 'expense' && !isForex && targetData?.monthlyBudget > 0) {
            const remainingBudget = targetData.monthlyBudget - currentExpense;
            
            if (finalAmount > remainingBudget) {
                const deficit = finalAmount - (remainingBudget > 0 ? remainingBudget : 0);
                const nextMonthPred = targetData.monthlyBudget - deficit;
                setEmergencyDetails({ deficit, nextMonthLimit: nextMonthPred });
                setShowEmergencyModal(true); 
                return; // Berhenti dan tunggu user konfirmasi di modal
            }
        }

        setIsSubmitting(true);

        try {
            if (isForex) {
                await fetch("/api/forex/transaction", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: detectedType, currency, amount: finalAmount, description: desc })
                });
                toast({ title: "Valas Diupdate!", description: `${currency} ${finalAmount}` });
            } 
            else if (detectedType === 'debt' || detectedType === 'receivable') {
                await fetch("/api/debts", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: detectedType === 'debt' ? 'hutang' : 'piutang', name: debtName || "Seseorang", amount: finalAmount, description: desc, isPaid: false })
                });
                toast({ title: "Tercatat!", description: "Saldo disesuaikan." });
            } 
            else {
                await fetch("/api/transactions", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: detectedType, amount: finalAmount, category: category || "Lainnya", description: desc, date: new Date() })
                });
                toast({ title: "Tersimpan!", description: "Data masuk." });
            }

            // Jika diklik "Pakai Dana Darurat" di Modal
            if (isEmergencyOverride) {
                try {
                    await fetch("/api/target/penalty", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", "x-user-email": localStorage.getItem("bilano_email") || "" },
                        body: JSON.stringify({ amount: emergencyDetails.deficit })
                    });
                    toast({ title: "Dana Darurat Dipakai", description: "Budget bulan depan telah dikurangi." });
                } catch (err) {}
            }

            setShowEmergencyModal(false);
            
            // FIX ANTI LEMOT: Force Refresh Halaman agar UI Home langsung update!
            window.location.href = "/";
            
        } catch (e) { 
            toast({ title: "Gagal", description: "Cek koneksi server.", variant: "destructive" }); 
        } finally {
            setIsSubmitting(false);
        }
    };

    const remainingBudget = targetData ? targetData.monthlyBudget - currentExpense : 0;

    return (
        <MobileLayout title="Scan & Suara Pintar" showBack>
            <div className="pt-4 pb-20 space-y-6 relative">
                
                {/* MODAL DARURAT INTERNAL (Sama Persis seperti di Expense.tsx) */}
                {showEmergencyModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95">
                            <button onClick={() => setShowEmergencyModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6"/>
                            </button>
                            
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
                                    <AlertTriangle className="w-8 h-8 text-rose-600"/>
                                </div>
                                
                                <div>
                                    <h3 className="text-xl font-extrabold text-slate-800">Budget Tidak Cukup!</h3>
                                    <p className="text-slate-500 text-sm mt-1">
                                        Sisa limit budget: <span className="font-bold text-slate-700">{formatRp(remainingBudget < 0 ? 0 : remainingBudget)}</span>
                                    </p>
                                </div>

                                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-left space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Kekurangan:</span>
                                        <span className="font-bold text-rose-600">{formatRp(emergencyDetails.deficit)}</span>
                                    </div>
                                    <div className="h-px bg-rose-200 w-full"></div>
                                    <p className="text-xs text-rose-700 leading-relaxed">
                                        Jika lanjut, Anda akan menggunakan <strong>Dana Darurat</strong>. 
                                        Konsekuensinya, budget bulan depan akan otomatis dipotong.
                                    </p>
                                    <div className="flex justify-between text-xs font-bold bg-white p-2 rounded-lg border border-rose-100 mt-2">
                                        <span className="text-slate-500">Budget Bulan Depan Jadi:</span>
                                        <span className="text-indigo-600">{formatRp(emergencyDetails.nextMonthLimit)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button variant="outline" onClick={() => setShowEmergencyModal(false)} className="flex-1 border-slate-200">
                                        Batalkan
                                    </Button>
                                    <Button 
                                        onClick={() => handleSave(true)} 
                                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? "Memproses..." : "Pakai Darurat"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange}/>

                {!showResultForm && (
                    <div className="space-y-8 animate-in fade-in">
                        <div className="flex flex-col items-center justify-center bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 mx-4 text-center">
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Perintah Suara</h3>
                            <p className="text-xs text-slate-400 mb-6">"Dapat 300 Dolar" / "Beli bensin 20 ribu"</p>
                            <div className="relative flex items-center justify-center">
                                {isListening && <span className="absolute inset-0 rounded-full bg-rose-400 opacity-20 animate-ping scale-150"></span>}
                                <button onClick={isListening ? stopListening : startListening} className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${isListening ? 'bg-rose-500 text-white scale-110' : 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white hover:shadow-indigo-200'}`}>
                                    {isListening ? <div className="w-6 h-6 bg-white rounded-sm" /> : <Mic className="w-8 h-8"/>}
                                </button>
                            </div>
                            <div className="mt-6 h-6">
                                {transcript ? <p className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block">"{transcript}"</p> : null}
                            </div>
                        </div>

                        <div className="px-4 text-center">
                            <div className="flex items-center gap-2 mb-4 justify-center opacity-60">
                                <div className="h-px bg-slate-200 w-12"></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ATAU</span>
                                <div className="h-px bg-slate-200 w-12"></div>
                            </div>
                            <button onClick={() => fileInputRef.current?.click()} className="w-full py-6 bg-white border-2 border-dashed border-indigo-200 rounded-3xl flex flex-col items-center justify-center gap-3 hover:bg-indigo-50/30 active:scale-[0.98] transition-all group">
                                <div className="bg-indigo-50 text-indigo-600 p-4 rounded-full group-hover:scale-110 transition-transform shadow-sm"><ImagePlus className="w-6 h-6"/></div>
                                <div><span className="font-bold text-slate-700 block text-sm mb-0.5">Scan Bukti / Struk</span><span className="text-[10px] text-slate-400">Otomatis baca nominal & valas</span></div>
                            </button>
                        </div>

                        {isScanning && (
                            <div className="fixed inset-0 z-[60] bg-slate-900/90 flex flex-col items-center justify-center text-white backdrop-blur-md p-6 text-center">
                                <div className="w-full max-w-[200px] h-2 bg-slate-700 rounded-full overflow-hidden mb-4"><div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${scanProgress}%` }}></div></div>
                                <p className="font-bold text-xl mb-1">{scanProgress < 100 ? "Membaca..." : "Menyaring Data..."}</p>
                                {imagePreview && <img src={imagePreview} className="w-32 h-32 object-cover rounded-xl border-2 border-white/20 mt-4 mx-auto"/>}
                            </div>
                        )}
                    </div>
                )}

                {showResultForm && (
                    <Card className="p-5 border-t-4 border-t-indigo-500 animate-in slide-in-from-bottom-10 shadow-2xl pb-24">
                        <div className="flex justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Konfirmasi</h3>
                                <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                                    {['income','expense','debt','receivable'].map(t => (
                                        <button key={t} onClick={() => setDetectedType(t as any)} className={`px-3 py-1 text-[10px] rounded-full border font-bold transition-colors ${detectedType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-500 border-slate-200'}`}>{t.toUpperCase()}</button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => setShowResultForm(false)} className="bg-slate-100 p-2 rounded-full h-fit hover:bg-rose-100 hover:text-rose-500"><X className="w-5 h-5"/></button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className={`p-2 rounded-full ${isForex ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}><Globe className="w-4 h-4"/></div>
                                <div className="flex-1"><label className="text-xs font-bold text-slate-700 block">Valas / Mata Uang Asing</label></div>
                                <input type="checkbox" checked={isForex} onChange={e => setIsForex(e.target.checked)} className="w-5 h-5 accent-blue-600 rounded"/>
                            </div>

                            {isForex && (
                                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100 animate-in fade-in">
                                    <div>
                                        <label className="text-[10px] font-bold text-blue-700 uppercase mb-1 block">Mata Uang</label>
                                        <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full text-sm bg-white rounded-lg border border-blue-200 p-2 h-10">
                                            {Object.keys(liveRates).length > 0 ? Object.keys(liveRates).map(c => <option key={c} value={c}>{c}</option>) : <option>USD</option>}
                                        </select>
                                    </div>
                                    <div><label className="text-[10px] font-bold text-blue-700 uppercase mb-1 block">Kurs Live</label><Input value={rate} onChange={e => setRate(e.target.value)} className="h-10 text-xs bg-white border-blue-200"/></div>
                                </div>
                            )}

                            <div><label className="text-xs font-bold text-slate-500 block mb-1">Nominal {isForex ? currency : '(IDR)'}</label><Input value={amount} onChange={e => setAmount(e.target.value)} type="text" className="text-2xl font-bold text-slate-800 bg-slate-50 border-slate-200 h-12" placeholder="0"/></div>

                            {(detectedType === 'debt' || detectedType === 'receivable') ? (
                                <div><label className="text-xs font-bold text-slate-500 block mb-1">Nama Pihak</label><Input value={debtName} onChange={e => setDebtName(e.target.value)} placeholder="Contoh: Budi"/></div>
                            ) : (
                                <div><label className="text-xs font-bold text-slate-500 block mb-1">Kategori</label><Input value={category} onChange={e => setCategory(e.target.value)}/></div>
                            )}
                            
                            <div><label className="text-xs font-bold text-slate-500 block mb-1">Catatan</label><textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm h-20 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"></textarea></div>
                        </div>

                        <Button 
                            onClick={() => handleSave(false)} 
                            disabled={!isDataLoaded}
                            className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 font-bold h-12 rounded-xl text-sm disabled:opacity-50"
                        >
                            {isDataLoaded ? <Check className="w-4 h-4 mr-2"/> : <RefreshCw className="w-4 h-4 mr-2 animate-spin"/>}
                            {isDataLoaded ? "SIMPAN DATA" : "Memuat Budget..."}
                        </Button>
                    </Card>
                )}
            </div>
        </MobileLayout>
    );
}