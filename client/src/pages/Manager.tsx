import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { 
  ShieldCheck, Users, Lock, Mail, Activity, ArrowRight, 
  Monitor, Smartphone, HelpCircle, MousePointerClick, 
  CreditCard, CheckCircle2, Download, TrendingUp 
} from "lucide-react";

export default function Manager() {
  const [, setLocation] = useLocation();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);

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

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tracking-stats", { headers: { "x-user-email": "bilanotech@gmail.com" } });
      const json = await res.json();
      if (res.ok) setData(json);
      else { alert(json.error || "Gagal memuat data intelijen."); setIsAuthorized(false); }
    } catch (e) {
      alert("Terjadi kesalahan jaringan."); setIsAuthorized(false); 
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // UI: LAYAR LOGIN ADMIN (LIGHT THEME)
  // ==========================================
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/50 to-slate-100 text-slate-800 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-rose-400/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="bg-white/80 backdrop-blur-xl border border-white p-8 rounded-[32px] w-full max-w-sm relative z-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-violet-700">Akses Intelijen</h1>
          <p className="text-slate-500 text-sm text-center mb-8 font-medium">Pusat Data Konversi BILANO</p>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="email" required placeholder="Email Admin" value={credentials.email} onChange={(e) => setCredentials({...credentials, email: e.target.value})} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all" />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="password" required placeholder="Kata Sandi" value={credentials.password} onChange={(e) => setCredentials({...credentials, password: e.target.value})} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all" />
            </div>
            <button disabled={authLoading} type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black py-4 rounded-xl mt-4 shadow-lg shadow-indigo-200 active:scale-95 transition-all">
              {authLoading ? "MEMVALIDASI..." : "MASUK KE DASHBOARD"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading || !data) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-600 font-bold">Menganalisis Data Event...</p>
    </div>
  );

  const formatYesNoData = (qData: any) => [ { name: "Ya", value: qData.ya || 0 }, { name: "Tidak", value: qData.tidak || 0 } ];
  const COLORS_QUIZ = ["#10b981", "#f43f5e"]; 
  const q4Data = Object.keys(data.quizData.q4.scores).map(key => ({ name: `Skor ${key}`, value: data.quizData.q4.scores[key] }));

  const funnelData = [
    { name: 'Kunjungan', count: data.funnel.landing },
    { name: 'Mulai Kuis', count: data.funnel.quiz_started },
    { name: 'Lolos Kuis', count: data.funnel.quiz_completed },
    { name: 'Checkout', count: data.funnel.checkout },
    { name: 'Lunas', count: data.funnel.paid },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-20 selection:bg-indigo-100">
      
      {/* HEADER TEMA TERANG */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">BILANO Intelligence</h1>
              <p className="text-slate-500 text-xs font-medium">Tracking Identitas & Funnel Konversi</p>
            </div>
          </div>
          <button onClick={() => setIsAuthorized(false)} className="text-sm font-bold text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-lg transition-colors">Keluar</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-10">
        
        {/* ==========================================
            1. OVERVIEW & METADATA
        ========================================== */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black text-slate-800">1. Identitas & Metadata (Overview)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 rounded-full blur-2xl"></div>
              <Users className="w-10 h-10 text-indigo-500 relative z-10" />
              <div className="relative z-10">
                <p className="text-slate-500 text-sm font-bold">Total Pengunjung Unik</p>
                <p className="text-4xl font-black text-slate-800">{data.totalUnique}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-sky-50 rounded-full blur-2xl"></div>
              <div>
                <p className="text-slate-500 text-sm font-bold mb-1">Perangkat (Desktop)</p>
                <p className="text-3xl font-black text-slate-800">{data.devices.desktop}</p>
              </div>
              <Monitor className="w-10 h-10 text-sky-500 relative z-10 opacity-80" />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between relative overflow-hidden">
               <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full blur-2xl"></div>
              <div>
                <p className="text-slate-500 text-sm font-bold mb-1">Perangkat (Mobile)</p>
                <p className="text-3xl font-black text-slate-800">{data.devices.mobile}</p>
              </div>
              <Smartphone className="w-10 h-10 text-emerald-500 relative z-10 opacity-80" />
            </div>
          </div>
        </section>

        {/* ==========================================
            2. TAHAP KESADARAN (LANDING PAGE)
        ========================================== */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black text-slate-800">2. Tahap Kesadaran (Landing Page)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={<Users/>} title="Landing Page Terbuka" value={data.metrics.landing_viewed} color="indigo" />
            <StatCard icon={<HelpCircle/>} title="Membaca FAQ" value={data.metrics.faq_toggled} color="amber" />
            <StatCard icon={<MousePointerClick/>} title="Klik 'Install/Dapatkan'" value={data.metrics.cta_clicked} color="rose" />
          </div>
        </section>

        {/* ==========================================
            3. TAHAP KUALIFIKASI (ONBOARDING QUIZ)
        ========================================== */}
        <section className="bg-white rounded-[32px] p-6 lg:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-8">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black text-slate-800">3. Tahap Kualifikasi (Drop-off & Ketertarikan Kuis)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <QuizChart title="Q1: Masa Depan Terencana" data={formatYesNoData(data.quizData.q1)} total={data.quizData.q1.ya + data.quizData.q1.tidak} />
            <QuizChart title="Q2: Visi/Arah Keuangan" data={formatYesNoData(data.quizData.q2)} total={data.quizData.q2.ya + data.quizData.q2.tidak} />
            <QuizChart title="Q3: Membangun Kebiasaan" data={formatYesNoData(data.quizData.q3)} total={data.quizData.q3.ya + data.quizData.q3.tidak} />
            
            <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <h3 className="text-sm font-bold text-slate-700 mb-1">Q4: Tingkat Urgensi</h3>
              <p className="text-[11px] text-slate-500 mb-2">Skala 1-10</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={q4Data} cx="50%" cy="50%" innerRadius={30} outerRadius={60} dataKey="value">
                      {q4Data.map((_, index) => (<Cell key={`cell-${index}`} fill={`hsl(220, 90%, ${30 + (index * 6)}%)`} />))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================
            4. TAHAP MONETISASI & KONVERSI AKHIR
        ========================================== */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black text-slate-800">4. Tahap Monetisasi & Konversi Akhir</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Visual Funnel Utama */}
            <div className="col-span-12 lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
               <h3 className="text-sm font-bold text-slate-700 mb-6">Piramida Konversi Pengguna</h3>
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#94a3b8" />
                      <YAxis dataKey="name" type="category" width={100} stroke="#475569" fontWeight="bold" fontSize={12} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 8, 8, 0]}>
                        {funnelData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#94a3b8', '#818cf8', '#6366f1', '#4f46e5', '#10b981'][index]} />
                        ))}
                      </Bar>
                    </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Metrik Pembayaran Lengkap */}
            <div className="col-span-12 lg:col-span-4 grid grid-cols-1 gap-4">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Minat Paket</p>
                   <div className="flex justify-between items-end relative z-10">
                     <div>
                       <p className="text-2xl font-black text-amber-400">{data.plans.year}</p>
                       <p className="text-[10px] text-slate-300">Tahunan</p>
                     </div>
                     <div>
                       <p className="text-2xl font-black text-white">{data.plans.month}</p>
                       <p className="text-[10px] text-slate-300">Bulanan</p>
                     </div>
                   </div>
                </div>

                <StatCard icon={<CheckCircle2/>} title="Berhasil Bayar (Success)" value={data.metrics.payment_success} color="emerald" small />
                <StatCard icon={<Download/>} title="Setuju Install PWA" value={data.metrics.pwa_installed} color="blue" small />
            </div>
          </div>
        </section>

      </main>
    </div>
  );

  // Komponen Pembantu
  function StatCard({ icon, title, value, color, small = false }: any) {
    const colorMap: Record<string, string> = {
      indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
      amber: "text-amber-600 bg-amber-50 border-amber-100",
      rose: "text-rose-600 bg-rose-50 border-rose-100",
      emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
      blue: "text-blue-600 bg-blue-50 border-blue-100",
    };
    
    return (
      <div className={`bg-white p-${small ? '4' : '6'} rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4`}>
        <div className={`w-${small ? '10 h-10' : '12 h-12'} rounded-xl flex items-center justify-center border ${colorMap[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-slate-500 text-xs font-bold">{title}</p>
          <p className={`${small ? 'text-2xl' : 'text-3xl'} font-black text-slate-800`}>{value}</p>
        </div>
      </div>
    );
  }

  function QuizChart({ title, data, total }: any) {
    return (
      <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
        <h3 className="text-sm font-bold text-slate-700 mb-1">{title}</h3>
        <p className="text-[11px] text-slate-500 mb-2">Total Menjawab: {total}</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" stroke="none">
                {data.map((_:any, index:number) => (<Cell key={`cell-${index}`} fill={COLORS_QUIZ[index % COLORS_QUIZ.length]} />))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }
}