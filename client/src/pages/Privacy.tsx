import { MobileLayout } from "@/components/Layout";
import { ShieldCheck, Lock, EyeOff, Server, UserCheck } from "lucide-react";

export default function Privacy() {
    return (
        <MobileLayout title="Kebijakan Privasi" showBack>
            <div className="pt-4 pb-24 px-4 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                
                {/* Header Elegan */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[32px] text-white text-center shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
                            <ShieldCheck className="w-8 h-8 text-white"/>
                        </div>
                        <h2 className="text-2xl font-extrabold mb-1">Kebijakan Privasi</h2>
                        <p className="text-indigo-100 text-xs">Pembaruan Terakhir: 20 Maret 2026</p>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                </div>

                {/* Konten Privasi */}
                <div className="bg-white p-6 rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 space-y-8">
                    
                    <div className="text-sm text-slate-500 leading-relaxed text-center">
                        BILANO Finance ("kami", "milik kami") sangat menghargai privasi Anda. Halaman ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data Anda saat menggunakan aplikasi kami.
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-blue-50 p-2 rounded-full"><EyeOff className="w-5 h-5 text-blue-600"/></div>
                            <h3 className="font-extrabold text-slate-800">1. Data yang Kami Kumpulkan</h3>
                        </div>
                        <ul className="list-disc pl-12 text-sm text-slate-600 space-y-2">
                            <li><strong>Informasi Akun:</strong> Alamat email Anda saat melakukan pendaftaran untuk keperluan autentikasi dan sinkronisasi data lintas perangkat.</li>
                            <li><strong>Data Finansial:</strong> Catatan transaksi, saldo, target, investasi, dan hutang/piutang yang Anda inputkan secara sukarela ke dalam aplikasi.</li>
                            <li><strong>Input AI & Gambar:</strong> Teks pertanyaan ke BILANO Intelligence dan gambar struk yang Anda unggah untuk keperluan pemindaian (Smart Scan).</li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-emerald-50 p-2 rounded-full"><Lock className="w-5 h-5 text-emerald-600"/></div>
                            <h3 className="font-extrabold text-slate-800">2. Penggunaan Data</h3>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed pl-12">
                            Data finansial Anda mutlak digunakan hanya untuk keperluan kalkulasi, pembuatan grafik, dan analisis cerdas AI di layar Anda sendiri. Kami <strong>tidak pernah</strong> menjual, menyewakan, atau mendistribusikan data keuangan pribadi Anda kepada pihak ketiga mana pun untuk tujuan iklan.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-orange-50 p-2 rounded-full"><Server className="w-5 h-5 text-orange-600"/></div>
                            <h3 className="font-extrabold text-slate-800">3. Keamanan Penyimpanan</h3>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed pl-12">
                            Data Anda dikirim menggunakan enkripsi SSL standar industri dan disimpan di infrastruktur <i>cloud</i> tersertifikasi (Vercel). Transaksi pembayaran diproses secara aman melalui <i>payment gateway</i> resmi yang memiliki standar keamanan PCI-DSS, dan kami tidak menyimpan nomor kartu kredit/PIN Anda.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-rose-50 p-2 rounded-full"><UserCheck className="w-5 h-5 text-rose-600"/></div>
                            <h3 className="font-extrabold text-slate-800">4. Hak Pengguna (Hapus Data)</h3>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed pl-12">
                            Anda memiliki kendali penuh atas data Anda. Anda dapat meminta penghapusan akun dan seluruh riwayat data finansial Anda kapan saja dengan menghubungi kami atau menggunakan fitur Hapus Akun di dalam aplikasi.
                        </p>
                    </div>

                </div>

                <div className="text-center mt-8">
                    <p className="text-xs text-slate-400">Punya pertanyaan soal keamanan data?</p>
                    <a href="mailto:support@bilanofinance.com" className="text-sm font-bold text-indigo-600 hover:underline">Hubungi support@bilanofinance.com</a>
                </div>

            </div>
        </MobileLayout>
    );
}