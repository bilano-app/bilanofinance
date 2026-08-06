import { RecommendationIdea, MaterialItem, FinancialSnapshot } from "@/hooks/use-wealth-machine";

// Target endpoint internal router Bilano Backend
const API_BASE = "/api/wealth";

/**
 * Validasi dasar kode untuk mendeteksi apakah AI mengembalikan saran generik terlarang
 */
function isAntiGenericValid(recommendations: RecommendationIdea[]): boolean {
  const forbiddenPhrases = [
    "jualan online", 
    "bisnis online", 
    "content creator", 
    "freelance", 
    "dropshipper", 
    "reseller"
  ];

  if (!recommendations || recommendations.length < 2 || recommendations.length > 4) {
    return false;
  }

  return recommendations.every(rec => {
    const titleLower = rec.title.toLowerCase();
    // Tolak jika judul mengandung frasa generik mentah tanpa spesifikasi
    const hasForbidden = forbiddenPhrases.some(phrase => titleLower === phrase || titleLower.includes(`${phrase} saja`));
    // Harus ada korelasi logis di dalam alasan kesesuaian
    const hasReasoning = rec.why_it_fits && rec.why_it_fits.length > 10;
    
    return !hasForbidden && hasReasoning;
  });
}

export const wealthApiService = {
  /**
   * FASE 2: Mengirimkan data profil pengguna untuk digenerate menjadi 2-4 ide bisnis spesifik
   */
  async generateRecommendations(
    profile: any, 
    snapshot: FinancialSnapshot | null
  ): Promise<RecommendationIdea[]> {
    let retries = 2; // Batas percobaan regenerasi otomatis jika output terdeteksi generik
    
    while (retries >= 0) {
      try {
        const response = await fetch(`${API_BASE}/recommendations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, financialSnapshot: snapshot }),
        });

        if (!response.ok) throw new Error("Gagal terhubung dengan pusat inteligensi.");

        const result = await response.json();
        const data = result.data?.recommendations || [];

        // Periksa kepatuhan anti-generik sebelum dilempar ke UI
        if (isAntiGenericValid(data)) {
          return data;
        }

        if (retries === 0) {
          // Fallback jika AI bebal setelah 2x retry, tetap keluarkan data dengan pembersihan minimal
          return data;
        }
      } catch (error) {
        if (retries === 0) throw error;
      }
      retries--;
    }
    return [];
  },

  /**
   * FASE 3 (S10): Meminta AI menyusun draf kebutuhan bahan/alat starter pack berskala kecil
   */
  async fetchDraftMaterials(recommendation: RecommendationIdea): Promise<MaterialItem[]> {
    try {
      const response = await fetch(`${API_BASE}/draft-materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendation }),
      });

      if (!response.ok) throw new Error("Gagal menyusun modul bahan baku.");

      const result = await response.json();
      const draftItems = result.data?.draft_items || [];

      // Mapping ke tipe data MaterialItem internal agar siap dikonsumsi kalkulator kode
      return draftItems.map((item: any) => ({
        id: item.id || Math.random().toString(36).substring(2, 9),
        name: item.name || "Bahan Baku Tambahan",
        price: Number(item.price) || 0,
        note: item.note || null
      }));
    } catch (error) {
      console.error("Error drafting materials:", error);
      return [];
    }
  },

  /**
   * FASE 3 (S13): Mengambil opsi strategi mitigasi modal dari AI ketika kas tidak mencukupi
   */
  async fetchCapitalStrategies(
    totalCost: number, 
    sisaDanaAman: number, 
    profile: any, 
    selectedIdea: RecommendationIdea
  ): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE}/capital-strategy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalCost, sisaDanaAman, profile, selectedIdea }),
      });

      if (!response.ok) throw new Error("Gagal memuat strategi mitigasi modal.");

      const result = await response.json();
      return result.data?.options || [];
    } catch (error) {
      console.error("Error fetching capital strategies:", error);
      throw error;
    }
  },

  /**
   * FASE 3 (S14): Sistem Chat interaktif bertahap untuk merancang kanal penjualan (Bounded Chat)
   */
  async sendSellingChatMessage(
    selectedIdea: RecommendationIdea,
    profile: any,
    chatHistory: { sender: 'user' | 'ai'; text: string }[],
    userMessage: string
  ): Promise<string> {
    try {
      const response = await fetch(`${API_BASE}/selling-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedIdea, profile, chatHistory, userMessage }),
      });

      if (!response.ok) throw new Error("Mentor AI gagal memproses pesan.");

      const result = await response.json();
      return result.reply || "Maaf, koneksi inteligensi terputus. Bisa diulang?";
    } catch (error) {
      console.error("Error in selling chat service:", error);
      throw error;
    }
  },

  /**
   * FASE 3 (S15): Meminta review evaluasi bisnis dinamis berkala dari log omset aktual
   */
  async fetchPerformanceReview(selectedIdea: RecommendationIdea, revenueLogs: any[]): Promise<string> {
    try {
      const response = await fetch(`${API_BASE}/evaluate-revenue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedIdea, revenueLog: revenueLogs }),
      });

      if (!response.ok) throw new Error("Evaluasi performa gagal dimuat.");

      const result = await response.json();
      return result.evaluation || "Belum ada analisis performa yang tersedia untuk log ini.";
    } catch (error) {
      console.error("Error fetching performance review:", error);
      return "Sistem evaluasi sedang sibuk.";
    }
  }
};