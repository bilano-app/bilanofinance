import React from "react";
import { Button, Input } from "@/components/UIComponents";
import { Brain, Target, Zap, CheckCircle2, ChevronRight, Info } from "lucide-react";

// =========================================================================
// 📐 INTERFACE CONTRACT FOR DYNAMIC RENDERER
// =========================================================================
interface OptionItem {
  value: string;
  label: string;
}

interface StepField {
  id: string;
  placeholder: string;
  input_type: 'text' | 'number';
}

interface StepCardSection {
  type: 'choice_single' | 'choice_multi' | 'input_group' | 'info';
  label: string;
  options?: OptionItem[];
  fields?: StepField[];
}

interface DynamicStepCardProps {
  title: string;
  color_variant: 'primary' | 'accent';
  sections: StepCardSection[];
  selectedValue?: string; // Untuk single choice
  selectedValues?: string[]; // Untuk multi choice
  inputValues?: Record<string, string | number>; // Untuk input group harian
  onSelectSingle?: (value: string) => void;
  onSelectMulti?: (value: string) => void;
  onInputChange?: (id: string, value: string) => void;
  onSubmitInputs?: () => void;
  submitButtonText?: string;
  isSubmitDisabled?: boolean;
}

export default function DynamicStepCard({
  title,
  color_variant,
  sections,
  selectedValue = "",
  selectedValues = [],
  inputValues = {},
  onSelectSingle,
  onSelectMulti,
  onInputChange,
  onSubmitInputs,
  submitButtonText = "LANJUTKAN TAHAPAN",
  isSubmitDisabled = false,
}: DynamicStepCardProps) {
  
  // Memilih ikon header secara dinamis agar UI terasa hidup dan premium
  const getHeaderIcon = () => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes("identifikasi") || titleLower.includes("profil")) return <Brain className="w-5 h-5 animate-pulse" />;
    if (titleLower.includes("tujuan") || titleLower.includes("target")) return <Target className="w-5 h-5" />;
    if (titleLower.includes("keahlian") || titleLower.includes("skill")) return <Zap className="w-5 h-5 text-amber-300" />;
    return <CheckCircle2 className="w-5 h-5" />;
  };

  return (
    <div className="bg-white rounded-[32px] shadow-md border border-slate-100 overflow-hidden animate-in slide-in-from-right-8 duration-300 w-full max-w-sm mx-auto">
      {/* 🟦 HEADER KARTU DENGAN GRADIEN KHAS PREMIUM BILANO */}
      <div 
        className={`px-6 py-4 flex items-center gap-2.5 text-white ${
          color_variant === 'primary' 
            ? 'bg-gradient-to-r from-blue-600 to-indigo-700' 
            : 'bg-gradient-to-r from-emerald-500 to-teal-600'
        }`}
      >
        <div className="opacity-95 shrink-0">{getHeaderIcon()}</div>
        <h3 className="font-black text-sm uppercase tracking-wider truncate">{title}</h3>
      </div>

      {/* ⬜ ISI RENDERER MANDIRI DI DALAM KARTU */}
      <div className="p-6 space-y-6">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-3">
            <p className="text-sm font-bold text-slate-800 leading-relaxed font-sans">
              {section.label}
            </p>

            {/* A. TIPE 1: PILIHAN GANDA (SINGLE CHOICE - IDENTIFIKASI FASE 1) */}
            {section.type === 'choice_single' && section.options && (
              <div className="space-y-2.5">
                {section.options.map((opt) => {
                  const isCurrentSelected = selectedValue === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => onSelectSingle?.(opt.value)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center group ${
                        isCurrentSelected
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-inner'
                          : 'border-slate-100 hover:border-indigo-400 hover:bg-slate-50/50'
                      }`}
                    >
                      <span 
                        className={`font-extrabold text-sm transition-colors ${
                          isCurrentSelected ? 'text-indigo-700' : 'text-slate-700 group-hover:text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </span>
                      <ChevronRight 
                        className={`w-4 h-4 transition-all ${
                          isCurrentSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-400 group-hover:text-indigo-500'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* B. TIPE 2: MULTI PILIHAN (MULTI CHOICE - INVENTARIS KEAHLIAN/ASET) */}
            {section.type === 'choice_multi' && section.options && (
              <div className="space-y-2.5">
                {section.options.map((opt) => {
                  const isMultiSelected = selectedValues.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      onClick={() => onSelectMulti?.(opt.value)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center ${
                        isMultiSelected
                          ? 'border-emerald-500 bg-emerald-50/30'
                          : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/30'
                      }`}
                    >
                      <span 
                        className={`font-extrabold text-sm ${
                          isMultiSelected ? 'text-emerald-700' : 'text-slate-700'
                        }`}
                      >
                        {opt.label}
                      </span>
                      <div 
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isMultiSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                        }`}
                      >
                        {isMultiSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* C. TIPE 3: GRUP INPUT INTEGRASI KALKULATOR (PAS PASAN SAMA REFERENSI GAMBAR TUGAS DARI USER) */}
            {section.type === 'input_group' && section.fields && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {section.fields.map((field) => (
                    <div key={field.id} className="flex flex-col">
                      <Input
                        type={field.input_type}
                        placeholder={field.placeholder}
                        value={inputValues[field.id] ?? ""}
                        onChange={(e) => onInputChange?.(field.id, e.target.value)}
                        className="bg-slate-100/90 border-2 border-transparent focus:border-slate-900 h-12 font-black text-xs text-slate-800 placeholder-slate-400 rounded-xl px-3.5 text-center transition-all shadow-sm"
                      />
                    </div>
                  ))}
                </div>
                {onSubmitInputs && (
                  <Button
                    onClick={onSubmitInputs}
                    disabled={isSubmitDisabled}
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl tracking-wider uppercase transition-transform active:scale-98 shadow-md mt-2"
                  >
                    {submitButtonText}
                  </Button>
                )}
              </div>
            )}

            {/* D. TIPE 4: INFORMASI BANNER TEKS UMUM */}
            {section.type === 'info' && (
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex gap-2.5 items-start">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 font-medium leading-relaxed font-sans">
                  {section.label}
                </p>
              </div>
            )}

          </div>
        ))}
      </div>
    </div>
  );
}