import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/Home";
import Income from "@/pages/Income";
import Expense from "@/pages/Expense";
import Investment from "@/pages/Investment";
import Target from "@/pages/Target";
import Performance from "@/pages/Performance";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/income" component={Income} />
      <Route path="/expense" component={Expense} />
      <Route path="/investment" component={Investment} />
      <Route path="/target" component={Target} />
      <Route path="/performance" component={Performance} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
