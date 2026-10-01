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
 * Parses numbers with commas or dots correctly.
 * Supports Indonesian format (1.000,50), US format (1,000.50), decimals with comma (0,5 / 12,5), decimals with dot (0.5 / 12.5), etc.
 */
export function parseFormattedNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  const trimmed = val.toString().trim();
  if (!trimmed) return 0;

  // Case 1: Both . and , are present (e.g. 1.250,50 or 1,250.50)
  if (trimmed.includes(',') && trimmed.includes('.')) {
    if (trimmed.lastIndexOf(',') > trimmed.lastIndexOf('.')) {
      // "1.250,50" -> . is thousand, , is decimal
      return parseFloat(trimmed.replace(/\./g, '').replace(/,/g, '.')) || 0;
    } else {
      // "1,250.50" -> , is thousand, . is decimal
      return parseFloat(trimmed.replace(/,/g, '')) || 0;
    }
  }

  // Case 2: Only comma , is present (e.g. "0,5" or "12,50" or "1,000,000")
  if (trimmed.includes(',')) {
    const commaCount = (trimmed.match(/,/g) || []).length;
    if (commaCount > 1) {
      // Multiple commas -> thousands separator
      return parseFloat(trimmed.replace(/,/g, '')) || 0;
    }
    // Single comma -> standard decimal separator
    return parseFloat(trimmed.replace(/,/g, '.')) || 0;
  }

  // Case 3: Only dot . is present (e.g. "0.5", "12.50", "1.000", "1.000.000")
  if (trimmed.includes('.')) {
    const dotCount = (trimmed.match(/\./g) || []).length;
    if (dotCount > 1) {
      // Multiple dots -> thousands separator
      return parseFloat(trimmed.replace(/\./g, '')) || 0;
    }
    // Single dot:
    // If it looks like Indonesian thousands separator (e.g. 1.000 or 50.000 where after dot is exactly 3 digits and integer part is > 0 and 1-3 digits)
    const dotParts = trimmed.split('.');
    if (dotParts[0] !== '0' && dotParts[1] && dotParts[1].length === 3 && dotParts[0].length >= 1 && dotParts[0].length <= 3) {
      return parseFloat(trimmed.replace(/\./g, '')) || 0;
    }
    // Otherwise decimal dot (e.g. "0.5", "10.5", "182.50", "0.005")
    return parseFloat(trimmed) || 0;
  }

  return parseFloat(trimmed) || 0;
}

/**
 * Format decimal inputs (such as Stock Lots, Crypto Units, Gold Grams, Prices).
 * Allows typing numbers with comma or period as decimal separator without stripping it.
 */
export function formatDecimalInput(val: string): string {
  if (!val) return '';
  
  // Allow only digits, comma, and period
  let clean = val.replace(/[^0-9.,]/g, '');
  
  // Find first separator (, or .)
  const firstSepIndex = clean.search(/[,.]/);
  if (firstSepIndex !== -1) {
    const sep = clean[firstSepIndex];
    let intPart = clean.slice(0, firstSepIndex).replace(/[,.]/g, '');
    const decPart = clean.slice(firstSepIndex + 1).replace(/[,.]/g, '');
    
    // Clean leading zeros from integer part, but preserve "0"
    if (intPart.length > 1) {
      intPart = intPart.replace(/^0+/, '') || '0';
    }
    return `${intPart}${sep}${decPart}`;
  }
  
  // Integer only
  if (clean.length > 1) {
    clean = clean.replace(/^0+/, '');
    if (!clean) clean = '0';
  }
  return clean;
}

/**
 * Format currency / nominal inputs with thousands separators while preserving decimals.
 * e.g., typing "12,50" keeps "12,50", typing "1000000" formats as "1.000.000", typing "1000000,50" formats as "1.000.000,50".
 */
export function formatCurrencyInput(val: string): string {
  if (!val) return '';
  
  // Allow only digits, comma, and period
  let clean = val.replace(/[^0-9.,]/g, '');
  
  // If comma is present (or typed):
  if (clean.includes(',')) {
    const parts = clean.split(',');
    let intPart = parts[0].replace(/\./g, '').replace(/\D/g, '');
    if (intPart.length > 1) intPart = intPart.replace(/^0+/, '') || '0';
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decPart = parts.slice(1).join('').replace(/[^0-9]/g, '');
    return `${formattedInt},${decPart}`;
  }
  
  // If user typed dot at the end, convert to comma for intuitive Indonesian typing
  if (clean.endsWith('.')) {
    const intPart = clean.slice(0, -1).replace(/\./g, '').replace(/\D/g, '');
    const formattedInt = (intPart.length > 1 ? intPart.replace(/^0+/, '') || '0' : intPart).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedInt},`;
  }
  
  // If single dot in middle with decimal intention (e.g. "0.5" or "12.50" not ending in 3 digits or starting with 0):
  const dotParts = clean.split('.');
  if (dotParts.length === 2 && (dotParts[0] === '0' || (dotParts[1].length !== 3 && dotParts[1].length <= 2))) {
    let intPart = dotParts[0].replace(/\D/g, '');
    if (intPart.length > 1) intPart = intPart.replace(/^0+/, '') || '0';
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decPart = dotParts[1].replace(/\D/g, '');
    return `${formattedInt},${decPart}`;
  }
  
  // Standard integer with thousand dots
  let intOnly = clean.replace(/\./g, '').replace(/\D/g, '');
  if (intOnly.length > 1) {
    intOnly = intOnly.replace(/^0+/, '') || '0';
  }
  return intOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}