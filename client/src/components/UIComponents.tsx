import React, { ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function Button({ 
  children, 
  className, 
  variant = "primary", 
  isLoading, 
  disabled,
  ...props 
}: ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost",
  isLoading?: boolean 
}) {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border-2 border-primary text-primary hover:bg-primary/5 bg-transparent",
    danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20",
    ghost: "hover:bg-muted text-foreground bg-transparent"
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        "relative flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
      {children}
    </button>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full px-4 py-4 rounded-xl bg-muted/50 border border-transparent focus:bg-background focus:border-primary/50 focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all duration-200 placeholder:text-muted-foreground/50",
        className
      )}
      {...props}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("bg-card rounded-3xl p-6 shadow-sm border border-border/50", className)}>
      {children}
    </div>
  );
}

export function CurrencyInput({ 
  value, 
  onChange, 
  placeholder = "0.00",
  label 
}: { 
  value: string, 
  onChange: (val: string) => void,
  placeholder?: string,
  label?: string
}) {
  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-muted-foreground ml-1">{label}</label>}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-8 text-lg font-medium"
        />
      </div>
    </div>
  );
}

import { ReactNode } from "react";

export function StatCard({ label, value, subtext, icon, type = "neutral" }: { 
  label: string, 
  value: string, 
  subtext?: string, 
  icon?: ReactNode,
  type?: "positive" | "negative" | "neutral" | "brand"
}) {
  const typeStyles = {
    positive: "bg-emerald-50 text-emerald-900 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-50 dark:border-emerald-900/50",
    negative: "bg-rose-50 text-rose-900 border-rose-100 dark:bg-rose-950/30 dark:text-rose-50 dark:border-rose-900/50",
    neutral: "bg-card text-foreground border-border/50",
    brand: "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
  };

  return (
    <div className={cn("rounded-2xl p-5 border shadow-sm flex flex-col gap-1", typeStyles[type])}>
      <div className="flex justify-between items-start">
        <span className={cn("text-sm font-medium opacity-80", type === "brand" ? "text-primary-foreground/80" : "text-muted-foreground")}>{label}</span>
        {icon && <div className="opacity-80">{icon}</div>}
      </div>
      <div className="text-2xl font-bold font-display tracking-tight mt-1">{value}</div>
      {subtext && <div className={cn("text-xs mt-1 font-medium opacity-70")}>{subtext}</div>}
    </div>
  );
}
