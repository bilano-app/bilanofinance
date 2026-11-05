import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export const STORE_FAQS: FAQItem[] = [
  {
    id: "worth-it",
    question: "Apakah harga e-book ini benar-benar sepadan (worth it)?",
    answer:
      "Mari berhitung secara logis. Untuk mempelajari materi dasar akuntansi di bangku perkuliahan, biayanya bisa mencapai jutaan rupiah. Kalaupun Anda membeli buku teks akuntansi resmi, harganya bisa tembus Rp500.000 ke atas dengan bahasa akademis yang sering kali kaku. Di e-book ini, aku merangkum sari pati ilmu akuntansi bernilai jutaan tersebut ke dalam bahasa sehari-hari yang jauh lebih mudah dicerna. Investasi puluhan ribu hari ini adalah jalan pintas yang akan menghemat uang ratusan ribu dan waktu berbulan-bulan Anda untuk benar-benar paham akuntansi."
  },
  {
    id: "format-digital",
    question: "Kenapa e-book ini tidak tersedia dalam bentuk buku fisik/cetak?",
    answer:
      "Materi ini sengaja aku rancang 100% dalam format digital agar nilai investasinya tetap sangat masuk akal bagi Anda. Mengingat materinya yang komprehensif, biaya cetak, kertas, dan ongkos kirim akan membuat harganya melonjak hingga 3 kali lipat. Melalui format digital, Anda hanya membayar untuk 'nilai ilmunya', bukan biaya produksinya. Plus, Anda tidak perlu menunggu kurir—akses langsung terkirim ke email detik ini juga dan Anda bisa menggunakan fitur Search di HP atau Laptop untuk menemukan istilah akuntansi dalam hitungan detik."
  }
];

interface StoreFAQProps {
  className?: string;
  title?: string;
  subtitle?: string;
  defaultOpenId?: string | null;
}

export default function StoreFAQ({
  className = "",
  title = "Pertanyaan Yang Sering Diajukan",
  subtitle = "Jawaban jujur & transparan seputar investasi ilmu di e-book ini",
  defaultOpenId = "worth-it"
}: StoreFAQProps) {
  // State untuk menyimpan ID accordion yang sedang terbuka
  const [openId, setOpenId] = useState<string | null>(defaultOpenId);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className={`w-full ${className}`}>
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-xs">
        
        {/* Header Section */}
        <div className="text-center space-y-2 mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/80 text-[#1D3E72] text-[11px] font-black uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>FAQ • Tanya Jawab</span>
          </div>
          <h3 className="text-base sm:text-lg md:text-xl font-black text-[#0F2247] tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto">
              {subtitle}
            </p>
          )}
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {STORE_FAQS.map((faq, index) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "border-[#1D3E72]/40 bg-blue-50/20 shadow-xs"
                    : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => toggleItem(faq.id)}
                  className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer select-none"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        isOpen
                          ? "bg-[#1D3E72] text-white shadow-xs"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">
                      {faq.question}
                    </span>
                  </div>

                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
                      isOpen
                        ? "rotate-180 bg-[#1D3E72] text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/* Collapsible Content */}
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 animate-in fade-in-50 duration-200">
                    <div className="pl-9 pr-2 border-t border-slate-100 pt-3">
                      <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

