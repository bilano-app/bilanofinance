import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";

// Import Halaman Utama
import Home from "@/pages/Home";
import Target from "@/pages/Target";
import Income from "@/pages/Income";
import Expense from "@/pages/Expense";
import Reports from "@/pages/Reports";
import Investment from "@/pages/Investment";
import Forex from "@/pages/Forex";
import Subscriptions from "@/pages/Subscriptions";
import Categories from "@/pages/Categories";
import Auth from "@/pages/Auth";
import ChatAI from "@/pages/ChatAI";
import Profile from "@/pages/Profile";
import Performance from "@/pages/Performance";
import Paywall from "@/pages/Paywall";

// PENTING: Pastikan nama file ini sesuai dengan yang ada di folder pages Anda
import Debts from "@/pages/Debts"; // Perhatikan huruf 's' (Debts.tsx)
import SmartScan from "@/pages/SmartScan"; 

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/target" component={Target} />
      <Route path="/income" component={Income} />
      <Route path="/expense" component={Expense} />
      <Route path="/reports" component={Reports} />
      <Route path="/investment" component={Investment} />
      <Route path="/debts" component={Debts} />
      <Route path="/forex" component={Forex} />
      <Route path="/subscriptions" component={Subscriptions} />
      <Route path="/categories" component={Categories} />
      <Route path="/auth" component={Auth} />
      <Route path="/chat-ai" component={ChatAI} />
      <Route path="/profile" component={Profile} />
      <Route path="/performance" component={Performance} />
      <Route path="/scan" component={SmartScan} />
      <Route path="/paywall" component={Paywall} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;