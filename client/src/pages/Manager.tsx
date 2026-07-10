import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line 
} from "recharts";

// ==========================================
// 🎨 IKON KUSTOM PREMIUM (NON-STANDARD)
// ==========================================
const IconVault = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M7 8V6a5 5 0 0 1 10 0v2" /><circle cx="12" cy="14" r="2" /></svg>
);
const IconRadar = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /><path d="M12 2v20M2 12h20" /></svg>
);
const IconNode = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
);
const IconDocument = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>
);
const IconApp = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
);
const IconWeb = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);

export default function Manager() {
  const [, setLocation] = useLocation();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);
  
  // State untuk Tab Navigasi
  const [activeTab, setActiveTab] = useState<'website' | 'app' | 'transactions'>('website');

  // ==========================================
  // 🚀 STATE BARU UNTUK ADVANCED METRICS (METRIK 1, 3, 4, 5)
  // ==========================================
  const [funnelDataDropoff, setFunnelDataDropoff] = useState([
    { name: 'Smart Scan', Dimulai: 0, Tersimpan: 0 },
    { name: 'Setup Strategi', Dimulai: 0, Tersimpan: 0 },
    { name: 'Investasi Aset', Dimulai: 0, Tersimpan: 0 }
  ]);
  const [aumVolume, setAumVolume] = useState({ totalRupiah: 0, totalValasIDR: 0 });
  const [errorMetrics, setErrorMetrics] = useState({ 
    totalErrors: 0, 
    errorRate: 0, 
    popularErrors: [] 
  });
  const [sessionDuration, setSessionDuration] = useState({ avgMinutes: 0, activeUsersCount: 0 });

  useEffect(() => {
    const isAuth = localStorage.getItem("bilano_manager_auth");
    if (isAuth === "true") {
      setIsAuthorized(true);
      fetchDashboardStats();
    }
  }, []);

  // 🚀 MENGHUBUNGKAN STATE BARU DENGAN DATA API (JIKA BACKEND SUDAH SIAP)
  useEffect(() => {
    if (data && data.advancedMetrics) {
        if (data.advancedMetrics.dropoff) setFunnelDataDropoff(data.advancedMetrics.dropoff);
        if (data.advancedMetrics.aum) setAumVolume(data.advancedMetrics.aum);
        if (data.advancedMetrics.errors) setErrorMetrics(data.advancedMetrics.errors);
        if (data.advancedMetrics.sessions) setSessionDuration(data.advancedMetrics.sessions);
    }
  }, [data]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const res = await fetch("/api/admin/manager-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: credentials.email, password: credentials.password })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setIsAuthorized(true);
        localStorage.setItem("bilano_manager_auth", "true"); 
        fetchDashboardStats(); 
      } else {
        alert(json.error || "Kredensial salah.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("bilano_manager_auth");
    setIsAuthorized(false);
    setData(null);
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tracking-stats", { headers: { "x-user-email": "bilanotech@gmail.com" } });
      const json = await res.json();
      if (res.ok) setData(json);
      else { alert(json.error || "Gagal memuat data intelijen."); handleLogout(); }
    } catch (e) {
      alert("Terjadi kesalahan jaringan."); handleLogout(); 
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#e8ecf1] text-[#1e293b] flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-10 rounded-sm w-full max-w-md border border-[#cbd5e1] shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#2563eb]"></div>
          <div className="flex justify-center mb-6"><img src="/BILANO-ICON.png" alt="Bilano Logo" className="h-14 object-contain" /></div>
          <h1 className="text-xl font-bold text-center mb-1 text-[#0f172a] uppercase tracking-wider">Manager Terminal</h1>
          <p className="text-[#64748b] text-xs text-center mb-8 font-medium tracking-wide">SECURE ACCESS REQUIRED</p>
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">ID Pengenal</label>
              <input type="email" required value={credentials.email} onChange={(e) => setCredentials({...credentials, email: e.target.value})} className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-sm px-4 py-3 text-sm focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] outline-none transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1">Kata Sandi</label>
              <input type="password" required value={credentials.password} onChange={(e) => setCredentials({...credentials, password: e.target.value})} className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-sm px-4 py-3 text-sm focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] outline-none transition-all" />
            </div>
            <button disabled={authLoading} type="submit" className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold py-3.5 rounded-sm text-sm uppercase tracking-wider transition-colors mt-2">
              {authLoading ? "AUTHENTICATING..." : "AUTHORIZE"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading || !data) return (
    <div className="min-h-screen bg-[#e8ecf1] flex flex-col items-center justify-center font-mono">
      <div className="w-8 h-8 border-2 border-[#cbd5e1] border-t-[#2563eb] rounded-full animate-spin mb-4"></div>
      <p className="text-[#64748b] text-xs tracking-widest uppercase">Fetching Data...</p>
    </div>
  );

  const formatYesNoData = (qData: any) => [ { name: "Ya", value: qData.ya || 0 }, { name: "Tidak", value: qData.tidak || 0 } ];
  const COLORS_QUIZ = ["#2563eb", "#ef4444"]; 
  const q4Data = Object.keys(data.quizData.q4.scores).map(key => ({ name: `Skor ${key}`, value: data.quizData.q4.scores[key] }));

  const funnelData = [
    { name: 'Kunjungan', count: data.funnel.landing },
    { name: 'Mulai Kuis', count: data.funnel.quiz_started },
    { name: 'Lolos Kuis', count: data.funnel.quiz_completed },
    { name: 'Checkout', count: data.funnel.checkout },
    { name: 'Lunas', count: data.funnel.paid },
  ];

  const appMetrics = data.appMetrics || {};
  const featAdopt = data.featureAdoption || {};
  const totalFeatureEvents = (featAdopt.ai_chat + featAdopt.smart_scan + featAdopt.portfolio_view + featAdopt.manual_input) || 1; // avoid div by 0

  return (
    <div className="min-h-screen bg-[#e8ecf1] text-[#1e293b] font-sans pb-20">
      
      {/* HEADER & NAVIGATION */}
      <header className="bg-white border-b border-[#cbd5e1] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/BILANO-ICON.png" alt="Bilano Icon" className="h-8 object-contain" />
            <div className="border-l border-[#e2e8f0] pl-4">
              <h1 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider">Manager Terminal</h1>
              <p className="text-[#64748b] text-[10px] font-mono uppercase tracking-widest">Live Data Analytics</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-[#ef4444] hover:bg-[#fee2e2] px-4 py-2 rounded-sm transition-colors border border-transparent hover:border-[#fca5a5]">
            LOGOUT
          </button>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 flex gap-6 border-t border-[#f1f5f9] mt-2">
           <button onClick={() => setActiveTab('website')} className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'website' ? 'border-[#2563eb] text-[#2563eb]' : 'border-transparent text-[#64748b] hover:text-[#0f172a]'}`}>
              <IconWeb /> Analisis Website
           </button>
           <button onClick={() => setActiveTab('app')} className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'app' ? 'border-[#8b5cf6] text-[#8b5cf6]' : 'border-transparent text-[#64748b] hover:text-[#0f172a]'}`}>
              <IconApp /> Performa Aplikasi (PWA)
           </button>
           <button onClick={() => setActiveTab('transactions')} className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'transactions' ? 'border-[#10b981] text-[#10b981]' : 'border-transparent text-[#64748b] hover:text-[#0f172a]'}`}>
              <IconDocument /> Riwayat Transaksi
           </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-6">
        
        {/* ==========================================
            TAB 1: ANALISIS WEBSITE
        ========================================== */}
        {activeTab === 'website' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Metrik Utama */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Total Pendapatan</p>
                  <p className="text-2xl font-black text-[#0f172a]">{formatCurrency(data.totalRevenue || 0)}</p>
                </div>
                <div className="text-[#2563eb] bg-[#eff6ff] p-2 rounded-sm"><IconVault /></div>
              </div>
              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Pengunjung Unik</p>
                  <p className="text-2xl font-black text-[#0f172a]">{data.totalUnique}</p>
                </div>
                <div className="text-[#0ea5e9] bg-[#f0f9ff] p-2 rounded-sm"><IconNode /></div>
              </div>
              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Konversi Lunas</p>
                  <p className="text-2xl font-black text-[#10b981]">{data.metrics.payment_success}</p>
                </div>
                <div className="text-[#10b981] bg-[#ecfdf5] p-2 rounded-sm"><IconDocument /></div>
              </div>
              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm flex items-start justify-between">
                <div>
                  <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Minat Paket</p>
                  <div className="flex gap-4 mt-1">
                    <div><span className="text-[#f59e0b] font-bold">{data.plans.year}</span> <span className="text-[10px] text-[#64748b]">Tahun</span></div>
                    <div><span className="text-[#2563eb] font-bold">{data.plans.month}</span> <span className="text-[10px] text-[#64748b]">Bulan</span></div>
                  </div>
                </div>
                <div className="text-[#f59e0b] bg-[#fffbeb] p-2 rounded-sm"><IconRadar /></div>
              </div>
            </div>

            {/* Grafik Konversi (Line Chart) */}
            <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6">
               <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-6 flex items-center gap-2">
                 <IconRadar /> Tren Pengunjung vs Penjualan (Harian)
               </h3>
               <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={data.dailyTrend || []} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => new Date(val).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'})} />
                        <YAxis yAxisId="left" stroke="#0ea5e9" fontSize={10} />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} />
                        <Tooltip contentStyle={{ borderRadius: '2px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}/>
                        <Line yAxisId="left" type="monotone" name="Pengunjung" dataKey="visitors" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                        <Line yAxisId="right" type="monotone" name="Sales Lunas" dataKey="sales" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
            </section>

            {/* Funnel & Quiz */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6">
                 <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-6 flex items-center gap-2">
                   <IconRadar /> Piramida Konversi (Funnel)
                 </h3>
                 <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                        <YAxis dataKey="name" type="category" width={80} stroke="#475569" fontWeight="bold" fontSize={10} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '2px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                        <Bar dataKey="count" fill="#2563eb" radius={[0, 2, 2, 0]}>
                          {funnelData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={['#94a3b8', '#64748b', '#3b82f6', '#2563eb', '#10b981'][index]} />
                          ))}
                        </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                 </div>
              </section>

              <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6">
                <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-6 flex items-center gap-2">
                   <IconNode /> Kualifikasi Kuis Pengguna
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <QuizChart title="Q1: Terencana" data={formatYesNoData(data.quizData.q1)} total={data.quizData.q1.ya + data.quizData.q1.tidak} />
                  <QuizChart title="Q2: Visi Arah" data={formatYesNoData(data.quizData.q2)} total={data.quizData.q2.ya + data.quizData.q2.tidak} />
                  <QuizChart title="Q3: Kebiasaan" data={formatYesNoData(data.quizData.q3)} total={data.quizData.q3.ya + data.quizData.q3.tidak} />
                  <div className="border border-[#e2e8f0] p-3 text-center">
                    <h3 className="text-[10px] font-bold text-[#0f172a] uppercase">Q4: Urgensi (1-10)</h3>
                    <div className="h-28 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={q4Data} cx="50%" cy="50%" innerRadius={20} outerRadius={40} dataKey="value">
                            {q4Data.map((_, index) => (<Cell key={`cell-${index}`} fill={`hsl(220, 80%, ${30 + (index * 8)}%)`} />))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '2px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 2: APLIKASI / PWA
        ========================================== */}
        {activeTab === 'app' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Metrik Vitalitas Pengguna */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">DAU / MAU</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-black text-[#8b5cf6]">{appMetrics.dau} <span className="text-sm font-normal text-slate-400">/ {appMetrics.mau}</span></p>
                </div>
                <p className="text-[9px] text-[#64748b] mt-2 font-mono">Daily / Monthly Active Users</p>
              </div>
              
              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Stickiness Ratio</p>
                <p className="text-2xl font-black text-[#0f172a]">{appMetrics.stickiness}%</p>
                <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
                    <div className={`h-full ${appMetrics.stickiness > 20 ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`} style={{width: `${Math.min(100, appMetrics.stickiness)}%`}}></div>
                </div>
                <p className="text-[9px] text-[#64748b] mt-1 font-mono">Target Sehat: {'>'} 20%</p>
              </div>

              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm">
                <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Post-Purchase Install</p>
                <p className="text-2xl font-black text-[#0f172a]">{appMetrics.installRate}%</p>
                <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
                    <div className="h-full bg-[#3b82f6]" style={{width: `${Math.min(100, appMetrics.installRate)}%`}}></div>
                </div>
                <p className="text-[9px] text-[#64748b] mt-1 font-mono">PWA Installed vs Paid</p>
              </div>

              <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-16 h-16 bg-rose-50 rounded-bl-full z-0"></div>
                <div className="relative z-10">
                  <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Zombie User Rate</p>
                  <p className="text-2xl font-black text-[#ef4444]">{appMetrics.zombieRate}%</p>
                  <p className="text-[9px] text-[#64748b] mt-2 font-mono leading-tight">Paid User, 0 Act (14 Hari Terakhir)</p>
                </div>
              </div>
            </div>

            {/* 🚀 METRIK 3 & 5: AUM & SESSION DURATION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm">
                    <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Total Volume Transaksi (AUM)</p>
                    <h3 className="text-2xl font-black text-[#0f172a]">
                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(aumVolume.totalRupiah + aumVolume.totalValasIDR)}
                    </h3>
                    <div className="flex justify-between text-[10px] text-[#64748b] mt-2 pt-2 border-t border-slate-50 font-medium">
                        <span>Kas Rupiah: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(aumVolume.totalRupiah)}</span>
                        <span>Valas (IDR Equiv): {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(aumVolume.totalValasIDR)}</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-sm border border-[#cbd5e1] shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mb-1">Rata-rata Durasi Sesi (Stickiness)</p>
                        <h3 className="text-2xl font-black text-[#8b5cf6]">{sessionDuration.avgMinutes.toFixed(1)} <span className="text-xs text-[#64748b] font-bold">Menit / Sesi</span></h3>
                    </div>
                    <p className="text-[9px] text-[#64748b] font-medium mt-2">*Dihitung dari true PWA app open hingga visibility hidden.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Feature Adoption Heatmap (Ranking) */}
              <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6">
                 <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-6 flex items-center gap-2">
                   <IconNode /> Feature Adoption Ranking
                 </h3>
                 <div className="space-y-5">
                    <FeatureBar name="AI Assistant (Chat)" count={featAdopt.ai_chat} total={totalFeatureEvents} color="bg-indigo-500" />
                    <FeatureBar name="Smart Scanner (Receipts)" count={featAdopt.smart_scan} total={totalFeatureEvents} color="bg-rose-500" />
                    <FeatureBar name="Portfolio / Forex Viewer" count={featAdopt.portfolio_view} total={totalFeatureEvents} color="bg-emerald-500" />
                    <FeatureBar name="Manual Transaction Input" count={featAdopt.manual_input} total={totalFeatureEvents} color="bg-blue-500" />
                 </div>
                 <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-500 font-mono text-center">
                    Berdasarkan volume trigger event dalam aplikasi
                 </div>
              </section>

              {/* Lifecycle & Cohort */}
              <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6">
                 <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-6 flex items-center gap-2">
                   <IconRadar /> Lifecycle & Cohort Health
                 </h3>
                 
                 <div className="space-y-6">
                    <div className="border border-slate-200 p-4 rounded-sm">
                       <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-2">Time-to-Value (TTV)</h4>
                       <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-800">{appMetrics.ttvHours}</span>
                          <span className="text-sm font-bold text-slate-500">Jam</span>
                       </div>
                       <p className="text-[10px] text-slate-400 mt-1">Rata-rata waktu dari pendaftaran hingga transaksi pertama.</p>
                    </div>

                    <div className="border border-slate-200 p-4 rounded-sm">
                       <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-2">Subscription Renewal Rate</h4>
                       <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-[#10b981]">{appMetrics.renewalRate}%</span>
                       </div>
                       <p className="text-[10px] text-slate-400 mt-1">Persentase user yang memperpanjang paket setelah habis masa aktif.</p>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-sm">
                       <div>
                          <p className="text-[10px] font-bold uppercase text-slate-500">Rata-Rata Input</p>
                          <p className="text-lg font-black text-slate-800">{appMetrics.avgTxPerWeek} <span className="text-[10px] font-normal text-slate-500">Tx / Minggu</span></p>
                       </div>
                       <div className="w-10 h-10 bg-blue-100 text-blue-600 flex items-center justify-center rounded-full">
                          <IconDocument />
                       </div>
                    </div>
                 </div>
              </section>
            </div>

            {/* 🚀 METRIK 1 & 4: DROPOFF FUNNEL & ERROR LOGGING */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6">
                    <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-6 flex items-center gap-2">
                        <IconRadar /> Analisis Drop-off Fitur Pintar
                    </h3>
                    <p className="text-[10px] text-[#64748b] font-medium mb-4 -mt-4">Membandingkan interaksi awal vs transaksi yang berhasil disimpan</p>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelDataDropoff} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '2px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #cbd5e1' }} />
                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                                <Bar dataKey="Dimulai" fill="#cbd5e1" radius={[2, 2, 0, 0]} barSize={24} />
                                <Bar dataKey="Tersimpan" fill="#10b981" radius={[2, 2, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm p-6 border-t-4 border-t-[#ef4444]">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                                <IconNode /> Stabilitas API & Sistem AI
                            </h3>
                            <p className="text-[10px] text-[#64748b] font-medium mt-1">Memantau tingkat kegagalan jaringan atau timeout engine</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black uppercase ${errorMetrics.errorRate > 5 ? 'bg-[#fee2e2] text-[#ef4444]' : 'bg-[#ecfdf5] text-[#10b981]'}`}>
                            Error Rate: {errorMetrics.errorRate.toFixed(2)}%
                        </span>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                        <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Log Kendala Terbanyak:</p>
                        {errorMetrics.popularErrors.length === 0 ? (
                            <p className="text-xs text-[#64748b] font-medium py-3 text-center bg-[#f8fafc] rounded-sm border border-dashed border-[#cbd5e1]">Semua sistem berjalan normal 🟢</p>
                        ) : (
                            errorMetrics.popularErrors.map((err: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-[#f8fafc] rounded-sm border border-[#e2e8f0]">
                                    <span className="text-xs font-mono font-bold text-[#334155] truncate max-w-[200px]">{err.message}</span>
                                    <span className="text-[10px] bg-[#fee2e2] text-[#ef4444] px-2 py-0.5 rounded-sm font-black font-mono">x{err.count}</span>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: TRANSAKSI (TABLE)
        ========================================== */}
        {activeTab === 'transactions' && (
          <section className="bg-white border border-[#cbd5e1] rounded-sm shadow-sm animate-in fade-in duration-300">
            <div className="border-b border-[#cbd5e1] px-5 py-4 bg-[#f8fafc]">
              <h2 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                <IconDocument /> Rekap Transaksi Pembayaran
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f1f5f9] text-[10px] text-[#475569] uppercase tracking-wider font-bold">
                    <th className="px-5 py-3 border-b border-[#cbd5e1]">Tanggal</th>
                    <th className="px-5 py-3 border-b border-[#cbd5e1]">Nama Klien</th>
                    <th className="px-5 py-3 border-b border-[#cbd5e1]">Kontak (Email / Telp)</th>
                    <th className="px-5 py-3 border-b border-[#cbd5e1]">Paket</th>
                    <th className="px-5 py-3 border-b border-[#cbd5e1] text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {(!data.transactionHistory || data.transactionHistory.length === 0) ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-[#64748b] text-xs font-mono">Tidak ada riwayat transaksi.</td></tr>
                  ) : (
                    data.transactionHistory.map((tx: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#f8fafc] border-b border-[#e2e8f0] last:border-0 transition-colors">
                        <td className="px-5 py-3 text-[#64748b] text-xs font-mono">{new Date(tx.date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-5 py-3 font-bold text-[#0f172a]">{tx.name}</td>
                        <td className="px-5 py-3">
                          <div className="text-[#2563eb] text-xs">{tx.email}</div>
                          <div className="text-[#64748b] text-[10px] font-mono">{tx.phone}</div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-1 rounded-sm text-[10px] font-bold uppercase ${tx.plan === 'Tahunan' ? 'bg-[#fffbeb] text-[#d97706] border border-[#fde68a]' : 'bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]'}`}>
                            {tx.plan}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-[#10b981]">
                          {formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </main>
    </div>
  );

  function QuizChart({ title, data, total }: any) {
    return (
      <div className="border border-[#e2e8f0] p-3 text-center">
        <h3 className="text-[10px] font-bold text-[#0f172a] uppercase">{title}</h3>
        <p className="text-[9px] text-[#64748b] mb-1 font-mono">Vol: {total}</p>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={20} outerRadius={40} dataKey="value" stroke="none">
                {data.map((_:any, index:number) => (<Cell key={`cell-${index}`} fill={COLORS_QUIZ[index % COLORS_QUIZ.length]} />))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '2px', border: '1px solid #cbd5e1', fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', color: '#475569' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  function FeatureBar({ name, count, total, color }: any) {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
      <div>
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs font-bold text-slate-700">{name}</span>
          <span className="text-[10px] font-mono text-slate-500">{count} hits ({percentage}%)</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    );
  }
}