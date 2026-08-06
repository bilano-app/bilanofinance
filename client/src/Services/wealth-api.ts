import { RecommendationIdea, MaterialItem } from "@/hooks/use-wealth-machine";

const API_BASE = "/api/wealth";

/**
 * 🛡️ VALIDATOR STRICT ANTI-GENERIK DI SISI CLIENT
 * Memastikan AI tidak memberikan jawaban malas/template pasaran.
 */
function validateAntiGenericStrict(recommendations: RecommendationIdea[]): boolean {
  const forbiddenKeywords = [
    "jualan online", "bisnis online", "content creator", 
    "freelance", "dropshipper", "reseller", "jadi afiliator"
  ];

  if (!recommendations || recommendations.length < 2) {
    console.warn("⚠️ Validasi Gagal: AI mengembalikan opsi kurang dari 2.");
    return false;
  }

  return recommendations.every(rec => {
    if (!rec.title || !rec.pitch || !rec.why_it_fits) return false;
    
    const titleLower = rec.title.toLowerCase();
    const pitchLower = rec.pitch.toLowerCase();
    
    // 1. Cek apakah ada kata terlarang yang berdiri sendiri tanpa spesifikasi
    const holdsForbidden = forbiddenKeywords.some(phrase => 
      titleLower === phrase || titleLower.includes(`${phrase} saja`)
    );

    // 2. Cek kedalaman alasan (Kognitif harus tajam & panjang)
    const isReasoningDeep = rec.why_it_fits.length > 25; 

    return !holdsForbidden && isReasoningDeep;
  });
}

export const wealthApiService = {
  /**
   * FASE 2: Ambil Rekomendasi Ide Bisnis Dinamis dengan Auto-Retry Loop (Max 3x)
   */
  async generateRecommendations(profile: any, snapshot: any): Promise<RecommendationIdea[]> {
    let attempts = 3;
    let lastError: any = null;

    while (attempts > 0) {
      try {
        console.log(`🧠 Memanggilpusat kognitif Bilano AI... (Sisa Percobaan: ${attempts})`);
        const response = await fetch(`${API_BASE}/recommendations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, financialSnapshot: snapshot }),
        });

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const result = await response.json();
        const data = result.data?.recommendations || result.recommendations || [];
        
        // Saring hasil secara ketat sebelum dilempar ke UI
        if (validateAntiGenericStrict(data)) {
          console.log("✅ Analisis AI lolos sensor kelayakan kognitif.");
          return data;
        }

        console.warn("⚠️ Hasil AI terdeteksi terlalu generik/dangkal. Memaksa regenerasi otomatis...");
        attempts--;
      } catch (error) {
        lastError = error;
        attempts--;
      }
    }

    throw new Error(lastError?.message || "AI gagal merumuskan strategi spesifik setelah beberapa percobaan.");
  },

  /**
   * FASE 3: Menyusun Starter-Pack Anggaran Bahan Baku Skala Mikro (S10)
   */
  async fetchDraftMaterials(recommendation: RecommendationIdea): Promise<MaterialItem[]> {
    const response = await fetch(`${API_BASE}/draft-materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendation }),
    });

    if (!response.ok) throw new Error("Gagal menyusun rancangan modul bahan baku dari server.");
    
    const result = await response.json();
    const items = result.data?.draft_items || result.draft_items || [];
    
    return items.map((item: any) => ({
      id: item.id || `mat_${Math.random().toString(36).substring(2, 9)}`,
      name: item.name || "Komponen Alat/Bahan Baku",
      price: Number(item.price) || 0,
      note: item.note || null
    }));
  },

  /**
   * FASE 3: Mengambil Opsi Alternatif Pengumpulan Modal / Mitigasi Kas (S13)
   */
  async fetchCapitalStrategies(totalCost: number, sisaDanaAman: number, profile: any, selectedIdea: RecommendationIdea): Promise<any[]> {
    const response = await fetch(`${API_BASE}/capital-strategy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalCost, sisaDanaAman, profileData: profile, selectedIdea }),
    });

    if (!response.ok) throw new Error("Gagal memuat modul strategi mitigasi modal.");
    const result = await response.json();
    
    const strategies = result.data || result.options || [];
    return strategies.map((s: any, idx: number) => ({
      id: s.id || `strat_${idx}`,
      title: s.title || "Strategi Pendanaan Taktis",
      description: s.description || "Lakukan bootstrap atau penyesuaian skala produksi.",
      estimated_effort: s.estimated_effort || "SEDANG"
    }));
  },

  /**
   * FASE 3: Bounded Chat Penjualan & Promosi Gerilya (S14)
   */
  async sendSellingChatMessage(selectedIdea: RecommendationIdea, profile: any, chatHistory: any[], currentMessage: string): Promise<string> {
    const response = await fetch(`${API_BASE}/selling-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedIdea, profileData: profile, chatHistory, currentMessage }),
    });

    if (!response.ok) throw new Error("Koneksi diskusi dengan mentor AI terputus.");
    const result = await response.json();
    return result.text || result.reply || "Maaf, sistem kognitif sedang memproses data lain.";
  },

  /**
   * FASE 3: Tinjauan Berkala Performa Buku Kas & Log Omset (S15)
   */
  async evaluateRevenuePerformance(selectedIdea: RecommendationIdea, revenueLogs: any[]): Promise<string> {
    const response = await fetch(`${API_BASE}/evaluate-revenue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedIdea, revenueLogs }),
    });

    if (!response.ok) throw new Error("Gagal memuat tinjauan performa operasional bisnis.");
    const result = await response.json();
    return result.evaluation || result.text || "Belum ada analisis performa yang tersedia untuk log kas saat ini.";
  }
};