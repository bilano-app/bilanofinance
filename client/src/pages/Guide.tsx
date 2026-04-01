import { useState } from "react";
import { MobileLayout } from "@/components/Layout";
import { Card } from "@/components/UIComponents";
import { 
    BookOpen, Home, ArrowDownCircle, ArrowUpCircle, Globe, 
    HandCoins, RefreshCcw, LineChart, FileText, ScanLine, 
    BarChart3, Camera 
} from "lucide-react"; 

// Komponen penanda (placeholder) untuk gambar
const ImagePlaceholder = ({ label, src }: { label: string, src?: string }) => {
    // Jika gambar tersedia, tampilkan gambarnya
    if (src) {
        return (
            <img src={`/${src}`} alt={label} className="w-full h-auto rounded-[16px] shadow-md my-4 border border-slate-200" />
        );
    }
    // Jika tidak ada, kembalikan ke placeholder asli
    return (
        <div className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-[16px] flex flex-col items-center justify-center text-slate-400 my-4 hover:bg-slate-100 transition-colors">
            <Camera className="w-6 h-6 mb-2 opacity-50" />
            <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
        </div>
    );
};

export default function Guide() {
  const [activeTab, setActiveTab] = useState(0);

  const guides = [
    {
      id: "home", title: "Dasbor Utama", icon: Home, color: "text-indigo-600", bg: "bg-indigo-100",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Halaman utama BILANO adalah pusat kendali finansial Anda. Dari sini, Anda dapat memantau seluruh kekayaan secara langsung dan mengakses berbagai fitur dengan cepat.</p>
              
              <ImagePlaceholder label="Letak Gambar: Saldo Kas Utama" src="Home1.jpg" />
              
              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Kartu Saldo Kas (Biru Besar):</b> Menampilkan total ketersediaan dana likuid Anda secara <i>real-time</i> (gabungan Rupiah dan Valas). <i>Tips:</i> Tekan ikon mata di pojok kanan atas untuk menyembunyikan nominal (Mode Privasi).</li>
                  <li><b>Ringkasan Mutasi:</b> Dua kartu putih di bawah saldo menunjukkan total akumulasi uang masuk dan keluar khusus pada bulan ini.</li>
              </ul>

              <ImagePlaceholder label="Letak Gambar: Fitur Pilihan & Pintasan" src="Home2.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Fitur Pilihan:</b> Menu utama aplikasi (Valas, Hutang, Langganan, dll). Geser (swipe) area ini ke kiri/kanan untuk melihat fitur tambahan.</li>
                  <li><b>Tombol Akses Cepat:</b> Di pojok kanan bawah terdapat tombol kuning untuk Pusat Bantuan dan tombol biru untuk Buku Panduan ini.</li>
              </ul>
          </div>
      )
    },
    {
      id: "income", title: "Pemasukan", icon: ArrowDownCircle, color: "text-emerald-600", bg: "bg-emerald-100",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Catat setiap tetes keringat hasil kerja Anda di sini. BILANO memisahkan pemasukan ke dalam dua mode pintar agar pembukuan tetap akurat:</p>
              
              <ImagePlaceholder label="Letak Gambar: Pemasukan Tunai" src="Income1.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-4">
                  <li><b>Mode TUNAI (Cash) - Hijau:</b> Gunakan ini jika uangnya sudah benar-benar masuk ke dompet/rekening Anda. Transaksi ini akan langsung menambah Saldo Kas Utama saat itu juga.</li>
              </ul>

              <ImagePlaceholder label="Letak Gambar: Pemasukan Piutang" src="Income2.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Mode PIUTANG (Belum Dibayar) - Oranye:</b> Sangat berguna bagi freelancer/pebisnis! Gunakan jika pekerjaan selesai tapi uang masih ditahan klien. Ini TIDAK akan menambah saldo kas sekarang, melainkan dicatat aman di menu "Hutang" sebagai Piutang, lengkap dengan pengingat jatuh temponya.</li>
              </ul>
          </div>
      )
    },
    {
      id: "expense", title: "Pengeluaran", icon: ArrowUpCircle, color: "text-rose-600", bg: "bg-rose-100",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Kendalikan pengeluaran Anda agar tidak bocor alus. Halaman ini dilengkapi dengan Satpam Finansial otomatis.</p>
              
              <ImagePlaceholder label="Letak Gambar: Pengeluaran Tunai & Peringatan Budget" src="Expense1.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-4">
                  <li><b>Mode TUNAI (Cash) - Merah:</b> Untuk pembelanjaan menggunakan uang riil Anda saat ini.</li>
                  <li><b>Proteksi & Peringatan:</b> Jika Anda belanja melebihi Saldo, transaksi diblokir. Jika Anda belanja melebihi Target Limit Bulanan, sistem akan membunyikan alarm! Anda bisa lanjut menembus limit menggunakan Dana Darurat, namun jatah budget bulan depan Anda akan dipotong otomatis.</li>
              </ul>

              <ImagePlaceholder label="Letak Gambar: Pengeluaran Ngutang" src="Expense2.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Mode HUTANG (Ngutang Dulu) - Oranye:</b> Gunakan jika Anda berbelanja dengan uang teman, Paylater, atau kasbon warung. Saldo Kas tidak terpotong sekarang, melainkan dicatat sebagai kewajiban di menu "Hutang" agar Anda tidak lupa membayarnya.</li>
              </ul>
          </div>
      )
    },
    {
      id: "valas", title: "Dompet Valas", icon: Globe, color: "text-blue-600", bg: "bg-blue-100",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Fitur elit kelas dunia! Pantau kurs secara <i>real-time</i> dan lacak kekayaan Anda dalam mata uang asing (USD, EUR, SGD, dll) tanpa repot menghitung manual.</p>
              
              <ImagePlaceholder label="Letak Gambar: Dasbor Valas & Live Rates" src="Valas1.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-4">
                  <li><b>Pemantauan Pasar:</b> Lihat estimasi total aset valas Anda dalam Rupiah. Tekan salah satu mata uang (misal: USD) untuk membuka Grafik Tren Nilai Tukar 30 Hari Terakhir.</li>
              </ul>

              <ImagePlaceholder label="Letak Gambar: Catat Mutasi Valas" src="Valas2.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-4">
                  <li><b>Catat Mutasi:</b> Gunakan tab ini jika Anda menerima atau mengeluarkan valas murni (misal: digaji pakai USD) tanpa melibatkan saldo Rupiah Anda.</li>
              </ul>

              <ImagePlaceholder label="Letak Gambar: Tukar Valas (Jual/Beli)" src="Valas3.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Tukar Valas:</b> Gunakan tab ini saat Anda menukarkan uang secara fisik di Money Changer/Bank. Pilih Beli (Rupiah keluar) atau Jual (Rupiah masuk), lalu masukkan kurs deal yang Anda dapatkan.</li>
              </ul>
          </div>
      )
    },
    {
      id: "hutang", title: "Hutang Piutang", icon: HandCoins, color: "text-pink-600", bg: "bg-pink-100",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Jaga kesehatan finansial dan pertemanan Anda. <b>Penting:</b> Halaman ini khusus untuk aktivitas Pinjam Meminjam Uang Tunai secara langsung.</p>
              
              <ImagePlaceholder label="Letak Gambar: Piutang (Uang Kita)" src="Debt1.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-4">
                  <li><b>Mode PIUTANG (Hijau):</b> Catat saat Anda meminjamkan uang ke orang lain. Jika dia membayar, tekan tombol TAGIH (bisa bayar lunas atau cicil). Jika uang dibawa kabur, tekan tombol IKHLAS untuk menjadikannya kerugian di laporan.</li>
              </ul>

              <ImagePlaceholder label="Letak Gambar: Hutang (Pinjaman)" src="Debt2.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Mode HUTANG (Merah):</b> Catat saat Anda meminjam uang (Pinjol, Bank, Teman). BILANO akan memberi notifikasi sebelum jatuh tempo. Tekan tombol BAYAR saat Anda menyicil/melunasinya, dan saldo Anda akan terpotong otomatis.</li>
              </ul>
          </div>
      )
    },
    {
      id: "langganan", title: "Langganan", icon: RefreshCcw, color: "text-teal-600", bg: "bg-teal-100",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Biarkan BILANO mengingat tagihan rutin Anda (WiFi, Netflix, Listrik, dll) agar terhindar dari denda keterlambatan.</p>
              
              <ImagePlaceholder label="Letak Gambar: Estimasi Beban Tetap & Tambah Langganan" src="Subs1.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-4">
                  <li><b>Nominal Tetap (Statis):</b> Untuk tagihan yang harganya pasti (Cth: Spotify, Kosan). Masukkan siklus (/Bulan atau /Tahun) dan tanggal tagihan.</li>
              </ul>

              <ImagePlaceholder label="Letak Gambar: Tagihan Berubah-ubah (Dinamis)" src="Subs2.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-4">
                  <li><b>Berubah-ubah (Dinamis):</b> Untuk tagihan tak pasti (Cth: Listrik, PDAM, Kartu Kredit). Saat jatuh tempo tiba, aplikasi akan memunculkan Pop-Up menanyakan "Berapa tagihan Anda bulan ini?".</li>
              </ul>

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Kelola Tagihan:</b> Anda bisa menonaktifkan sementara tagihan tanpa menghapusnya dari riwayat. Sangat pas jika Anda sedang "jeda" berlangganan bulan ini.</li>
              </ul>
          </div>
      )
    },
    {
      id: "investasi", title: "Investasi", icon: LineChart, color: "text-amber-600", bg: "bg-amber-100",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>BILANO bertindak sebagai manajer investasi pribadi Anda untuk berbagai kelas aset (Saham, Crypto, Reksadana, Emas, dll).</p>
              
              <ImagePlaceholder label="Letak Gambar: Dasbor Investasi" src="Aset1.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-4">
                  <li><b>Beli Aset (Hijau):</b> Catat saat Anda mengalokasikan uang. Khusus Saham (IDR), cukup masukkan harga per 1 lembar, sistem otomatis mengalikannya dengan 100 (1 Lot).</li>
              </ul>

              <ImagePlaceholder label="Letak Gambar: Jual Aset & Profit/Loss" src="Aset2.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-4">
                  <li><b>Jual Aset (Merah):</b> Saat Anda <i>take profit</i> atau <i>cut loss</i>. Sistem akan otomatis menghitung Keuntungan (Profit) atau Kerugian (Loss) Anda dari selisih harga beli dan jual! Uang hasil penjualan langsung masuk kembali ke Saldo Kas.</li>
              </ul>

              <ImagePlaceholder label="Letak Gambar: Analisa Aset" src="Aset3.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Analisa Aset:</b> Fitur Smart Screener berbasis AI untuk melihat tren harga pasar (Eksklusif pengguna BILANO PRO).</li>
              </ul>
          </div>
      )
    },
    {
      id: "laporan", title: "Pusat Laporan", icon: FileText, color: "text-orange-600", bg: "bg-orange-100",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Tidak perlu pusing membuat pembukuan manual di Excel! Dengan satu klik, BILANO menyusun seluruh data Anda menjadi dokumen PDF profesional.</p>
              
              <ImagePlaceholder label="Letak Gambar: Download Laporan PDF" src="pdf1.jpg" />

              <p className="font-bold text-slate-800">Isi Dokumen Laporan PDF:</p>
              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Neraca Terpadu:</b> Rangkuman Total Kekayaan Bersih (Net Worth).</li>
                  <li><b>Arus Kas Murni:</b> Daftar uang masuk/keluar harian pada bulan berjalan.</li>
                  <li><b>Riwayat Investasi:</b> Catatan beli/jual lengkap dengan kalkulasi Profit/Loss.</li>
                  <li><b>Detail Hutang Piutang:</b> Status kelunasan tagihan Anda.</li>
                  <li><b>Estimasi Valas:</b> Portofolio asing yang dikonversi ke Rupiah dengan kurs live.</li>
              </ul>

              <ImagePlaceholder label="Letak Gambar: Contoh Hasil Cetakan PDF & Grafik" src="pdf2.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Grafik Visual:</b> Di halaman belakang PDF, sistem otomatis menggambar Line Chart, Lollipop Chart, & Bar Chart yang memetakan tren aset Anda 12 bulan terakhir!</li>
              </ul>
          </div>
      )
    },
    {
      id: "scan", title: "Smart Scan", icon: ScanLine, color: "text-purple-600", bg: "bg-purple-100",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Malas mengetik? Biarkan AI (Kecerdasan Buatan) BILANO mencatat transaksi hanya dengan suara atau foto struk.</p>
              
              <ImagePlaceholder label="Letak Gambar: Mode Suara (Voice Command)" src="scan1.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-4">
                  <li><b>Mode Suara:</b> Tekan ikon mikrofon dan bicaralah natural. Contoh: <i>"Baru aja beli kopi 50 ribu"</i> atau <i>"Dipinjam Budi uang 100 ribu"</i>. AI akan membedakan jenis transaksi, nominal, dan kategorinya secara instan!</li>
              </ul>

              <ImagePlaceholder label="Letak Gambar: Mode Scan Struk" src="scan2.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Mode Scan:</b> Upload foto struk belanja minimarket/restoran. Sistem OCR kami akan membaca teks di gambar, menemukan total nominal belanja, dan menyiapkannya di formulir konfirmasi sebelum disimpan.</li>
              </ul>
          </div>
      )
    },
    {
      id: "performance", title: "Performa", icon: BarChart3, color: "text-cyan-600", bg: "bg-cyan-100",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Ini adalah "Buku Rapor" keuangan Anda untuk mengevaluasi kesehatan finansial dan memantau budget bulanan.</p>
              
              <ImagePlaceholder label="Letak Gambar: Progress Target Kekayaan" src="perfom.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-4">
                  <li><b>Capaian Impian:</b> Progress bar ini membandingkan Kekayaan Bersih Anda saat ini dengan Target Finansial impian Anda.</li>
                  <li><b>Kesehatan Budget:</b> Awasi perbandingan Batas Pengeluaran vs Uang yang sudah Terpakai bulan ini agar tidak overbudget.</li>
              </ul>

              <ImagePlaceholder label="Letak Gambar: Top Kategori & ROI Premium" src="perfom2.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Top Kategori:</b> Cari tahu ke mana uang Anda "bocor". Merangking kategori belanja paling boros bulan ini.</li>
                  <li><b>Kalkulasi ROI:</b> Insight mendalam tentang keuntungan investasi dan persentase kekayaan (Terkunci khusus pengguna BILANO PRO).</li>
              </ul>
          </div>
      )
    }
  ];

  return (
    <MobileLayout title="Panduan Aplikasi" showBack={true}>
      <div className="pt-4 pb-20 space-y-6">
          
          <div className="px-2">
              <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md shrink-0">
                      <BookOpen className="w-7 h-7 text-indigo-300" />
                  </div>
                  <div className="relative z-10">
                      <h2 className="text-xl font-black tracking-tight mb-1">Buku Panduan</h2>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                          Pelajari cara memaksimalkan seluruh fitur pintar aplikasi BILANO.
                      </p>
                  </div>
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none"></div>
              </div>
          </div>

          <div className="flex overflow-x-auto hide-scrollbar gap-3 px-2 pb-2">
              <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
              {guides.map((g, idx) => (
                  <button 
                      key={g.id}
                      onClick={() => setActiveTab(idx)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-full font-bold text-sm transition-all shrink-0 shadow-sm border ${activeTab === idx ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                      <g.icon className={`w-4 h-4 ${activeTab === idx ? 'text-white' : g.color}`} />
                      {g.title}
                  </button>
              ))}
          </div>

          <div className="px-2 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="rounded-[32px] p-6 shadow-xl border border-slate-100 bg-white relative overflow-hidden">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${guides[activeTab].bg}`}>
                      {(() => {
                          const Icon = guides[activeTab].icon;
                          return <Icon className={`w-8 h-8 ${guides[activeTab].color}`} />;
                      })()}
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-6">{guides[activeTab].title}</h3>
                  
                  {/* Area Konten Dinamis (Teks & Placeholder Gambar) */}
                  {guides[activeTab].content}
                  
              </Card>
          </div>

      </div>
    </MobileLayout>
  );
}