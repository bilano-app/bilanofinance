import React, { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// --- BUTTON ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, children, ...props }, ref) => {
    const variants = {
      default: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200",
      secondary: "bg-slate-800 text-white hover:bg-slate-900",
    };
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-12 rounded-xl px-8",
      icon: "h-10 w-10",
    };
    return (
      <button
        ref={ref}
        className={cn("inline-flex items-center justify-center rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// --- INPUT ---
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn("flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// --- SELECT (INI YANG KITA TAMBAHKAN) ---
interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, options, ...props }, ref) => {
        return (
            <div className="relative">
                <select
                    className={cn(
                        "flex h-12 w-full appearance-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50",
                        className
                    )}
                    ref={ref}
                    {...props}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                {/* Ikon Panah ke Bawah */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
            </div>
        );
    }
);
Select.displayName = "Select";

// --- CURRENCY INPUT ---
interface CurrencyInputProps extends Omit<InputProps, 'onChange'> {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
}
export const CurrencyInput = ({ label, value, onChange, className, ...props }: CurrencyInputProps) => {
  const formatNumber = (numStr: string) => {
    if (!numStr) return "";
    const num = numStr.replace(/\D/g, ""); 
    return new Intl.NumberFormat("id-ID").format(Number(num));
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\./g, ""); 
    if (!isNaN(Number(rawValue))) onChange(rawValue);
  };
  return (
    <div className={cn("space-y-2", className)}>
      {label && <label className="text-sm font-medium leading-none ml-1">{label}</label>}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm pointer-events-none">Rp</div>
        <Input type="text" inputMode="numeric" className="pl-10 font-mono text-lg" value={formatNumber(value.toString())} onChange={handleChange} {...props} />
      </div>
    </div>
  );
};

// --- CARD SYSTEM ---
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border bg-card text-card-foreground shadow-sm bg-white", className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-6 pb-2", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

// --- STAT CARD ---
export const StatCard = ({ label, value, type = 'neutral', icon }: { label: string, value: string, type?: 'positive' | 'negative' | 'neutral' | 'brand', icon?: React.ReactNode }) => {
  const colors = {
    positive: "bg-emerald-50 text-emerald-700 border-emerald-100",
    negative: "bg-rose-50 text-rose-700 border-rose-100",
    neutral: "bg-card border-border",
    brand: "bg-primary text-primary-foreground border-primary"
  };
  return (
    <div className={cn("p-4 rounded-2xl border flex flex-col justify-between h-28 shadow-sm", colors[type])}>
       <div className="flex justify-between items-start"><span className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</span>{icon}</div>
       <span className="text-xl sm:text-2xl font-bold font-display truncate">{value}</span>
    </div>
  );
};