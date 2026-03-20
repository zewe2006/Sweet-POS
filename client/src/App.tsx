import { useState } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import POS from "@/pages/pos";
import Kitchen from "@/pages/kitchen";
import Orders from "@/pages/orders";
import MenuManagement from "@/pages/menu-management";
import Reports from "@/pages/reports";
import Promotions from "@/pages/promotions";
import SettingsPage from "@/pages/settings";
import Customers from "@/pages/customers";
import RewardsConfig from "@/pages/rewards-config";
import GiftCards from "@/pages/gift-cards";
import TimeClock from "@/pages/time-clock";
import Settlement from "@/pages/settlement";
import EmployeePortal from "@/pages/employee-portal";
import Dashboard from "@/pages/dashboard";
import AuditLogPage from "@/pages/audit-log";
import TipPool from "@/pages/tip-pool";

function AppRouter({ locationId }: { locationId: number }) {
  return (
    <Switch>
      <Route path="/">{() => <Dashboard locationId={locationId} />}</Route>
      <Route path="/pos">{() => <POS locationId={locationId} />}</Route>
      <Route path="/kitchen">{() => <Kitchen locationId={locationId} />}</Route>
      <Route path="/orders">{() => <Orders locationId={locationId} />}</Route>
      <Route path="/time-clock">{() => <TimeClock locationId={locationId} />}</Route>
      <Route path="/menu" component={MenuManagement} />
      <Route path="/settlement">{() => <Settlement locationId={locationId} />}</Route>
      <Route path="/reports">{() => <Reports locationId={locationId} />}</Route>
      <Route path="/promotions" component={Promotions} />
      <Route path="/customers" component={Customers} />
      <Route path="/gift-cards" component={GiftCards} />
      <Route path="/rewards" component={RewardsConfig} />
      <Route path="/audit-log">{() => <AuditLogPage locationId={locationId} />}</Route>
      <Route path="/tip-pool">{() => <TipPool locationId={locationId} />}</Route>
      <Route path="/settings">{() => <SettingsPage locationId={locationId} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [locationId, setLocationId] = useState(1);

  const sidebarStyle = {
    "--sidebar-width": "14rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router hook={useHashLocation}>
          <Switch>
            {/* Employee portal - standalone page without sidebar */}
            <Route path="/employee">{() => <EmployeePortal />}</Route>

            {/* Main POS app with sidebar */}
            <Route>
              {() => (
                <SidebarProvider style={sidebarStyle as React.CSSProperties}>
                  <div className="flex h-screen w-full overflow-hidden">
                    <AppSidebar
                      locationId={locationId}
                      onLocationChange={setLocationId}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <header className="flex items-center h-10 px-2 border-b bg-background shrink-0">
                        <SidebarTrigger data-testid="button-sidebar-toggle" />
                      </header>
                      <main className="flex-1 overflow-hidden">
                        <AppRouter locationId={locationId} />
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              )}
            </Route>
          </Switch>
        </Router>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
