// client/src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  // Menggunakan format Rupiah Indonesia
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0, // Tidak butuh desimal untuk Rupiah (biasanya)
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRp(val: number) {
  return "Rp " + Math.round(val || 0).toLocaleString("id-ID");
}

/**
 * Format numbers for display in Indonesian format without losing fraction digits.
 * e.g. 59.67 -> "59,67", 1000 -> "1.000", 1000.5 -> "1.000,5", 0.00005 -> "0,00005"
 */
export function formatDisplayNumber(val: number, maxDecimals: number = 8): string {
  if (isNaN(val) || val === null || val === undefined) return "0";
  return val.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Parses numbers with commas or dots correctly.
 * Supports Indonesian format (1.000,50), US format (1,000.50), decimals with comma (0,5 / 12,5 / 59,67), decimals with dot (0.5 / 12.5 / 59.67), etc.
 * Guarantees that in Indonesian context:
 * - "41000" / "41.000" is read as 41000
 * - "41,000" is read as 41 (koma desimal)
 * - "1.000" is read as 1000
 * - "59,67" is read as 59.67
 * - "1.000,5" is read as 1000.5
 * - "0,5" / "0.5" is read as 0.5
 */
export function parseFormattedNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  let trimmed = val.toString().trim();
  if (!trimmed) return 0;

  // Strip currency prefixes, spaces, and non-numeric chars except digits, comma, period, minus
  trimmed = trimmed.replace(/[^0-9.,-]/g, '');
  if (!trimmed || trimmed === '-' || trimmed === '.' || trimmed === ',') return 0;

  // Case 1: Comma is present -> Comma is strictly the decimal separator (Indonesian standard)
  // E.g. "41,000" -> 41; "59,67" -> 59.67; "1.000,50" -> 1000.5; "0,5" -> 0.5
  if (trimmed.includes(',')) {
    const parts = cleanCommaParts(trimmed);
    return parseFloat((parts.intPart || '0') + '.' + parts.decPart) || 0;
  }

  // Case 2: Starts with 0. or -0. (e.g. "0.5", "0.005") -> Decimal
  if (trimmed.startsWith('0.') || trimmed.startsWith('-0.')) {
    return parseFloat(trimmed) || 0;
  }

  // Case 3: Dot is present without comma
  // If exactly 3 digits after single dot (e.g. "41.000", "1.000") or multiple dots ("1.000.000") -> Thousand separators!
  // If 1 or 2 digits after dot and not preceded by thousands (e.g. "59.67") -> Decimal from English paste
  if (trimmed.includes('.')) {
    const dotParts = trimmed.split('.');
    if (dotParts.length === 2 && dotParts[1].length !== 3) {
      return parseFloat(trimmed) || 0;
    }
    return parseFloat(trimmed.replace(/\./g, '')) || 0;
  }

  return parseFloat(trimmed) || 0;
}

function cleanCommaParts(val: string): { intPart: string; decPart: string } {
  const parts = val.split(',');
  const intPart = parts[0].replace(/\./g, '');
  const decPart = parts.slice(1).join('').replace(/[^0-9]/g, '');
  return { intPart, decPart };
}

/**
 * Format decimal & currency inputs (Stock Lots, Crypto Units, Gold Grams, Prices, Nominal).
 * Aturan standar perbankan / finansial Indonesia:
 * - Mengetik angka bulat (misal 41000): otomatis tertulis "41.000" (titik ribuan), terbaca 41000.
 * - Saat mengetik digit baru (misal dari 4.100 ditambah 0 jadi 41.000) atau menghapus digit,
 *   titik ribuan menyesuaikan otomatis dan TIDAK AKAN PERNAH berubah jadi koma desimal.
 * - HANYA jika pengguna menekan koma (misal 41,000 atau 59,67 atau 0,5): barulah angka setelah koma
 *   menjadi desimal (41,000 terbaca 41; 59,67 terbaca 59.67; 0,5 terbaca 0.5; 1.000,5 terbaca 1000.5).
 */
export function formatDecimalInput(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  
  let clean = val.toString().trim();
  clean = clean.replace(/[^0-9.,]/g, '');
  if (!clean) return '';

  // Jika input diawali koma atau titik (misal "," atau ".") -> otomatis "0,"
  if (clean === ',' || clean === '.') return '0,';
  if (clean.startsWith(',') || clean.startsWith('.')) {
    return '0,' + clean.slice(1).replace(/[,.]/g, '');
  }
  // Jika diawali "0." (misal 0.5 atau 0.005) -> ubah ke format desimal Indonesia "0,"
  if (clean.startsWith('0.') && !clean.includes(',')) {
    return '0,' + clean.slice(2).replace(/[,.]/g, '');
  }

  // Kasus 1: Terdapat KOMA (,) -> Pengguna secara eksplisit mengetik koma untuk desimal
  if (clean.includes(',')) {
    const parts = clean.split(',');
    // Bagian bulat di depan koma
    let intRaw = parts[0].replace(/\./g, '').replace(/\D/g, '');
    if (intRaw.length > 1) intRaw = intRaw.replace(/^0+/, '') || '0';
    if (!intRaw) intRaw = '0';
    const formattedInt = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // Bagian desimal di belakang koma (ambil semua digit setelah koma pertama)
    const decRaw = parts.slice(1).join('').replace(/[^0-9]/g, '');

    // Jika pengguna baru saja menekan koma di ujung (misal "41,")
    if (clean.endsWith(',') && decRaw === '') {
      return formattedInt + ',';
    }
    return formattedInt + ',' + decRaw;
  }

  // Kasus 2: Angka biasa (tanpa koma). Semua titik adalah pemisah ribuan.
  // Hilangkan seluruh titik pemisah lama lalu format ulang dengan titik ribuan secara presisi.
  let intRaw = clean.replace(/\./g, '').replace(/\D/g, '');
  if (intRaw.length > 1) intRaw = intRaw.replace(/^0+/, '') || '0';
  if (!intRaw) return '';
  return intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Format currency / nominal inputs with thousands separators while preserving decimals.
 * e.g., typing "12,50" keeps "12,50", typing "1000000" formats as "1.000.000", typing "1000000,50" formats as "1.000.000,50".
 */
export function formatCurrencyInput(val: string | number | null | undefined): string {
  return formatDecimalInput(val);
}

/**
 * 🚀 Reset scroll aplikasi ke paling atas (0, 0).
 * Mengatasi arsitektur App Shell di mana scroll bar berada di elemen '#root'
 * (karena html & body memiliki overflow: hidden).
 */
export function resetAppScrollToTop(smooth: boolean = false) {
  if (typeof window === "undefined") return;

  const behavior: ScrollBehavior = smooth ? "smooth" : ("instant" as ScrollBehavior);

  const performReset = () => {
    // 1. Reset elemen #root (kontainer scroll utama aplikasi)
    const rootEl = document.getElementById("root");
    if (rootEl) {
      rootEl.scrollTop = 0;
      rootEl.scrollLeft = 0;
      try {
        rootEl.scrollTo({ top: 0, left: 0, behavior });
      } catch (e) {
        rootEl.scrollTop = 0;
      }
    }

    // 2. Reset window dan fallback documentElement / body
    try {
      window.scrollTo({ top: 0, left: 0, behavior });
    } catch (e) {}

    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
      document.documentElement.scrollLeft = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
      document.body.scrollLeft = 0;
    }
  };

  performReset();
  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(performReset);
  }
  setTimeout(performReset, 10);
  setTimeout(performReset, 50);
  setTimeout(performReset, 150);
}
