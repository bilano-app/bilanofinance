import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Card } from "@/components/UIComponents";
import { 
    BookOpen, Camera, ChevronRight, Sparkles, 
    ArrowRight, Info, CheckCircle2, Lightbulb
} from "lucide-react"; 
import { trackEvent } from "@/lib/tracking";

// Komponen penanda untuk gambar dengan visual modern & elegan
const ImagePlaceholder = ({ label, src }: { label: string; src?: string }) => {
    if (src) {
        const imagePath = src.startsWith('/') ? src : `/${src}`;
        return (
            <div className="my-5 overflow-hidden rounded-[24px] border border-slate-200/90 shadow-md bg-slate-900/5 group">
                <div className="bg-slate-50 flex items-center justify-center p-1 sm:p-2">
                    <img 
                        src={imagePath} 
                        alt={label} 
                        loading="lazy"
                        className="w-full h-auto object-contain rounded-2xl max-h-[520px] transition-transform duration-300 group-hover:scale-[1.01]" 
                    />
                </div>
                <div className="px-4 py-2.5 bg-slate-100/95 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 tracking-wide">{label}</span>
                    <span className="text-[10px] font-black text-brand-navy bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">BILANO PREVIEW</span>
                </div>
            </div>
        );
    }
    return (
        <div className="w-full py-8 px-4 bg-gradient-to-b from-slate-50 to-slate-100/80 border-2 border-dashed border-slate-300 rounded-[20px] flex flex-col items-center justify-center text-slate-400 my-5 hover:bg-slate-100 transition-colors shadow-inner">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm mb-2.5">
                <Camera className="w-6 h-6 opacity-60 text-brand-navy" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 text-center">{label}</span>
            <span className="text-[10px] text-slate-400 font-medium mt-1">Area Penempatan Screenshot Tampilan Halaman</span>
        </div>
    );
};

export default function Guide() {
  const [activeTab, setActiveTab] = useState(0);

  const guides = [
    {
      id: "home",
      title: "Dasbor Utama",
      imageSrc: "/BILANO-ICON-NEW.png",
      tag: "Pusat Kendali",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Halaman utama BILANO adalah pusat komando finansial Anda. Seluruh ringkasan kekayaan bersih, saldo kas, mutasi bulanan, dan jalan pintas ke seluruh fitur dapat diakses dari satu layar utama ini.</p>
              
              <ImagePlaceholder label="Dasbor Utama & Kartu Saldo Kas" src="PANDUAN/Home 1.jpg" />
              
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 space-y-2">
                  <h4 className="font-bold text-brand-navy text-sm flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      Komponen Utama Dasbor:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
                      <li><b>Kartu Saldo Kas (Navy Flagship):</b> Menampilkan total dana likuid terkini Anda. Tekan ikon mata untuk mengaktifkan <i>Mode Privasi</i> (menyembunyikan nominal saldo dari pandangan orang sekitar).</li>
                      <li><b>Pill Sumber Dana / Dompet:</b> Menampilkan rincian tiap rekening bank (BCA, Mandiri, dll.), dompet digital (GoPay, OVO), dan uang tunai. Tekan ikon pensil pada pill untuk mengubah saldo awal secara langsung atau tekan tombol <b>+</b> untuk transfer.</li>
                      <li><b>Kartu Mutasi Arus Kas:</b> Dua kartu di bawah saldo menampilkan total akumulasi uang masuk dan keluar pada bulan berjalan.</li>
                  </ul>
              </div>

              <ImagePlaceholder label="Konsultasi AI, Performa & Menu Eksklusif Premium" src="PANDUAN/Home 2.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Aksi Cepat Kartu:</b> Tombol cepat untuk mencatat <i>Pemasukan</i>, melakukan <i>Transfer</i> antar rekening, dan mencatat <i>Pengeluaran</i> secara instan.</li>
                  <li><b>Grid Fitur Pilihan:</b> 8 menu operasional utama (Valas, Hutang, Langganan, Investasi, Laporan, Scanner, Amal, Tertahan).</li>
                  <li><b>Konsultasi & Analitik:</b> Akses ke <i>ChatAI</i> (asisten finansial cerdas) dan halaman <i>Performa</i> kesehatan anggaran.</li>
                  <li><b>Eksklusif Premium:</b> Akses ke modul literasi finansial <i>BILANO Academy</i>.</li>
              </ul>
          </div>
      )
    },
    {
      id: "income",
      title: "Pemasukan",
      imageSrc: "/INCOME.png",
      tag: "Arus Kas Masuk",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Catat seluruh perolehan dana dan gaji Anda dengan presisi. BILANO menyediakan dua mode pencatatan pemasukan agar akuntansi keuangan Anda tetap rapi:</p>
              
              <ImagePlaceholder label="Mode Pemasukan Tunai Langsung (Kas Masuk)" src="PANDUAN/income 1.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-2">
                  <li><b>Mode TUNAI (Kas Masuk) - Hijau:</b> Gunakan saat uang sudah benar-benar Anda terima di rekening atau dompet fisik. Transaksi ini akan langsung menambah saldo dompet yang Anda pilih dan Saldo Kas Utama secara instan.</li>
                  <li><b>Pilihan Sumber Dompet:</b> Anda dapat menentukan ke rekening bank atau e-wallet mana uang tersebut masuk (misal: BCA, Mandiri, GoPay, Tunai).</li>
              </ul>

              <ImagePlaceholder label="Mode Pemasukan Piutang (Belum Cair / Invoice)" src="PANDUAN/income 2.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Mode PIUTANG (Belum Cair) - Oranye:</b> Khusus bagi freelancer, pebisnis, atau profesional saat pekerjaan telah selesai namun invoice belum dibayarkan oleh klien. Saldo kas Anda tidak akan bertambah dulu, melainkan dicatat aman di menu <i>Hutang Piutang</i> sebagai piutang aktif lengkap dengan nama pihak tertagih dan tanggal jatuh tempo.</li>
                  <li><b>Alokasi Amal Otomatis:</b> Jika fitur amal aktif, sistem akan menghitung persentase sedekah/zakat yang disisihkan dari setiap pemasukan murni yang tercatat.</li>
              </ul>
          </div>
      )
    },
    {
      id: "transfer",
      title: "Transfer Antar Dompet",
      imageSrc: "/TRANSFER.png",
      tag: "Mutasi Internal",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Pindahkan dana antar rekening bank, dompet digital, atau uang tunai tanpa merusak pencatatan arus kas (cashflow) murni Anda.</p>
              
              <ImagePlaceholder label="Formulir Pindah Saldo Antar Rekening & Dompet" src="PANDUAN/Transfer 1.jpg" />

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                      Keunggulan Fitur Transfer:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
                      <li><b>Bukan Pemasukan/Pengeluaran:</b> Perpindahan dana internal tidak dianggap sebagai pengeluaran baru ataupun pemasukan baru, sehingga grafik rasio laba bulanan Anda tetap 100% akurat.</li>
                      <li><b>Validasi Saldo Asal:</b> Sistem memeriksa ketersediaan dana di rekening asal sebelum transfer dieksekusi untuk mencegah saldo minus.</li>
                      <li><b>Tambah Sumber Dana Baru Instan:</b> Jika Anda membuka rekening bank baru atau e-wallet baru, Anda dapat langsung menambahkannya di halaman ini dengan modal saldo awal.</li>
                  </ul>
              </div>

              <ImagePlaceholder label="Daftar Sumber Rekening Bank, E-Wallet & Buat Akun Baru" src="PANDUAN/Transfer 2.jpg" />
          </div>
      )
    },
    {
      id: "expense",
      title: "Pengeluaran",
      imageSrc: "/EXPENSE.png",
      tag: "Arus Kas Keluar",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Kendalikan setiap rupiah yang keluar dengan bantuan sistem Satpam Finansial otomatis yang mencegah terjadinya kebocoran anggaran.</p>
              
              <ImagePlaceholder label="Pencatatan Pengeluaran Tunai (Dipotong Kas)" src="PANDUAN/Expense 1.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-2">
                  <li><b>Mode TUNAI (Dipotong Kas) - Merah:</b> Untuk pembelanjaan menggunakan saldo riil yang memotong rekening/dompet terpilih secara seketika.</li>
                  <li><b>Kategorisasi Cerdas:</b> Pilih kategori belanja (Makan & Minum, Transportasi, Belanja Harian, Tagihan & Utilitas, Hiburan & Liburan, Kesehatan, dll) untuk mempermudah audit pengeluaran bulanan.</li>
                  <li><b>Proteksi Saldo Kosong:</b> Jika transaksi melebihi saldo kas yang tersedia, sistem akan menolak transaksi demi menjaga integritas data Anda.</li>
              </ul>

              <ImagePlaceholder label="Pengeluaran Mode Hutang (Ngutang Dulu / Paylater)" src="PANDUAN/Expense 2.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Mode HUTANG (Ngutang Dulu) - Oranye:</b> Digunakan saat Anda berbelanja menggunakan fasilitas Paylater, kartu kredit, atau kasbon warung. Saldo kas saat ini tidak terpotong, namun otomatis dicatat sebagai kewajiban hutang di menu <i>Hutang Piutang</i> lengkap dengan nama pihak hutang dan tanggal jatuh temponya.</li>
                  <li><b>Penetrasi Dana Darurat:</b> Jika pengeluaran menembus Target Budget Bulanan, sistem memberikan opsi darurat dengan konsekuensi memotong alokasi budget Anda di bulan berikutnya.</li>
              </ul>
          </div>
      )
    },
    {
      id: "forex",
      title: "Dompet Valas",
      imageSrc: "/Valas-ICON.png",
      tag: "Multi-Mata Uang",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Pantau kurs mata uang dunia secara <i>real-time</i> dan kelola portofolio valuta asing (USD, SGD, EUR, JPY, MYR, SAR, GBP, AUD, CNY, dll) secara otomatis tanpa repot konversi manual.</p>
              
              <ImagePlaceholder label="Grafik Tren Kurs Nilai Tukar 30 Hari Terakhir" src="PANDUAN/Valas 1.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-2">
                  <li><b>Grafik Tren Kurs 30 Hari:</b> Tekan salah satu mata uang untuk melihat fluktuasi grafik tren nilai tukar terhadap Rupiah dalam 30 hari terakhir.</li>
                  <li><b>Integrasi Sumber Dana:</b> Hero Card Valas dilengkapi dengan pill rekening dompet sumber dana untuk memudahkan pemantauan modal.</li>
              </ul>

              <ImagePlaceholder label="Catat Mutasi Pemasukan/Pengeluaran Valas Murni" src="PANDUAN/Valas 2.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-2">
                  <li><b>Catat Mutasi Valas:</b> Gunakan tab ini saat menerima atau mengeluarkan valuta asing secara murni (misal: kiriman uang dari luar negeri atau pembayaran jasa freelance dalam EUR/USD) tanpa menukarnya ke Rupiah.</li>
              </ul>

              <ImagePlaceholder label="Tukar Valas (Konfirmasi Jual / Beli Mata Uang)" src="PANDUAN/Valas 3.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Tukar Valas (Beli/Jual):</b> Catat transaksi penukaran di Money Changer atau Bank. Pilih <i>Beli</i> (kas Rupiah berkurang, valas bertambah) atau <i>Jual</i> (valas berkurang, kas Rupiah bertambah) dengan kurs transaksi deal yang Anda tentukan.</li>
              </ul>
          </div>
      )
    },
    {
      id: "debts",
      title: "Hutang & Piutang",
      imageSrc: "/Hutang.png",
      tag: "Kewajiban & Tagihan",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Kelola pinjaman dan tagihan Anda agar reputasi finansial serta hubungan sosial tetap terjaga dengan baik.</p>
              
              <ImagePlaceholder label="Form Catat Piutang & Daftar Tagihan Piutang" src="PANDUAN/Debts 1.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-2">
                  <li><b>Mode PIUTANG (Hak Kita) - Biru:</b> Catat saat Anda meminjamkan dana ke rekan atau klien. Terdapat tombol <b>TAGIH</b> (pelunasan penuh atau cicilan) dan tombol <b>IKHLAS</b> (penghapusan piutang macet yang dibukukan sebagai kerugian di laporan).</li>
              </ul>

              <ImagePlaceholder label="Detail Parameter Pencatatan Piutang" src="PANDUAN/Debts 2.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-2">
                  <li><b>Form Piutang:</b> Masukkan nama pihak terkait, nominal pinjaman, mata uang, tenggat waktu jatuh tempo, serta catatan/keterangan terkait.</li>
              </ul>

              <ImagePlaceholder label="Form Catat Hutang & Daftar Kewajiban Hutang" src="PANDUAN/Debts 3.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-2">
                  <li><b>Mode HUTANG (Pinjaman) - Oranye:</b> Catat kewajiban pinjaman Anda ke Bank, platform pinjaman, atau rekan. BILANO akan mengirimkan alarm pengingat sebelum jatuh tempo.</li>
              </ul>

              <ImagePlaceholder label="Popup Pembayaran Cicilan / Pelunasan Hutang" src="PANDUAN/Debts 4.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Bayar Hutang / Cicilan:</b> Tekan tombol <b>BAYAR</b> pada item hutang untuk mencicil sebagian nominal atau melunasinya secara penuh, yang otomatis memotong kas Anda.</li>
              </ul>
          </div>
      )
    },
    {
      id: "subscriptions",
      title: "Langganan & Tagihan",
      imageSrc: "/Langganan.png",
      tag: "Beban Rutin",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Otomatisasi pengingat tagihan berulang (WiFi, Netflix, Listrik PLN, PDAM, Asuransi, Sewa Kos) agar terhindar dari denda keterlambatan dan pemutusan layanan.</p>
              
              <ImagePlaceholder label="Dasbor Estimasi Beban Tetap Bulanan & Daftar Tagihan Rutin" src="PANDUAN/Langganan 3.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-2">
                  <li><b>Estimasi Beban Tetap Bulanan:</b> Hero Card menampilkan akumulasi seluruh pengeluaran berkala bulanan Anda serta countdown hari tersisa menuju jatuh tempo tiap tagihan.</li>
                  <li><b>Fitur Jeda Layanan:</b> Anda dapat menonaktifkan sementara layanan (Pause) tanpa menghapus datanya jika sedang jeda berlangganan.</li>
              </ul>

              <ImagePlaceholder label="Form Tambah Langganan Baru (Karakteristik Nominal Tetap)" src="PANDUAN/Langganan 1.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-2">
                  <li><b>Tagihan Statis (Nominal Pasti):</b> Untuk langganan berbiaya tetap setiap periode (misal: Spotify, WiFi/Internet, Sewa Kos). Cukup masukkan nominal, siklus (/Bulan atau /Tahun), dan tanggal tagihannya.</li>
              </ul>

              <ImagePlaceholder label="Form Tambah Tagihan Dinamis (Karakteristik Nominal Berubah-ubah)" src="PANDUAN/Langganan 2.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Tagihan Dinamis (Nominal Berubah-ubah):</b> Untuk tagihan yang biayanya fluktuatif setiap bulan (misal: Listrik PLN Pascabayar, Air PDAM, Kartu Kredit). Sistem akan menjadwalkan tanggal jatuh tempo dan mengingatkan Anda untuk memasukkan nominal aktual saat jatuh tempo tiba.</li>
              </ul>
          </div>
      )
    },
    {
      id: "investment",
      title: "Investasi & Portofolio",
      imageSrc: "/Investasi.png",
      tag: "Pertumbuhan Aset",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Kelola portofolio multi-aset Anda (Saham BEI, Crypto, Reksadana, Obligasi/SBN, Emas & Logam, Properti, P2P Lending, Bisnis Riil/UMKM) dalam satu dasbor investasi terpadu.</p>
              
              <ImagePlaceholder label="Pilihan 8 Kategori Portofolio Multi-Aset" src="PANDUAN/Investasi 2.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-2">
                  <li><b>8 Kelas Aset Lengkap:</b> Saham, Reksa Dana, Kripto, Emas & Logam, P2P Lending, Properti, Surat Berharga/SBN, dan Bisnis Riil/UMKM.</li>
              </ul>

              <ImagePlaceholder label="Formulir Pembelian / Top Up Instrumen Investasi" src="PANDUAN/Investasi 1.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-2">
                  <li><b>Beli / Top Up:</b> Catat alokasi modal investasi. Khusus Saham Indonesia (IDR), masukkan harga per lembar dan jumlah lot, sistem otomatis mengalikan dengan 100 lembar (1 Lot).</li>
              </ul>

              <ImagePlaceholder label="Formulir Penjualan / Pencairan Aset & Realized P/L" src="PANDUAN/Investasi 3.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Jual / Withdraw:</b> Saat melakukan <i>take profit</i> atau <i>cut loss</i>, sistem secara otomatis menghitung selisih Keuntungan (Profit) atau Kerugian (Loss) dari harga modal rata-rata (Average Price). Uang hasil penjualan langsung masuk kembali ke Saldo Kas Anda.</li>
              </ul>
          </div>
      )
    },
    {
      id: "amal",
      title: "Amal & Sedekah",
      imageSrc: "/Amal.png",
      tag: "Filantropi & Zakat",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Kelola porsi kebaikan dan zakat Anda secara terstruktur menggunakan metode alokasi otomatis berbasis antrean FIFO (First In, First Out) yang terpisah dari anggaran belanja konsumtif.</p>
              
              <ImagePlaceholder label="Dasbor Tabungan Akhirat & Catat Pengeluaran Amal" src="PANDUAN/Amal 1.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-2">
                  <li><b>Tabungan Akhirat & Pilihan Jenis Kebaikan:</b> Pilih jenis amal yang ingin disalurkan seperti Sedekah Subuh, Infaq Masjid & Sosial, Zakat Mal (2.5%), Donasi Kemanusiaan, atau Wakaf Produktif.</li>
                  <li><b>Tombol Cepat Sisa Anggaran:</b> Tekan tombol cepat nominal untuk langsung menyalurkan sesuai sisa alokasi dana amal tertunda.</li>
              </ul>

              <ImagePlaceholder label="Alokasi Pemasukan Otomatis (FIFO) & Riwayat Kebaikan" src="PANDUAN/Amal 2.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Alokasi Otomatis (FIFO):</b> Setiap ada pemasukan murni yang masuk, sistem otomatis menyisihkan 2.5% (atau persentase kustom Anda) ke daftar antrean amal tertunda.</li>
                  <li><b>Riwayat Penyaluran Amal:</b> Pantau seluruh transaksi kebaikan yang telah Anda tunaikan secara transparan dan terdata rapi.</li>
              </ul>
          </div>
      )
    },
    {
      id: "retained",
      title: "Saldo Tertahan",
      imageSrc: "/Tertahan.png",
      tag: "Dana Mengendap",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Fitur khusus bagi pelaku bisnis online, konten kreator, dan freelancer internasional untuk melacak dana yang masih mengendap di platform sebelum ditarik ke rekening bank lokal.</p>
              
              <ImagePlaceholder label="Dasbor Pemantauan Total Estimasi Dana Tertahan" src="PANDUAN/Retained 1.jpg" />

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Manfaat Saldo Tertahan:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
                      <li><b>Platform Terintegrasi:</b> Pantau dana di Stripe, PayPal, TikTok Shop, Tokopedia Seller, Shopee, Upwork, Fiverr, Google AdSense, dan platform jualan lainnya.</li>
                      <li><b>Multi-Valuta Asing:</b> Simpan saldo dalam mata uang aslinya (USD, SGD, EUR, dll) dengan konversi otomatis ke ekuivalen Rupiah berdasarkan kurs live.</li>
                      <li><b>Pencairan Saldo 1-Klik:</b> Saat dana ditarik (payout), tekan tombol <b>CAIRKAN</b> untuk memindahkan dana langsung ke Saldo Kas Anda.</li>
                  </ul>
              </div>

              <ImagePlaceholder label="Formulir Konfirmasi Pencairan Saldo ke Kas Utama" src="PANDUAN/Retained 2.jpg" />
          </div>
      )
    },
    {
      id: "reports",
      title: "Pusat Laporan PDF",
      imageSrc: "/Laporan.png",
      tag: "Pembukuan Resmi",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Hasilkan dokumen laporan keuangan komprehensif berformat PDF siap cetak dengan standar pembukuan profesional hanya dengan satu sentuhan.</p>
              
              <ImagePlaceholder label="Pusat Cetak & Arsip Laporan Keuangan Historis PDF" src="PANDUAN/Laporan 1.jpg" />

              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-2">
                  <h4 className="font-bold text-amber-900 text-sm">Struktur Dokumen Laporan PDF:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
                      <li><b>Neraca Terpadu (Balance Sheet):</b> Ringkasan Total Kekayaan Bersih (Net Worth), Kas Likuid, Investasi, Valas, dan Liabilitas.</li>
                      <li><b>Buku Kas Harian:</b> Rincian seluruh mutasi uang masuk dan keluar pada periode berjalan.</li>
                      <li><b>Detail Kepemilikan Valas:</b> Rincian valuta asing beserta kurs penutupan live.</li>
                      <li><b>Portofolio Investasi & Hutang Piutang:</b> Rincian instrumen aktif dan status pelunasan pinjaman.</li>
                  </ul>
              </div>

              <ImagePlaceholder label="Dokumen Resmi Laporan Keuangan PDF Komprehensif" src="PANDUAN/Laporan 2.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Format Resmi Siap Cetak:</b> Dokumen PDF dilengkapi dengan header resmi BILANO, tanggal cetak, status enkripsi, serta tata letak tabel yang teratur rapi.</li>
              </ul>
          </div>
      )
    },
    {
      id: "scan",
      title: "Smart Scan AI",
      imageSrc: "/Scanner.png",
      tag: "Otomasi AI",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Mencatat transaksi keuangan menjadi sangat cepat dan tanpa repot mengetik berkat asisten AI cerdas berbasis suara dan pemindai struk belanja.</p>
              
              <ImagePlaceholder label="Mode Pencatatan Suara Pintar (Voice AI Input)" src="PANDUAN/Scan 1.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-2">
                  <li><b>Mode Suara Pintar (Voice AI):</b> Tekan tombol mikrofon dan bicaralah secara natural, contoh: <i>"Beli bensin 35 ribu pakai GoPay"</i> atau <i>"Dipinjamkan ke Andi uang 200 ribu"</i>. AI akan mengurai nominal, jenis transaksi, kategori, dan sumber dompet secara instan.</li>
              </ul>

              <ImagePlaceholder label="Pilihan Pengambilan Foto Struk AI (Galeri / Kamera)" src="PANDUAN/Scan 2.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-2">
                  <li><b>Pilih Galeri atau Kamera:</b> Ambil foto struk fisik langsung menggunakan kamera ponsel Anda atau unggah gambar/screenshot bukti transfer dari memori perangkat.</li>
              </ul>

              <ImagePlaceholder label="Ekstraksi Pos Transaksi & Konfirmasi Hasil Scan Struk" src="PANDUAN/Scan 3.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Ekstraksi Multi-Item Cerdas:</b> OCR AI akan membedah tiap item transaksi, mendeteksi nominal, menyarankan kategori belanja yang sesuai, dan memungkinkan Anda mengedit data sebelum disimpan ke buku kas.</li>
              </ul>
          </div>
      )
    },
    {
      id: "chat-ai",
      title: "ChatAI (BILANO Intelligence)",
      imageSrc: "/AI.png",
      tag: "Konsultan 24/7",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Asisten dan konsultan keuangan pribadi elit yang terhubung langsung secara 360° dengan seluruh data keuangan akun Anda di BILANO.</p>
              
              <ImagePlaceholder label="Hub Analitik Finansial Cerdas & Topik Rekomendasi" src="PANDUAN/AI 1.jpg" />

              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 space-y-2">
                  <h4 className="font-bold text-brand-navy text-sm flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-brand-gold shrink-0" />
                      Kemampuan Analisis BILANO Intelligence:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
                      <li><b>Konteks Finansial Menyeluruh:</b> AI memahami saldo kas aktif, status sinkronisasi portofolio, evaluasi arus kas, analisis kekayaan bersih, dan audit kebocoran pengeluaran secara terpadu.</li>
                      <li><b>Multi-Opsi Strategi:</b> AI memberikan saran taktis yang disesuaikan dengan kondisi finansial spesifik Anda.</li>
                  </ul>
              </div>

              <ImagePlaceholder label="Analisis Kekayaan Bersih (Net Worth) Komprehensif" src="PANDUAN/AI 2.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-2">
                  <li><b>Bedah Kekayaan Bersih:</b> AI membedah total kekayaan bersih Anda hingga ke rincian kas likuid, instrumen investasi, dan valuta asing.</li>
              </ul>

              <ImagePlaceholder label="Konsultasi Interaktif Keputusan Finansial & Pembelian" src="PANDUAN/AI 3.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Evaluasi Kelayakan Belanja (Affordability):</b> Tanyakan apakah rencana pembelian barang tertentu aman bagi cashflow Anda. AI akan menghitung persentase terhadap saldo kas likuid dan dampaknya pada target tabungan.</li>
              </ul>
          </div>
      )
    },
    {
      id: "performance",
      title: "Performa Finansial",
      imageSrc: "/Performance.png",
      tag: "Rapor Keuangan",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Buku rapor kesehatan finansial untuk mengevaluasi efisiensi pengeluaran, rasio tabungan, dan memantau progres target kekayaan Anda.</p>
              
              <ImagePlaceholder label="Rapor Total Net Worth, Runway & Alokasi Komposisi Aset" src="PANDUAN/Performa 1.jpg" />

              <ul className="list-disc pl-4 space-y-2 mb-2">
                  <li><b>Diagnosis Ketahanan Finansial:</b> Indikator live ratios meliputi Financial Runway (ketahanan kas darurat dalam hitungan bulan), Savings Rate (rasio disiplin tabungan), Burn Rate harian, Beban Hutang (DSR), dan proporsi belanja kebutuhan pokok vs gaya hidup konsumtif.</li>
                  <li><b>Alokasi & Komposisi Aset:</b> Donut chart sebaran kelas aset bruto secara visual.</li>
              </ul>

              <ImagePlaceholder label="Realisasi Kas Bulanan, Evaluasi Multi-Aset & Limit Anggaran" src="PANDUAN/Performa 2.jpg" />

              <ul className="list-disc pl-4 space-y-2">
                  <li><b>Realisasi Kas Bulanan:</b> Diagram bar perbandingan uang masuk vs uang keluar beserta net surplus bulanan.</li>
                  <li><b>Evaluasi Portofolio Multi-Aset:</b> Menghitung ROI Realisasi Jual, porsi aset & valas terhadap total kekayaan, serta kesimpulan strategi modal yang aman.</li>
              </ul>
          </div>
      )
    },
    {
      id: "academy",
      title: "BILANO Academy",
      imageSrc: "/ACADEMY.png",
      tag: "E-Book VIP",
      content: (
          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>Perpustakaan literasi finansial eksklusif yang memuat kurikulum keuangan, panduan investasi, dan e-book VIP dari para pakar keuangan terkemuka.</p>
              
              <ImagePlaceholder label="Perpustakaan VIP BILANO Academy & Koleksi E-Book Pilihan" src="PANDUAN/Ebook 1.jpg" />

              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-2">
                  <h4 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-amber-700 shrink-0" />
                      Materi Pembelajaran di Academy:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
                      <li><b>Kurikulum Terstruktur:</b> Modul sains kekayaan, manajemen cashflow keluarga & bisnis, psikologi uang (*money mindset*), dan strategi investasi jangka panjang.</li>
                      <li><b>Reader PDF Interaktif:</b> Baca seluruh e-book langsung di dalam aplikasi BILANO dengan navigasi halaman yang mulus dan nyaman di layar smartphone.</li>
                      <li><b>Pembaruan Berkala:</b> Akses ke judul-judul materi dan laporan analisis pasar baru yang ditambahkan secara berkala bagi pengguna VIP.</li>
                  </ul>
              </div>

              <ImagePlaceholder label="Tampilan Reader E-Book Interaktif BILANO Academy" src="PANDUAN/Ebook 2.jpg" />
          </div>
      )
    }
  ];

  useEffect(() => {
      if (guides[activeTab]) {
          trackEvent("guide_viewed", { 
              moduleTitle: guides[activeTab].id 
          });
      }
  }, [activeTab]);

  return (
    <MobileLayout title="Panduan Aplikasi" showBack={true}>
      <div className="pt-4 pb-24 space-y-6">
          
          {/* BANNER HEADER */}
          <div className="px-2">
              <div className="bg-gradient-to-br from-[#1D3E72] via-[#152e55] to-[#0A162B] rounded-[32px] p-6 text-white shadow-[0_10px_25px_rgba(29,62,114,0.25)] relative overflow-hidden flex items-center gap-4 border border-blue-900/40">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md shrink-0 border border-white/20 shadow-inner">
                      <BookOpen className="w-7 h-7 text-blue-200" />
                  </div>
                  <div className="relative z-10">
                      <span className="text-[9px] font-black tracking-widest text-[#F6B93B] uppercase bg-[#F6B93B]/10 px-2 py-0.5 rounded-md border border-[#F6B93B]/30 inline-block mb-1">
                          DOKUMENTASI RESMI • 15 MODUL
                      </span>
                      <h2 className="text-xl font-black tracking-tight mb-0.5">Buku Panduan BILANO</h2>
                      <p className="text-[11px] text-blue-100/80 leading-relaxed font-medium">
                          Pelajari petunjuk penggunaan dan cara memaksimalkan seluruh fitur aplikasi.
                      </p>
                  </div>
                  <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-[#F6B93B]/15 rounded-full blur-3xl pointer-events-none"></div>
              </div>
          </div>

          {/* HORIZONTAL CATEGORY SELECTOR WITH PNG ICONS FROM HOME */}
          <div className="flex overflow-x-auto hide-scrollbar gap-2.5 px-2 pb-2">
              <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
              {guides.map((g, idx) => {
                  const isActive = activeTab === idx;
                  return (
                      <button 
                          key={g.id}
                          onClick={() => setActiveTab(idx)}
                          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all shrink-0 border shadow-xs ${
                              isActive 
                                  ? 'bg-[#1D3E72] text-white border-[#1D3E72] shadow-[2px_2px_0px_0px_#0A162B]' 
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95'
                          }`}
                      >
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center p-0.5 shrink-0 ${isActive ? 'bg-white/15' : 'bg-slate-100'}`}>
                              <img src={g.imageSrc} alt={g.title} className="w-full h-full object-contain drop-shadow-xs" />
                          </div>
                          <span className="tracking-tight whitespace-nowrap">{g.title}</span>
                      </button>
                  );
              })}
          </div>

          {/* MAIN GUIDE CONTENT CARD */}
          <div className="px-2 animate-in fade-in slide-in-from-right-3 duration-300">
              <Card className="rounded-[32px] p-6 shadow-xl border border-slate-100 bg-white relative overflow-hidden">
                  
                  {/* Category Header Badge */}
                  <div className="flex items-center justify-between gap-3 mb-5 pb-5 border-b border-slate-100">
                      <div className="flex items-center gap-3.5">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200/80 flex items-center justify-center p-2.5 shadow-sm shrink-0">
                              <img 
                                  src={guides[activeTab].imageSrc} 
                                  alt={guides[activeTab].title} 
                                  className="w-full h-full object-contain drop-shadow-sm" 
                              />
                          </div>
                          <div>
                              <span className="text-[10px] font-black text-brand-navy uppercase tracking-widest bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60 inline-block mb-1">
                                  {guides[activeTab].tag}
                              </span>
                              <h3 className="text-xl font-black text-slate-900 leading-tight">
                                  {guides[activeTab].title}
                              </h3>
                          </div>
                      </div>

                      <div className="text-right shrink-0">
                          <span className="text-[11px] font-black text-slate-400">
                              {activeTab + 1} / {guides.length}
                          </span>
                      </div>
                  </div>
                  
                  {/* Body Content */}
                  <div className="guide-body">
                      {guides[activeTab].content}
                  </div>

                  {/* Navigation Bottom Footer */}
                  <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                      <button
                          disabled={activeTab === 0}
                          onClick={() => setActiveTab(prev => Math.max(0, prev - 1))}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 transition-all active:scale-95"
                      >
                          ← Sebelumnya
                      </button>

                      <button
                          disabled={activeTab === guides.length - 1}
                          onClick={() => setActiveTab(prev => Math.min(guides.length - 1, prev + 1))}
                          className="px-5 py-2.5 rounded-xl bg-[#1D3E72] text-white text-xs font-bold shadow-sm hover:bg-[#152e55] disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1.5 active:scale-95"
                      >
                          <span>Selanjutnya</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                  </div>
                  
              </Card>
          </div>

      </div>
    </MobileLayout>
  );
}