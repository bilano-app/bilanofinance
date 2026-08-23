import { useState } from "react";
import { Button } from "@/components/UIComponents";
import { Wallet, X, ArrowDown, ArrowUp } from "lucide-react";
import { useUser } from "@/hooks/use-finance";
import { getWalletLogo } from "@/lib/wallet-sources";

interface SourceSelectionPopupProps {
    type: 'income' | 'expense' | 'piutang' | 'hutang';
    title?: string;
    description?: string;
    onSelect: (sourceName: string) => void;
    onCancel: () => void;
}

export default function SourceSelectionPopup({ type, title, description, onSelect, onCancel }: SourceSelectionPopupProps) {
    const { data: user } = useUser();
    const walletSources = (user?.walletSources as any[]) || [];
    const [selected, setSelected] = useState("");

    const isIncome = type === 'income' || type === 'piutang';
    const defaultTitle = isIncome ? 'Pilih Dompet Tujuan' : 'Pilih Dompet Asal';
    const defaultDesc = isIncome ? 'Uang ini akan masuk ke dompet mana?' : 'Uang ini diambil dari dompet mana?';

    return (
        <div className="fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl animate-in zoom-in-95 border border-slate-100 flex flex-col overflow-hidden relative">
                <button onClick={onCancel} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-slate-100 rounded-full transition-colors z-10 text-slate-500">
                    <X className="w-5 h-5" />
                </button>

                <div className={`p-6 text-white text-center rounded-t-[32px] border-b-[6px] relative ${isIncome ? 'bg-emerald-500 border-emerald-600' : 'bg-rose-500 border-rose-600'}`}>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                        {isIncome ? <ArrowDown className="w-8 h-8" /> : <ArrowUp className="w-8 h-8" />}
                    </div>
                    <h2 className="text-xl font-black mb-1">{title || defaultTitle}</h2>
                    <p className="text-xs text-white/80 font-medium">
                        {description || defaultDesc}
                    </p>
                </div>

                <div className="p-5 max-h-[50vh] overflow-y-auto space-y-2 bg-slate-50">
                    {walletSources.length > 0 ? (
                        walletSources.map((wallet) => {
                            const logo = getWalletLogo(wallet.name);
                            return (
                                <button
                                    key={wallet.name}
                                    onClick={() => setSelected(wallet.name)}
                                    className={`w-full flex items-center justify-between p-4 rounded-[20px] border-2 transition-all text-left ${selected === wallet.name ? 'border-brand-navy bg-white shadow-sm' : 'border-transparent bg-white hover:border-slate-200 shadow-[0_2px_10px_rgb(0,0,0,0.02)]'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center p-1.5 shadow-2xs border ${selected === wallet.name ? 'bg-white border-brand-navy' : 'bg-slate-50 border-slate-200'}`}>
                                            {logo ? (
                                                <img src={logo} alt={wallet.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <Wallet className="w-5 h-5 text-slate-500" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm">{wallet.name}</div>
                                            <div className="text-[11px] text-slate-500 font-medium">Saldo: Rp {wallet.balance.toLocaleString('id-ID')}</div>
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected === wallet.name ? 'border-brand-navy' : 'border-slate-300'}`}>
                                        {selected === wallet.name && <div className="w-2.5 h-2.5 bg-brand-navy rounded-full" />}
                                    </div>
                                </button>
                            );
                        })
                    ) : (
                        <div className="text-center p-4 text-sm text-slate-500">
                            Belum ada dompet spesifik. Silakan rincikan dompet Anda di halaman Beranda.
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-100">
                    <Button 
                        onClick={() => selected && onSelect(selected)} 
                        disabled={!selected} 
                        className={`w-full h-14 font-black rounded-full shadow-[4px_4px_0px_0px] shadow-slate-300 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px] transition-all text-base ${isIncome ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'} text-white`}
                    >
                        LANJUTKAN
                    </Button>
                </div>
            </div>
        </div>
    );
}
