import { useState } from "react";
import { MobileLayout } from "@/components/Layout";
import { Card } from "@/components/UIComponents";
import { BookOpen, Home, Wallet, TrendingDown, DollarSign, HandCoins, RefreshCcw, TrendingUp } from "lucide-react";

export default function Guide() {
  const [activeTab, setActiveTab] = useState(0);

  const guides = [
    {
      id: "home", title: "Dasbor Utama", icon: Home, color: "text-indigo-600", bg: "bg-indigo-100",
      content: "Halaman utama (Home) adalah pusat kendali keuangan Anda. Di sini Anda bisa melihat total uang tunai dan aset valuta asing (Valas) yang Anda miliki. Pada bagian bawah, terdapat pintasan cepat untuk mencatat Pemasukan atau Pengeluaran harian Anda."
    },
    {
      id: "income", title: "Pemasukan", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-100",
      content: "Fitur untuk mencatat setiap uang yang masuk ke dompet Anda, seperti Gaji, Bonus, atau Hasil Usaha. Jika Anda lupa mencatat hari sebelumnya, Anda bisa mengubah tanggalnya. Data ini akan langsung menambah 'Saldo Kas' di Home."
    },
    {
      id: "expense", title: "Pengeluaran", icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-100",
      content: "Fitur untuk mencatat setiap uang yang keluar. Pastikan Anda mengelompokkannya sesuai kategori (Makan, Transport, Belanja) agar laporan akhir bulan Anda akurat. Ini akan memotong 'Saldo Kas' Anda."
    },
    {
      id: "valas", title: "Dompet Valas", icon: DollarSign, color: "text-blue-600", bg: "bg-blue-100",
      content: "Fitur elit untuk menyimpan catatan mata uang asing (USD, EUR, SGD, dll). Anda bisa 'Beli' Valas menggunakan saldo Rupiah Anda, atau sekadar mencatat pemasukan valas. Sistem kami akan mengambil nilai kurs terkini secara otomatis untuk menghitung total kekayaan Anda."
    },
    {
      id: "hutang", title: "Hutang & Piutang", icon: HandCoins, color: "text-pink-600", bg: "bg-pink-100",
      content: "Jangan biarkan hutang tidak tercatat! Gunakan fitur ini untuk mencatat uang yang Anda pinjam (Hutang) atau uang Anda yang dipinjam orang lain (Piutang). Anda bisa mencicil pembayarannya, dan sistem akan mengirimkan notifikasi saat mendekati tanggal jatuh tempo."
    },
    {
      id: "investasi", title: "Investasi", icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-100",
      content: "Kelola portofolio saham, crypto, emas, atau reksadana Anda di sini. Cukup catat jumlah aset (Lot/Koin) dan harga beli rata-rata. Saat Anda menjualnya, sistem akan otomatis menghitung keuntungan (Profit/Loss) Anda."
    },
    {
      id: "langganan", title: "Langganan", icon: RefreshCcw, color: "text-teal-600", bg: "bg-teal-100",
      content: "Punya tagihan Netflix, Spotify, atau WiFi bulanan? Catat di sini! Sistem BILANO akan secara otomatis menagih dan memotong saldo Anda sesuai siklus yang ditentukan (Bulanan/Tahunan) sehingga Anda tidak akan pernah terlewat mencatat pengeluaran wajib."
    }
  ];

  return (
    <MobileLayout title="Panduan Fitur" showBack={true}>
      <div className="pt-4 pb-20 space-y-6">
          <div className="px-2">
              <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md shrink-0">
                      <BookOpen className="w-7 h-7 text-indigo-300" />
                  </div>
                  <div className="relative z-10">
                      <h2 className="text-xl font-black tracking-tight mb-1">Buku Panduan</h2>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                          Pelajari cara memaksimalkan semua fitur pintar di aplikasi BILANO.
                      </p>
                  </div>
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none"></div>
              </div>
          </div>

          {/* TAB MENU MENYAMPING */}
          <div className="flex overflow-x-auto hide-scrollbar gap-3 px-2 pb-2">
              <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
              {guides.map((g, idx) => (
                  <button 
                      key={g.id}
                      onClick={() => setActiveTab(idx)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm transition-all shrink-0 shadow-sm ${activeTab === idx ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                      <g.icon className={`w-4 h-4 ${activeTab === idx ? 'text-white' : g.color}`} />
                      {g.title}
                  </button>
              ))}
          </div>

          {/* KONTEN PENJELASAN */}
          <div className="px-2 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="rounded-[32px] p-6 shadow-xl border-none bg-white relative overflow-hidden">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${guides[activeTab].bg}`}>
                      {(() => {
                          const Icon = guides[activeTab].icon;
                          return <Icon className={`w-8 h-8 ${guides[activeTab].color}`} />;
                      })()}
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-4">{guides[activeTab].title}</h3>
                  <p className="text-sm text-slate-600 leading-loose font-medium text-justify">
                      {guides[activeTab].content}
                  </p>
              </Card>
          </div>
      </div>
    </MobileLayout>
  );
}