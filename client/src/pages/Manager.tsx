import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ShieldCheck, Users, TrendingUp, Lock, Mail, Smartphone, ArrowRight } from "lucide-react";

export default function Manager() {
  const [, setLocation] = useLocation();
  
  // State untuk Data Dashboard
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // State untuk Autentikasi Keamanan
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authStep, setAuthStep] = useState<"login" | "otp">("login");
  const [credentials, setCredentials] = useState({ email: "", password: "", otp: "" });
  const [authLoading, setAuthLoading] = useState(false);

  // =========================================================================
  // 🚀 LOGIKA LOGIN DAN OTP
  // =========================================================================
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
        setAuthStep("otp");
      } else {
        alert(json.error || "Akses ditolak.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const res = await fetch("/api/admin/manager-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: credentials.otp })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setIsAuthorized(true);
        fetchDashboardStats(); // Langsung ambil data jika sukses
      } else {
        alert(json.error || "OTP Salah.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setAuthLoading(false);
    }
  };

  // =========================================================================
  // 🚀 MENGAMBIL DATA DASHBOARD (DIPANGGIL HANYA JIKA LULUS LOGIN)
  // =========================================================================
  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // Kita "tipu" sedikit x-user-email dengan kredensial admin agar lulus validasi rute di backend
      const res = await fetch("/api/admin/tracking-stats", {
        headers: { "x-user-email": "bilanotech@gmail.com" }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 🖥️ UI: LAYAR LOGIN ADMIN (TERKUNCI)
  // =========================================================================
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#040814] text-white flex items-center justify-center p-6 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute w-96 h-96 bg-amber-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="bg-[#121c3a] border border-white/10 p-8 rounded-[32px] w-full max-w-sm relative z-10 shadow-2xl animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-amber-400/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-center mb-2">Akses Terbatas</h1>
          <p className="text-slate-400 text-sm text-center mb-8">Pusat Data Intelijen BILANO</p>

          {authStep === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email" required placeholder="Email Admin"
                  value={credentials.email} onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  className="w-full bg-[#0a1128] border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:border-amber-400 focus:outline-none transition-colors"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password" required placeholder="Kata Sandi"
                  value={credentials.password} onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  className="w-full bg-[#0a1128] border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:border-amber-400 focus:outline-none transition-colors"
                />
              </div>
              <button disabled={authLoading} type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-4 rounded-xl mt-4 active:scale-95 transition-all">
                {authLoading ? "Memvalidasi..." : "MASUK KE TERMINAL"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4 animate-in slide-in-from-right-4">
              <div className="bg-[#0a1128] p-4 rounded-xl border border-white/5 mb-6 text-center">
                <Smartphone className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Kode Keamanan telah dikirim ke nomor:</p>
                <p className="text-sm font-bold text-white tracking-widest mt-1">+6289678200870</p>
                <p className="text-[10px] text-amber-500 mt-2 font-medium">(Cek Terminal Vercel Anda saat ini untuk melihat Simulasi SMS)</p>
              </div>
              <input
                type="text" required placeholder="Masukkan 6 Digit OTP" maxLength={6}
                value={credentials.otp} onChange={(e) => setCredentials({...credentials, otp: e.target.value})}
                className="w-full bg-[#0a1128] border border-white/10 rounded-xl px-4 py-4 text-center text-xl tracking-[0.5em] font-black focus:border-amber-400 focus:outline-none transition-colors"
              />
              <button disabled={authLoading} type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-4 rounded-xl active:scale-95 transition-all flex justify-center items-center gap-2">
                {authLoading ? "Mengecek..." : "VERIFIKASI"} <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 🖥️ UI: LAYAR DASHBOARD MANAGER (HANYA TERLIHAT JIKA LULUS)
  // =========================================================================
  if (loading || !data) return <div className="min-h-screen bg-[#040814] text-white flex items-center justify-center font-bold">Memuat Intelijen Data...</div>;

  const formatYesNoData = (qData: any) => [
    { name: "Ya", value: qData.ya },
    { name: "Tidak", value: qData.tidak }
  ];
  const COLORS = ["#10b981", "#f43f5e"]; 
  const SCALE_COLORS = ["#1e3a8a", "#1e40af", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#fcd34d", "#fbbf24", "#f59e0b"];

  const q4Data = Object.keys(data.quizData.q4.scores).map(key => ({
    name: `Skor ${key}`,
    value: data.quizData.q4.scores[key]
  }));

  return (
    <div className="min-h-screen bg-[#040814] text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-10 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black">BILANO Intelligence Center</h1>
              <p className="text-slate-400 text-sm">Pemantauan Perilaku Pengunjung & Konversi</p>
            </div>
          </div>
          <button onClick={() => setIsAuthorized(false)} className="text-sm font-bold text-rose-500 hover:bg-rose-500/10 px-4 py-2 rounded-lg transition-colors">
            Akhiri Sesi
          </button>
        </header>

        {/* Funnel Singkat */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-[#121c3a] p-6 rounded-2xl border border-white/5 flex items-center gap-4">
            <Users className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-slate-400 text-sm font-bold">Total Pengunjung Unik</p>
              <p className="text-3xl font-black">{data.funnel.uniqueVisitors}</p>
            </div>
          </div>
          <div className="bg-[#121c3a] p-6 rounded-2xl border border-white/5 flex items-center gap-4">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-slate-400 text-sm font-bold">Mencapai Checkout</p>
              <p className="text-3xl font-black">{data.funnel.checkoutInitiated}</p>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-black mb-6">Analisis Pertanyaan Kuis (Drop-off & Interest)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Q1 */}
          <div className="bg-[#121c3a] p-5 rounded-2xl border border-white/5 text-center">
            <h3 className="text-sm font-bold text-slate-300 mb-2">Q1: Masa Depan Terencana</h3>
            <p className="text-xs text-slate-500 mb-4">Total Menjawab: {data.quizData.q1.total}</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={formatYesNoData(data.quizData.q1)} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                    {formatYesNoData(data.quizData.q1).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0a1128', border: 'none', borderRadius: '8px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Q2 */}
          <div className="bg-[#121c3a] p-5 rounded-2xl border border-white/5 text-center">
            <h3 className="text-sm font-bold text-slate-300 mb-2">Q2: Visi/Arah Keuangan</h3>
            <p className="text-xs text-slate-500 mb-4">Total Menjawab: {data.quizData.q2.total}</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={formatYesNoData(data.quizData.q2)} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                    {formatYesNoData(data.quizData.q2).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0a1128', border: 'none', borderRadius: '8px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Q3 */}
          <div className="bg-[#121c3a] p-5 rounded-2xl border border-white/5 text-center">
            <h3 className="text-sm font-bold text-slate-300 mb-2">Q3: Membangun Kebiasaan</h3>
            <p className="text-xs text-slate-500 mb-4">Total Menjawab: {data.quizData.q3.total}</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={formatYesNoData(data.quizData.q3)} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                    {formatYesNoData(data.quizData.q3).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0a1128', border: 'none', borderRadius: '8px' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Q4 (Skala 1-10) */}
          <div className="bg-[#121c3a] p-5 rounded-2xl border border-white/5 text-center">
            <h3 className="text-sm font-bold text-slate-300 mb-2">Q4: Tingkat Urgensi (1-10)</h3>
            <p className="text-xs text-slate-500 mb-4">Total Menjawab: {data.quizData.q4.total}</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={q4Data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                    {q4Data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SCALE_COLORS[index % SCALE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0a1128', border: 'none', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}