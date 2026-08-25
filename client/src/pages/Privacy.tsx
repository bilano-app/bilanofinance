import { Link } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { 
    ShieldCheck, Lock, EyeOff, Server, UserCheck, 
    ArrowLeft, Shield, Mail, Sparkles, CheckCircle2 
} from "lucide-react";

export default function Privacy() {
    return (
        <MobileLayout>
            <div className="flex flex-col -mx-5 -mt-5">
                
                {/* ========================================================================= */}
                {/* 1. TOP HEADER BANNER DENGAN TEMA BILANO NAVY & GOLD */}
                {/* ========================================================================= */}
                <div className="px-5 pt-5 pb-8 bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] flex flex-col relative z-10 border-b border-amber-300/60">
                    
                    {/* Top Navigation Bar */}
                    <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(29,62,114,0.06)] flex items-center justify-between relative z-30 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <Link href="/">
                                <button 
                                    type="button"
                                    className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                                    title="Kembali ke Beranda"
                                >
                                    <ArrowLeft className="w-5 h-5 text-slate-800" strokeWidth={2.5} />
                                </button>
                            </Link>

                            <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                    <p className="text-[10px] font-bold text-amber-900 uppercase tracking-widest">
                                        Keamanan & Transparansi
                                    </p>
                                </div>
                                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                                    Kebijakan Privasi
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-brand-navy text-brand-gold px-3 py-1.5 rounded-full border border-brand-gold/30 shadow-xs text-[10px] font-bold">
                                <ShieldCheck className="w-3.5 h-3.5 text-brand-gold fill-current" />
                                <span>SSL 256-BIT</span>
                            </div>
                        </div>
                    </div>

                    {/* 2. FLAGSHIP HERO CARD: KEBIJAKAN PRIVASI (SATU-SATUNYA DENGAN SOLID SHADOW KHAS BILANO) */}
                    <div className="bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] text-white p-6 rounded-[28px] border-l-[6px] border-l-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                        <ShieldCheck className="absolute -right-4 -bottom-4 w-36 h-36 text-brand-gold/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                        <div className="absolute right-0 top-0 w-32 h-32 bg-brand-gold/15 rounded-full blur-xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col">
                            <div className="flex justify-between items-center mb-3">
                                <span className="bg-brand-gold text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                                    <Shield className="w-3 h-3 fill-current" /> PROTEKSI DATA
                                </span>
                                <span className="text-[10px] text-amber-200 font-bold bg-black/40 px-2.5 py-0.5 rounded-full border border-white/20">
                                    Edisi 2026
                                </span>
                            </div>

                            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2 leading-tight">
                                Komitmen Privasi Finansial
                            </h2>
                            <p className="text-xs text-blue-100 font-medium leading-relaxed">
                                <strong>BILANO Finance</strong> menjamin seluruh data keuangan, saldo, transaksi, dan aset Anda diperlakukan dengan standar kerahasiaan tertinggi.
                            </p>

                            <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/15 text-[10px] text-slate-300 font-bold">
                                <span>🔐 Enkripsi End-to-End</span>
                                <span className="text-brand-gold">Tanpa Penjualan Data Iklan</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* 2. BODY CONTENT: 4 POIN KEBIJAKAN PRIVASI BERSIH & MODERN */}
                {/* ========================================================================= */}
                <div className="px-5 pt-5 pb-28 bg-slate-50 flex flex-col gap-3.5">
                    
                    {/* POINT 1: DATA YANG KAMI KUMPULKAN */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm space-y-2.5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-800 border border-sky-200 flex items-center justify-center shrink-0 shadow-xs">
                                <EyeOff className="w-5 h-5" />
                            </div>
                            <h3 className="font-extrabold text-slate-900 text-sm">
                                1. Data yang Kami Kumpulkan
                            </h3>
                        </div>
                        <ul className="text-xs text-slate-600 font-medium leading-relaxed space-y-1.5 pl-2 list-disc list-inside">
                            <li><strong className="text-slate-900">Informasi Akun:</strong> Alamat email Anda untuk autentikasi dan sinkronisasi lintas perangkat.</li>
                            <li><strong className="text-slate-900">Data Finansial:</strong> Catatan transaksi, saldo, target, investasi, dan hutang/piutang yang Anda masukkan.</li>
                            <li><strong className="text-slate-900">Smart Scan & AI:</strong> Gambar struk dan prompt AI hanya diproses saat Anda meminta pemindaian.</li>
                        </ul>
                    </div>

                    {/* POINT 2: PENGGUNAAN DATA */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm space-y-2.5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0 shadow-xs">
                                <Lock className="w-5 h-5" />
                            </div>
                            <h3 className="font-extrabold text-slate-900 text-sm">
                                2. Penggunaan Data Finansial
                            </h3>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            Data Anda 100% digunakan hanya untuk keperluan kalkulasi, pembuatan grafik analitik, dan rekomendasi cerdas di layar Anda sendiri. Kami <strong>TIDAK PERNAH</strong> menjual, menyewakan, atau membagikan data keuangan Anda kepada pihak ketiga mana pun untuk tujuan periklanan.
                        </p>
                    </div>

                    {/* POINT 3: KEAMANAN PENYIMPANAN & TRANSAKSI */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm space-y-2.5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0 shadow-xs">
                                <Server className="w-5 h-5" />
                            </div>
                            <h3 className="font-extrabold text-slate-900 text-sm">
                                3. Keamanan Penyimpanan & Cloud
                            </h3>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            Seluruh transmisi data dilindungi oleh enkripsi SSL/TLS 256-bit standar perbankan. Transaksi pembayaran PRO diproses melalui payment gateway resmi tersertifikasi <strong>PCI-DSS</strong>, dan kami tidak pernah menyimpan data nomor kartu kredit atau PIN rahasia Anda.
                        </p>
                    </div>

                    {/* POINT 4: HAK PENGGUNA (HAPUS DATA) */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm space-y-2.5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 flex items-center justify-center shrink-0 shadow-xs">
                                <UserCheck className="w-5 h-5" />
                            </div>
                            <h3 className="font-extrabold text-slate-900 text-sm">
                                4. Hak Pengguna & Hapus Data
                            </h3>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            Anda memiliki kendali kedaulatan penuh atas data pribadi Anda. Anda berhak meminta penghapusan akun serta seluruh riwayat catatan finansial Anda secara permanen kapan saja melalui kontak tim support kami.
                        </p>
                    </div>

                    {/* FOOTER CONTACT BOX */}
                    <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-4.5 text-center shadow-xs space-y-2 mt-1">
                        <div className="flex items-center justify-center gap-1.5 text-amber-900 font-bold text-xs">
                            <Mail className="w-4 h-4 text-amber-700" />
                            <span>Punya Pertanyaan Soal Keamanan Data?</span>
                        </div>
                        <p className="text-[11px] text-amber-950 font-medium">
                            Tim data protection officer kami siap membantu Anda:
                        </p>
                        <a 
                            href="mailto:support@bilanofinance.com" 
                            className="inline-block bg-brand-navy hover:bg-[#152e55] text-brand-gold font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all"
                        >
                            support@bilanofinance.com
                        </a>
                    </div>

                </div>
            </div>
        </MobileLayout>
    );
}