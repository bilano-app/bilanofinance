export interface WalletSourceItem {
  id: string;
  name: string;
  category: 'Bank' | 'E-Wallet' | 'Sekuritas & Platform Investasi';
  logo: string;
}

export interface WalletCategoryGroup {
  category: 'Bank' | 'E-Wallet' | 'Sekuritas & Platform Investasi';
  items: WalletSourceItem[];
}

export const WALLET_CATEGORIES: WalletCategoryGroup[] = [
  {
    category: 'Bank',
    items: [
      { id: 'bca', name: 'BCA', category: 'Bank', logo: '/BCA.png' },
      { id: 'mandiri', name: 'Bank Mandiri', category: 'Bank', logo: '/Mandiri.png' },
      { id: 'bri', name: 'BRI', category: 'Bank', logo: '/BRI.png' },
      { id: 'bni', name: 'BNI', category: 'Bank', logo: '/BNI.png' },
      { id: 'cimb', name: 'CIMB Niaga', category: 'Bank', logo: '/CIMB.png' },
      { id: 'bsi', name: 'Bank Syariah Indonesia (BSI)', category: 'Bank', logo: '/BSI.png' },
      { id: 'jago', name: 'Bank Jago', category: 'Bank', logo: '/Bank Jago.png' },
      { id: 'seabank', name: 'Seabank', category: 'Bank', logo: '/SeaBank.png' },
      { id: 'blu', name: 'Blu by BCA Digital', category: 'Bank', logo: '/Blu by BCA Digital.png' },
      { id: 'jenius', name: 'Jenius', category: 'Bank', logo: '/Jenius.png' },
      { id: 'superbank', name: 'Superbank', category: 'Bank', logo: '/Superbank.png' },
    ]
  },
  {
    category: 'E-Wallet',
    items: [
      { id: 'gopay', name: 'GoPay', category: 'E-Wallet', logo: '/Gopay.png' },
      { id: 'ovo', name: 'OVO', category: 'E-Wallet', logo: '/OVO.png' },
      { id: 'dana', name: 'DANA', category: 'E-Wallet', logo: '/DANA.png' },
      { id: 'shopeepay', name: 'ShopeePay', category: 'E-Wallet', logo: '/ShopeePay.png' },
      { id: 'linkaja', name: 'LinkAja', category: 'E-Wallet', logo: '/LinkAja.png' },
      { id: 'astrapay', name: 'AstraPay', category: 'E-Wallet', logo: '/AstraPay.png' },
      { id: 'isaku', name: 'i.saku', category: 'E-Wallet', logo: '/i.saku.png' },
    ]
  },
  {
    category: 'Sekuritas & Platform Investasi',
    items: [
      { id: 'stockbit', name: 'Stockbit', category: 'Sekuritas & Platform Investasi', logo: '/Stockbit.png' },
      { id: 'ajaib', name: 'Ajaib', category: 'Sekuritas & Platform Investasi', logo: '/Ajaib.png' },
      { id: 'ipot', name: 'Indo Premier (IPOT)', category: 'Sekuritas & Platform Investasi', logo: '/Indo Premier.png' },
      { id: 'mirae', name: 'Mirae Asset', category: 'Sekuritas & Platform Investasi', logo: '/Mirae Asset.png' },
      { id: 'bibit', name: 'Bibit', category: 'Sekuritas & Platform Investasi', logo: '/Bibit.png' },
      { id: 'bareksa', name: 'Bareksa', category: 'Sekuritas & Platform Investasi', logo: '/Bareksa.png' },
      { id: 'pluang', name: 'Pluang', category: 'Sekuritas & Platform Investasi', logo: '/Pluang.png' },
    ]
  }
];

export const ALL_WALLET_SOURCES: WalletSourceItem[] = WALLET_CATEGORIES.flatMap(c => c.items);

export const ALL_WALLET_NAMES: string[] = ALL_WALLET_SOURCES.map(s => s.name);

export function getWalletLogo(name: string | undefined | null): string | null {
  if (!name) return null;
  const clean = name.trim().toLowerCase();
  
  // Specific checks with highest precedence
  if (clean.includes('bca digital') || clean.includes('blu')) return '/Blu by BCA Digital.png';
  if (clean.includes('bca') || clean.includes('bank central asia')) return '/BCA.png';
  if (clean.includes('mandiri') || clean.includes('bank mandiri') || clean.includes('livin')) return '/Mandiri.png';
  if (clean.includes('bri') || clean.includes('rakyat indonesia') || clean.includes('brimo')) return '/BRI.png';
  if (clean.includes('bni') || clean.includes('negara indonesia')) return '/BNI.png';
  if (clean.includes('cimb') || clean.includes('niaga') || clean.includes('octo')) return '/CIMB.png';
  if (clean.includes('bsi') || clean.includes('syariah indonesia') || clean.includes('byond')) return '/BSI.png';
  if (clean.includes('jago') || clean.includes('bank jago')) return '/Bank Jago.png';
  if (clean.includes('seabank') || clean.includes('sea bank')) return '/SeaBank.png';
  if (clean.includes('jenius') || clean.includes('btpn')) return '/Jenius.png';
  if (clean.includes('superbank') || clean.includes('super bank')) return '/Superbank.png';
  
  // E-Wallets
  if (clean.includes('gopay') || clean.includes('go-pay') || clean.includes('gojek')) return '/Gopay.png';
  if (clean.includes('ovo')) return '/OVO.png';
  if (clean.includes('dana')) return '/DANA.png';
  if (clean.includes('shopee') || clean.includes('spay')) return '/ShopeePay.png';
  if (clean.includes('linkaja') || clean.includes('link aja')) return '/LinkAja.png';
  if (clean.includes('astrapay') || clean.includes('astra pay')) return '/AstraPay.png';
  if (clean.includes('i.saku') || clean.includes('isaku') || clean.includes('indomaret')) return '/i.saku.png';
  
  // Sekuritas & Investasi
  if (clean.includes('stockbit')) return '/Stockbit.png';
  if (clean.includes('ajaib')) return '/Ajaib.png';
  if (clean.includes('ipot') || clean.includes('indo premier') || clean.includes('indopremier')) return '/Indo Premier.png';
  if (clean.includes('mirae')) return '/Mirae Asset.png';
  if (clean.includes('bibit')) return '/Bibit.png';
  if (clean.includes('bareksa')) return '/Bareksa.png';
  if (clean.includes('pluang')) return '/Pluang.png';
  
  // Cash / Tunai
  if (clean.includes('cash') || clean.includes('tunai') || clean.includes('kertas') || clean.includes('dompet')) return '/ATM.png';
  
  // Exact match from all sources
  const found = ALL_WALLET_SOURCES.find(s => s.name.toLowerCase() === clean);
  return found ? found.logo : null;
}
