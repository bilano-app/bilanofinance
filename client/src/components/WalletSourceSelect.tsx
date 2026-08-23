import React, { useState } from 'react';
import { 
  WALLET_CATEGORIES, 
  ALL_WALLET_SOURCES, 
  getWalletLogo, 
  WalletSourceItem 
} from '@/lib/wallet-sources';
import { ChevronDown, Search, X, Check, Wallet, Edit3, Building2, Smartphone, TrendingUp } from 'lucide-react';
import { Input } from '@/components/UIComponents';

interface WalletSourceSelectProps {
  value: string;
  onChange: (value: string, isCustom?: boolean) => void;
  isCustom?: boolean;
  className?: string;
  placeholder?: string;
  allowCustom?: boolean;
  allowCash?: boolean;
  disabled?: boolean;
}

export default function WalletSourceSelect({
  value,
  onChange,
  isCustom = false,
  className = "",
  placeholder = "Pilih Sumber Uang...",
  allowCustom = true,
  allowCash = true,
  disabled = false
}: WalletSourceSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<'All' | 'Bank' | 'E-Wallet' | 'Sekuritas & Platform Investasi'>('All');

  const selectedLogo = getWalletLogo(value);

  const filteredCategories = WALLET_CATEGORIES.map(group => {
    if (activeCategory !== 'All' && group.category !== activeCategory) {
      return null;
    }
    const matchedItems = group.items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (matchedItems.length === 0) return null;
    return {
      ...group,
      items: matchedItems
    };
  }).filter(Boolean) as typeof WALLET_CATEGORIES;

  const handleSelect = (item: WalletSourceItem) => {
    onChange(item.name, false);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleSelectCash = () => {
    onChange("Cash (Uang Kertas)", false);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleSelectCustom = () => {
    onChange("", true);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="relative w-full">
      {/* Trigger Button or Custom Input */}
      {isCustom ? (
        <div className="relative flex items-center">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value, true)}
            placeholder="Ketik nama sumber uang..."
            className={`h-14 pr-24 bg-slate-50 border-slate-200 rounded-2xl font-bold text-sm text-slate-800 ${className}`}
            autoFocus
            disabled={disabled}
          />
          <button
            type="button"
            onClick={() => onChange(WALLET_CATEGORIES[0].items[0].name, false)}
            className="absolute right-3 px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            Pilih Daftar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          className={`w-full h-14 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 font-bold rounded-2xl px-4 flex items-center justify-between text-left transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-indigo-500 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {selectedLogo ? (
              <div className="w-8 h-8 rounded-xl bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
                <img 
                  src={selectedLogo} 
                  alt={value} 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : value ? (
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-xs">
                <Wallet className="w-4 h-4" />
              </div>
            ) : null}
            <span className={`text-sm truncate ${value ? 'text-slate-800 font-bold' : 'text-slate-400 font-medium'}`}>
              {value || placeholder}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
        </button>
      )}

      {/* Modal / Popup Selector */}
      {isOpen && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-[32px] w-full max-w-md shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-black text-slate-900">Pilih Sumber Uang</h3>
                <p className="text-xs text-slate-500 font-medium">Pilih bank, e-wallet, atau sekuritas Anda</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari BCA, GoPay, Bibit..."
                  className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  { id: 'All', label: 'Semua', icon: null },
                  { id: 'Bank', label: 'Bank', icon: Building2 },
                  { id: 'E-Wallet', label: 'E-Wallet', icon: Smartphone },
                  { id: 'Sekuritas & Platform Investasi', label: 'Investasi', icon: TrendingUp }
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id as any)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                        isActive 
                          ? 'bg-brand-navy text-brand-gold shadow-xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List Content */}
            <div className="p-4 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
              {/* Cash Option */}
              {allowCash && (activeCategory === 'All' || searchQuery === '') && (
                <div>
                  <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-2 mb-2">
                    Tunai
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectCash}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left bg-white ${
                      value === "Cash (Uang Kertas)" && !isCustom
                        ? 'border-brand-navy bg-blue-50/30 shadow-xs ring-1 ring-brand-navy'
                        : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 p-1 flex items-center justify-center shrink-0">
                        <img 
                          src="/ATM.png" 
                          alt="Cash" 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">Cash (Uang Kertas)</div>
                        <div className="text-[11px] text-slate-400 font-medium">Uang tunai / dompet fisik</div>
                      </div>
                    </div>
                    {value === "Cash (Uang Kertas)" && !isCustom && (
                      <div className="w-6 h-6 rounded-full bg-brand-navy text-brand-gold flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                </div>
              )}

              {/* Categorized Items */}
              {filteredCategories.length > 0 ? (
                filteredCategories.map((group) => (
                  <div key={group.category} className="space-y-2">
                    <div className="flex items-center gap-2 px-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                      <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                        {group.category}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold bg-slate-200/60 px-1.5 py-0.5 rounded-md">
                        {group.items.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {group.items.map((item) => {
                        const isSelected = value === item.name && !isCustom;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelect(item)}
                            className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left bg-white ${
                              isSelected
                                ? 'border-brand-navy bg-blue-50/30 shadow-xs ring-1 ring-brand-navy'
                                : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                                <img
                                  src={item.logo}
                                  alt={item.name}
                                  className="w-full h-full object-contain"
                                  loading="lazy"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-800 text-sm truncate">{item.name}</div>
                                <div className="text-[10px] text-slate-400 font-semibold">{item.category}</div>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-6 h-6 rounded-full bg-brand-navy text-brand-gold flex items-center justify-center shrink-0 ml-2">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm font-bold">Tidak ditemukan hasil "{searchQuery}"</p>
                  <p className="text-xs mt-1">Gunakan opsi ketik manual di bawah untuk membuat sumber sendiri.</p>
                </div>
              )}

              {/* Custom Input Option */}
              {allowCustom && (
                <div className="pt-2">
                  <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-2 mb-2">
                    Lainnya
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectCustom}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 transition-all text-left text-indigo-700 font-bold text-sm"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Edit3 className="w-4 h-4" />
                    </div>
                    <div>
                      <div>+ Ketik Manual (Sumber Lainnya)</div>
                      <div className="text-[11px] text-indigo-500/80 font-normal">Buat nama dompet kustom Anda sendiri</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
