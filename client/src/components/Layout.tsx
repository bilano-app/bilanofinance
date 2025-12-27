import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, PieChart, Wallet, TrendingUp, Target } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function MobileLayout({ children, title, showBack = false }: { children: ReactNode; title?: string; showBack?: boolean }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 font-body selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            </Link>
          )}
          <h1 className="text-xl font-display font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {title || "FinFlow"}
          </h1>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
          U
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-6 max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/50 px-6 py-2 pb-6 z-50">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <NavItem href="/" icon={<Home size={22} />} label="Home" active={location === "/"} />
          <NavItem href="/income" icon={<Wallet size={22} />} label="Income" active={location === "/income"} />
          <NavItem href="/expense" icon={<PieChart size={22} />} label="Expense" active={location === "/expense"} />
          <NavItem href="/investment" icon={<TrendingUp size={22} />} label="Invest" active={location === "/investment"} />
          <NavItem href="/performance" icon={<Target size={22} />} label="Stats" active={location === "/performance"} />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={cn(
      "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200",
      active ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
    )}>
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {icon}
      </motion.div>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
