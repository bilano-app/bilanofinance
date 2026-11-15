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
 * - "1.000" is read as 1000 (NOT 1,0)
 * - "59,67" is read as 59.67 (NOT 5967)
 * - "1.000,5" is read as 1000.5
 */
export function parseFormattedNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  let trimmed = val.toString().trim();
  if (!trimmed) return 0;

  // Strip currency prefixes, spaces, and non-numeric chars except digits, comma, period, minus
  trimmed = trimmed.replace(/[^0-9.,-]/g, '');
  if (!trimmed || trimmed === '-' || trimmed === '.' || trimmed === ',') return 0;

  // Case 1: Both . and , are present (e.g. 1.250.000,50 or 1,250,000.50)
  if (trimmed.includes(',') && trimmed.includes('.')) {
    if (trimmed.lastIndexOf(',') > trimmed.lastIndexOf('.')) {
      // "1.250.000,50" -> . is thousand, , is decimal
      return parseFloat(trimmed.replace(/\./g, '').replace(/,/g, '.')) || 0;
    } else {
      // "1,250,000.50" -> , is thousand, . is decimal
      return parseFloat(trimmed.replace(/,/g, '')) || 0;
    }
  }

  // Case 2: Only comma , is present (e.g. "0,5" or "12,50" or "59,67" or "5,967" or "1,000,000")
  if (trimmed.includes(',')) {
    const commaCount = (trimmed.match(/,/g) || []).length;
    if (commaCount > 1) {
      // Multiple commas e.g. "1,000,000" (US format)
      return parseFloat(trimmed.replace(/,/g, '')) || 0;
    }
    // Single comma: In Indonesian convention, single comma is ALWAYS decimal separator!
    return parseFloat(trimmed.replace(/,/g, '.')) || 0;
  }

  // Case 3: Only dot . is present (e.g. "500.000", "300.000", "50.000", "1.000", "1.000.000", "0.5", "12.50", "59.67")
  if (trimmed.includes('.')) {
    const dotCount = (trimmed.match(/\./g) || []).length;
    if (dotCount > 1) {
      // Multiple dots e.g. "1.000.000" -> thousand separators
      return parseFloat(trimmed.replace(/\./g, '')) || 0;
    }
    const parts = trimmed.split('.');
    const intPart = parts[0];
    const decPart = parts[1] || '';
    // If integer part is 0 (e.g. "0.5", "0.005") or decimal part is NOT exactly 3 digits (e.g. "59.67", "1.5") -> decimal
    if (intPart === '0' || intPart === '-0' || decPart.length !== 3) {
      return parseFloat(trimmed) || 0;
    }
    // Exactly 3 digits after single dot (e.g. "1.000", "9.500") -> Indonesian thousand separator
    return parseFloat(trimmed.replace(/\./g, '')) || 0;
  }

  return parseFloat(trimmed) || 0;
}

/**
 * Format decimal inputs (such as Stock Lots, Crypto Units, Gold Grams, Prices, Investment Nominal).
 * - Displays dot (.) for thousands: e.g. typing 1000 immediately formats as 1.000 (bukan 1,0)
 * - Typing either comma (,) OR period (.) is read & displayed as comma (,) for decimals
 * - Preserves decimals cleanly: e.g. 59,67 or 1.000,5 or 0,0005
 */
export function formatDecimalInput(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  
  let clean = val.toString().trim();
  clean = clean.replace(/[^0-9.,]/g, '');
  if (!clean) return '';

  // If user types ',' or '.' as first character
  if (clean === ',' || clean === '.') return '0,';
  if (clean.startsWith(',') || clean.startsWith('.')) {
    clean = '0,' + clean.slice(1).replace(/[,.]/g, '');
  }

  // Case 1: Comma already exists
  if (clean.includes(',')) {
    const parts = clean.split(',');
    let intRaw = parts[0].replace(/\./g, '').replace(/\D/g, '');
    if (intRaw.length > 1) intRaw = intRaw.replace(/^0+/, '') || '0';
    if (!intRaw) intRaw = '0';
    const formattedInt = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decRaw = parts.slice(1).join('').replace(/[^0-9]/g, '');
    return clean.endsWith(',') && decRaw === ''
      ? formattedInt + ','
      : formattedInt + ',' + decRaw;
  }

  // Case 2: User just typed '.' at the end -> convert to ',' (Indonesian decimal)
  if (clean.endsWith('.')) {
    let intRaw = clean.slice(0, -1).replace(/\./g, '').replace(/\D/g, '');
    if (intRaw.length > 1) intRaw = intRaw.replace(/^0+/, '') || '0';
    if (!intRaw) intRaw = '0';
    const formattedInt = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return formattedInt + ',';
  }

  // Case 3: Dot in middle
  if (clean.includes('.')) {
    const dotParts = clean.split('.');
    if (dotParts.length > 2) {
      let intRaw = clean.replace(/\./g, '');
      if (intRaw.length > 1) intRaw = intRaw.replace(/^0+/, '') || '0';
      return intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    const [p0, p1] = dotParts;
    if (p0 === '0') {
      return '0,' + p1;
    }
    // Backspacing a thousand separator like '1.00'
    if (p1 === '0' || p1 === '00') {
      let intRaw = clean.replace(/\./g, '');
      if (intRaw.length > 1) intRaw = intRaw.replace(/^0+/, '') || '0';
      return intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    // 3 digits after dot, e.g. '1.000' -> Indonesian thousand (1000)
    if (p1.length === 3) {
      let intRaw = clean.replace(/\./g, '');
      if (intRaw.length > 1) intRaw = intRaw.replace(/^0+/, '') || '0';
      return intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    // Decimal with dot from paste/English (e.g. '59.67') -> convert to decimal comma
    let intRaw = p0.replace(/\D/g, '');
    if (intRaw.length > 1) intRaw = intRaw.replace(/^0+/, '') || '0';
    if (!intRaw) intRaw = '0';
    const formattedInt = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return formattedInt + ',' + p1;
  }

  // Case 4: Plain integer -> format with thousand dots
  let intRaw = clean.replace(/\D/g, '');
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