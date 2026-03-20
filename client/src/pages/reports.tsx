import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Receipt,
  BarChart3,
  Package,
  Clock,
  Users,
  AlertTriangle,
  UserPlus,
  UserCheck,
  Loader2,
  Building2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
  format,
} from "date-fns";
// Report types (mirrors server/storage.ts interfaces)
interface DashboardReport {
  kpis: { totalRevenue: number; totalOrders: number; avgOrderValue: number; totalTips: number };
  revenueTrend: Array<{ date: string; revenue: number; orders: number }>;
  ordersBySource: Array<{ source: string; count: number; revenue: number }>;
  ordersByPayment: Array<{ method: string; count: number; revenue: number }>;
  hourlyDistribution: Array<{ hour: number; orders: number; revenue: number }>;
}

interface SalesReport {
  dailyBreakdown: Array<{
    date: string; orders: number; grossSales: number; discounts: number;
    netSales: number; tax: number; tips: number; total: number;
  }>;
  paymentBreakdown: Array<{ method: string; count: number; total: number }>;
  sourceBreakdown: Array<{ source: string; count: number; total: number }>;
  typeBreakdown: Array<{ type: string; count: number; total: number }>;
  totals: { orders: number; grossSales: number; discounts: number; netSales: number; tax: number; tips: number; total: number };
  itemsSoldByDay: Array<{ date: string; items: Array<{ name: string; quantity: number; revenue: number }> }>;
}

interface ProductMixReport {
  topByQuantity: Array<{ menuItemId: number; name: string; category: string; quantity: number; revenue: number }>;
  topByRevenue: Array<{ menuItemId: number; name: string; category: string; quantity: number; revenue: number }>;
  categoryBreakdown: Array<{ category: string; itemCount: number; totalQuantity: number; totalRevenue: number }>;
  itemProfitability: Array<{ menuItemId: number; name: string; cost: number; revenue: number; profit: number; margin: number }>;
}

interface LaborReport {
  employeeSummary: Array<{
    userId: number; name: string; role: string; hoursWorked: number;
    breakMinutes: number; laborCost: number; shiftsCount: number; tips: number;
  }>;
  dailyLaborTrend: Array<{ date: string; totalHours: number; totalCost: number }>;
  totalTips: number;
  laborVsRevenue: { totalLaborCost: number; totalRevenue: number; ratio: number };
  overtimeFlags: Array<{ userId: number; name: string; date: string; hoursWorked: number; type: string }>;
}

interface CustomerReport {
  newVsReturning: { newCustomers: number; returningCustomers: number };
  topBySpend: Array<{ id: number; name: string; phone: string | null; lifetimeSpend: number; visitCount: number; tier: string }>;
  tierDistribution: Array<{ tier: string; count: number }>;
  acquisitionTrend: Array<{ date: string; newCustomers: number }>;
}

interface EnterpriseReport {
  overview: {
    totalRevenue: number; totalOrders: number; avgOrderValue: number;
    totalTips: number; totalLaborCost: number; laborRatio: number;
  };
  locationBreakdown: Array<{
    locationId: number; locationName: string; revenue: number;
    orders: number; avgOrderValue: number; tips: number;
    laborCost: number; laborRatio: number;
  }>;
  dailyTrend: Array<Record<string, string | number>>;
  paymentBreakdown: Array<{ method: string; count: number; total: number }>;
  sourceBreakdown: Array<{ source: string; count: number; total: number }>;
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
  itemsSoldByDay: Array<{ date: string; items: Array<{ name: string; quantity: number; revenue: number }> }>;
}

// ============ CONSTANTS ============
const PIE_COLORS = [
  "hsl(12, 78%, 60%)",
  "hsl(173, 58%, 39%)",
  "hsl(262, 60%, 52%)",
  "hsl(43, 74%, 49%)",
  "hsl(27, 87%, 55%)",
  "hsl(200, 70%, 50%)",
];

const TIER_COLORS: Record<string, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2",
};

const LOCATION_COLORS = [
  "hsl(12, 78%, 60%)",
  "hsl(173, 58%, 39%)",
  "hsl(262, 60%, 52%)",
  "hsl(43, 74%, 49%)",
  "hsl(200, 70%, 50%)",
];

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  fontSize: "12px",
};

// ============ DATE RANGE HELPERS ============
type DatePreset = "today" | "yesterday" | "this_week" | "this_month" | "last_month" | "custom";

function getPresetRange(preset: DatePreset): { startDate: string; endDate: string } {
  const today = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");

  switch (preset) {
    case "today":
      return { startDate: fmt(today), endDate: fmt(today) };
    case "yesterday": {
      const y = subDays(today, 1);
      return { startDate: fmt(y), endDate: fmt(y) };
    }
    case "this_week":
      return { startDate: fmt(startOfWeek(today, { weekStartsOn: 1 })), endDate: fmt(today) };
    case "this_month":
      return { startDate: fmt(startOfMonth(today)), endDate: fmt(today) };
    case "last_month": {
      const lm = subMonths(today, 1);
      return { startDate: fmt(startOfMonth(lm)), endDate: fmt(endOfMonth(lm)) };
    }
    default:
      return { startDate: fmt(today), endDate: fmt(today) };
  }
}

const PRESET_LABELS: Record<DatePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
  custom: "Custom Range",
};

// ============ HELPERS ============
const fmtCurrency = (v: number) => `$${v.toFixed(2)}`;
const fmtPercent = (v: number) => `${v.toFixed(1)}%`;

const formatHour = (h: number) => {
  if (h === 0) return "12AM";
  if (h < 12) return `${h}AM`;
  if (h === 12) return "12PM";
  return `${h - 12}PM`;
};

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin mr-2" />
      <span className="text-sm">Loading report data...</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ============ KPI CARD ============
function KPICard({
  label,
  value,
  icon: Icon,
  color,
  testId,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  testId?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold tabular-nums" data-testid={testId}>
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ MAIN COMPONENT ============
export default function Reports({ locationId }: { locationId: number }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [preset, setPreset] = useState<DatePreset>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const { startDate, endDate } = useMemo(() => {
    if (preset === "custom" && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    return getPresetRange(preset);
  }, [preset, customStart, customEnd]);

  // ============ DATA FETCHING ============
  const { data: dashboard, isLoading: dashboardLoading } = useQuery<DashboardReport>({
    queryKey: ["/api/reports/dashboard", { locationId, startDate, endDate }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reports/dashboard?locationId=${locationId}&startDate=${startDate}&endDate=${endDate}`);
      return res.json();
    },
    enabled: activeTab === "dashboard",
  });

  const { data: sales, isLoading: salesLoading } = useQuery<SalesReport>({
    queryKey: ["/api/reports/sales", { locationId, startDate, endDate }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reports/sales?locationId=${locationId}&startDate=${startDate}&endDate=${endDate}`);
      return res.json();
    },
    enabled: activeTab === "sales",
  });

  const { data: productMix, isLoading: productMixLoading } = useQuery<ProductMixReport>({
    queryKey: ["/api/reports/product-mix", { locationId, startDate, endDate }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reports/product-mix?locationId=${locationId}&startDate=${startDate}&endDate=${endDate}`);
      return res.json();
    },
    enabled: activeTab === "products",
  });

  const { data: labor, isLoading: laborLoading } = useQuery<LaborReport>({
    queryKey: ["/api/reports/labor", { locationId, startDate, endDate }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reports/labor?locationId=${locationId}&startDate=${startDate}&endDate=${endDate}`);
      return res.json();
    },
    enabled: activeTab === "labor",
  });

  const { data: customerData, isLoading: customerLoading } = useQuery<CustomerReport>({
    queryKey: ["/api/reports/customers", { locationId, startDate, endDate }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reports/customers?locationId=${locationId}&startDate=${startDate}&endDate=${endDate}`);
      return res.json();
    },
    enabled: activeTab === "customers",
  });

  const { data: enterprise, isLoading: enterpriseLoading } = useQuery<EnterpriseReport>({
    queryKey: ["/api/reports/enterprise", { startDate, endDate }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reports/enterprise?startDate=${startDate}&endDate=${endDate}`);
      return res.json();
    },
    enabled: activeTab === "enterprise",
  });

  const locationNames = useMemo(() => {
    if (!enterprise) return [];
    return enterprise.locationBreakdown.map(l => l.locationName);
  }, [enterprise]);

  // Filtered hourly data for business hours
  const filteredHourly = useMemo(
    () => (dashboard?.hourlyDistribution || []).filter((h) => h.hour >= 7 && h.hour <= 22),
    [dashboard]
  );

  return (
    <div className="h-full flex flex-col" data-testid="reports-page">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b bg-background shrink-0 flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="sales" data-testid="tab-sales">
              <DollarSign className="w-3.5 h-3.5 mr-1.5" />
              Sales
            </TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products">
              <Package className="w-3.5 h-3.5 mr-1.5" />
              Product Mix
            </TabsTrigger>
            <TabsTrigger value="labor" data-testid="tab-labor">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Labor
            </TabsTrigger>
            <TabsTrigger value="customers" data-testid="tab-customers">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="enterprise" data-testid="tab-enterprise">
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              Enterprise
            </TabsTrigger>
          </TabsList>

          {/* Date Range Picker */}
          <div className="flex items-center gap-2">
            <Select value={preset} onValueChange={(v) => setPreset(v as DatePreset)}>
              <SelectTrigger className="w-[150px] text-sm h-8" data-testid="date-preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRESET_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {preset === "custom" && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-8 px-2 text-sm border rounded-md bg-background"
                  data-testid="date-start"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-8 px-2 text-sm border rounded-md bg-background"
                  data-testid="date-end"
                />
              </>
            )}
            <Badge variant="outline" className="text-[10px] h-6">
              {startDate === endDate ? startDate : `${startDate} — ${endDate}`}
            </Badge>
          </div>
        </div>

        {/* Tab Content */}
        <ScrollArea className="flex-1 min-h-0">
          {/* =================== DASHBOARD TAB =================== */}
          <TabsContent value="dashboard" className="p-4 space-y-4 mt-0">
            {dashboardLoading ? (
              <LoadingState />
            ) : !dashboard ? (
              <EmptyState message="No data available for this period" />
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-3">
                  <KPICard
                    label="Revenue"
                    value={fmtCurrency(dashboard.kpis.totalRevenue)}
                    icon={DollarSign}
                    color="bg-primary/10 text-primary"
                    testId="kpi-revenue"
                  />
                  <KPICard
                    label="Orders"
                    value={String(dashboard.kpis.totalOrders)}
                    icon={ShoppingBag}
                    color="bg-blue-500/10 text-blue-500"
                    testId="kpi-orders"
                  />
                  <KPICard
                    label="Avg Order Value"
                    value={fmtCurrency(dashboard.kpis.avgOrderValue)}
                    icon={TrendingUp}
                    color="bg-green-500/10 text-green-500"
                    testId="kpi-avg"
                  />
                  <KPICard
                    label="Tips"
                    value={fmtCurrency(dashboard.kpis.totalTips)}
                    icon={Receipt}
                    color="bg-amber-500/10 text-amber-500"
                    testId="kpi-tips"
                  />
                </div>

                {/* Revenue Trend + Orders by Source */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="col-span-2">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="h-[220px]">
                        {dashboard.revenueTrend.length > 1 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dashboard.revenueTrend}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis
                                dataKey="date"
                                tickFormatter={(d) => format(new Date(d + "T00:00:00"), "MMM d")}
                                tick={{ fontSize: 11 }}
                                stroke="hsl(var(--muted-foreground))"
                              />
                              <YAxis
                                tick={{ fontSize: 11 }}
                                stroke="hsl(var(--muted-foreground))"
                                tickFormatter={(v) => `$${v}`}
                              />
                              <Tooltip
                                labelFormatter={(d) => format(new Date(d + "T00:00:00"), "MMM d, yyyy")}
                                formatter={(value: number) => [fmtCurrency(value), "Revenue"]}
                                contentStyle={TOOLTIP_STYLE}
                              />
                              <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="hsl(var(--primary))"
                                fill="hsl(var(--primary))"
                                fillOpacity={0.1}
                                strokeWidth={2}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-2xl font-bold">{fmtCurrency(dashboard.kpis.totalRevenue)}</p>
                              <p className="text-xs text-muted-foreground mt-1">Total revenue for {startDate}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">Orders by Source</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="h-[220px]">
                        {dashboard.ordersBySource.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={dashboard.ordersBySource.map((s) => ({ name: s.source.charAt(0).toUpperCase() + s.source.slice(1), value: s.count }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={75}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {dashboard.ordersBySource.map((_, idx) => (
                                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={TOOLTIP_STYLE} />
                              <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <EmptyState message="No orders" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Hourly Distribution + Payment Method */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="col-span-2">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">Orders by Hour</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={filteredHourly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="hour" tickFormatter={formatHour} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip labelFormatter={(h) => formatHour(h as number)} contentStyle={TOOLTIP_STYLE} />
                            <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">Payment Methods</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="h-[220px]">
                        {dashboard.ordersByPayment.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={dashboard.ordersByPayment.map((p) => ({ name: (p.method || "unknown").charAt(0).toUpperCase() + (p.method || "unknown").slice(1), value: p.count }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={75}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {dashboard.ordersByPayment.map((_, idx) => (
                                  <Cell key={idx} fill={PIE_COLORS[(idx + 2) % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={TOOLTIP_STYLE} />
                              <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <EmptyState message="No payment data" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* =================== SALES TAB =================== */}
          <TabsContent value="sales" className="p-4 space-y-4 mt-0">
            {salesLoading ? (
              <LoadingState />
            ) : !sales ? (
              <EmptyState message="No sales data for this period" />
            ) : (
              <>
                {/* Summary KPIs */}
                <div className="grid grid-cols-4 gap-3">
                  <KPICard label="Gross Sales" value={fmtCurrency(sales.totals.grossSales)} icon={DollarSign} color="bg-primary/10 text-primary" />
                  <KPICard label="Tax Collected" value={fmtCurrency(sales.totals.tax)} icon={Receipt} color="bg-orange-500/10 text-orange-500" />
                  <KPICard label="Tips" value={fmtCurrency(sales.totals.tips)} icon={TrendingUp} color="bg-green-500/10 text-green-500" />
                  <KPICard label="Total" value={fmtCurrency(sales.totals.total)} icon={ShoppingBag} color="bg-blue-500/10 text-blue-500" />
                </div>

                {/* Daily Breakdown Table */}
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold">Daily Sales Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Gross Sales</TableHead>
                          <TableHead className="text-right">Tax</TableHead>
                          <TableHead className="text-right">Tips</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sales.dailyBreakdown.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              No sales data
                            </TableCell>
                          </TableRow>
                        ) : (
                          sales.dailyBreakdown.map((d) => (
                            <TableRow key={d.date}>
                              <TableCell className="text-sm">{format(new Date(d.date + "T00:00:00"), "MMM d, yyyy")}</TableCell>
                              <TableCell className="text-right tabular-nums">{d.orders}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtCurrency(d.grossSales)}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtCurrency(d.tax)}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtCurrency(d.tips)}</TableCell>
                              <TableCell className="text-right tabular-nums font-medium">{fmtCurrency(d.total)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                      {sales.dailyBreakdown.length > 0 && (
                        <TableFooter>
                          <TableRow className="font-semibold">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right tabular-nums">{sales.totals.orders}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtCurrency(sales.totals.grossSales)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtCurrency(sales.totals.tax)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtCurrency(sales.totals.tips)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtCurrency(sales.totals.total)}</TableCell>
                          </TableRow>
                        </TableFooter>
                      )}
                    </Table>
                  </CardContent>
                </Card>

                {/* Breakdowns */}
                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">By Payment Method</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sales.paymentBreakdown.map((p) => (
                            <TableRow key={p.method}>
                              <TableCell className="text-sm capitalize">{p.method}</TableCell>
                              <TableCell className="text-right tabular-nums">{p.count}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtCurrency(p.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">By Source</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Source</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sales.sourceBreakdown.map((s) => (
                            <TableRow key={s.source}>
                              <TableCell className="text-sm capitalize">{s.source}</TableCell>
                              <TableCell className="text-right tabular-nums">{s.count}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtCurrency(s.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">By Order Type</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sales.typeBreakdown.map((t) => (
                            <TableRow key={t.type}>
                              <TableCell className="text-sm capitalize">{t.type}</TableCell>
                              <TableCell className="text-right tabular-nums">{t.count}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtCurrency(t.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                {/* Items Sold by Day */}
                {sales.itemsSoldByDay.length > 0 && (
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">Items Sold by Day</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sales.itemsSoldByDay.map((day) =>
                            day.items.map((item, idx) => (
                              <TableRow key={`${day.date}-${item.name}`}>
                                {idx === 0 ? (
                                  <TableCell rowSpan={day.items.length} className="text-sm font-medium align-top border-r">
                                    {format(new Date(day.date + "T00:00:00"), "MMM d, yyyy")}
                                  </TableCell>
                                ) : null}
                                <TableCell className="text-sm">{item.name}</TableCell>
                                <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                                <TableCell className="text-right tabular-nums">{fmtCurrency(item.revenue)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* =================== PRODUCT MIX TAB =================== */}
          <TabsContent value="products" className="p-4 space-y-4 mt-0">
            {productMixLoading ? (
              <LoadingState />
            ) : !productMix ? (
              <EmptyState message="No product data for this period" />
            ) : (
              <>
                {/* Top 10 Items Bar Chart */}
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold">Top 10 Items by Revenue</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="h-[280px]">
                      {productMix.topByRevenue.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={productMix.topByRevenue.slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={90} />
                            <Tooltip formatter={(value: number) => [fmtCurrency(value), "Revenue"]} contentStyle={TOOLTIP_STYLE} />
                            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyState message="No items sold in this period" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Top by Quantity & Top by Revenue Tables */}
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">Top Items by Quantity</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productMix.topByQuantity.slice(0, 15).map((item, idx) => (
                            <TableRow key={item.menuItemId}>
                              <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="text-sm font-medium">{item.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtCurrency(item.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">Top Items by Revenue</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productMix.topByRevenue.slice(0, 15).map((item, idx) => (
                            <TableRow key={item.menuItemId}>
                              <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="text-sm font-medium">{item.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtCurrency(item.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                {/* Category Breakdown */}
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold">Category Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Items</TableHead>
                          <TableHead className="text-right">Quantity Sold</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productMix.categoryBreakdown.map((c) => (
                          <TableRow key={c.category}>
                            <TableCell className="text-sm font-medium">{c.category}</TableCell>
                            <TableCell className="text-right tabular-nums">{c.itemCount}</TableCell>
                            <TableCell className="text-right tabular-nums">{c.totalQuantity}</TableCell>
                            <TableCell className="text-right tabular-nums font-medium">{fmtCurrency(c.totalRevenue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Item Profitability */}
                {productMix.itemProfitability.length > 0 && (
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">Item Profitability</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Cost</TableHead>
                            <TableHead className="text-right">Profit</TableHead>
                            <TableHead className="text-right">Margin</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productMix.itemProfitability.map((item) => (
                            <TableRow key={item.menuItemId}>
                              <TableCell className="text-sm font-medium">{item.name}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtCurrency(item.revenue)}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtCurrency(item.cost)}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                <span className={item.profit >= 0 ? "text-green-600" : "text-red-600"}>
                                  {fmtCurrency(item.profit)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                <Badge variant={item.margin >= 50 ? "default" : item.margin >= 30 ? "secondary" : "destructive"} className="text-[10px]">
                                  {fmtPercent(item.margin)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* =================== LABOR TAB =================== */}
          <TabsContent value="labor" className="p-4 space-y-4 mt-0">
            {laborLoading ? (
              <LoadingState />
            ) : !labor ? (
              <EmptyState message="No labor data for this period" />
            ) : (
              <>
                {/* Labor KPIs */}
                <div className="grid grid-cols-4 gap-3">
                  <KPICard
                    label="Total Hours"
                    value={`${labor.employeeSummary.reduce((s, e) => s + e.hoursWorked, 0).toFixed(1)}h`}
                    icon={Clock}
                    color="bg-blue-500/10 text-blue-500"
                  />
                  <KPICard
                    label="Labor Cost"
                    value={fmtCurrency(labor.laborVsRevenue.totalLaborCost)}
                    icon={DollarSign}
                    color="bg-primary/10 text-primary"
                  />
                  <KPICard
                    label="Total Tips"
                    value={fmtCurrency(labor.totalTips)}
                    icon={Receipt}
                    color="bg-green-500/10 text-green-500"
                  />
                  <KPICard
                    label="Labor % of Revenue"
                    value={fmtPercent(labor.laborVsRevenue.ratio)}
                    icon={TrendingUp}
                    color="bg-amber-500/10 text-amber-500"
                  />
                </div>

                {/* Employee Summary Table */}
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold">Employee Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Shifts</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                          <TableHead className="text-right">Break (min)</TableHead>
                          <TableHead className="text-right">Labor Cost</TableHead>
                          <TableHead className="text-right">Tips</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {labor.employeeSummary.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              No shifts found
                            </TableCell>
                          </TableRow>
                        ) : (
                          labor.employeeSummary.map((emp) => {
                            const hasOT = labor.overtimeFlags.some((f) => f.userId === emp.userId);
                            return (
                              <TableRow key={emp.userId}>
                                <TableCell className="text-sm font-medium">{emp.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] capitalize">{emp.role}</Badge>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">{emp.shiftsCount}</TableCell>
                                <TableCell className="text-right tabular-nums">{emp.hoursWorked.toFixed(1)}</TableCell>
                                <TableCell className="text-right tabular-nums">{emp.breakMinutes}</TableCell>
                                <TableCell className="text-right tabular-nums font-medium">{fmtCurrency(emp.laborCost)}</TableCell>
                                <TableCell className="text-right tabular-nums text-green-600">{fmtCurrency(emp.tips)}</TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Daily Labor Trend */}
                {labor.dailyLaborTrend.length > 1 && (
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">Daily Labor Hours</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={labor.dailyLaborTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(d) => format(new Date(d + "T00:00:00"), "MMM d")}
                              tick={{ fontSize: 11 }}
                              stroke="hsl(var(--muted-foreground))"
                            />
                            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip
                              labelFormatter={(d) => format(new Date(d + "T00:00:00"), "MMM d, yyyy")}
                              formatter={(value: number, name: string) => [
                                name === "totalHours" ? `${value}h` : fmtCurrency(value),
                                name === "totalHours" ? "Hours" : "Cost",
                              ]}
                              contentStyle={TOOLTIP_STYLE}
                            />
                            <Bar dataKey="totalHours" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]} name="totalHours" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Overtime Alerts */}
                {labor.overtimeFlags.length > 0 && (
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" /> Overtime Alerts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-2">
                        {labor.overtimeFlags.map((flag, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <Badge variant="destructive" className="text-[10px]">
                              {flag.type === "daily" ? "Daily OT" : "Weekly OT"}
                            </Badge>
                            <span className="font-medium">{flag.name}</span>
                            <span className="text-muted-foreground">—</span>
                            <span className="tabular-nums">{flag.hoursWorked.toFixed(1)}h</span>
                            <span className="text-muted-foreground text-xs">({flag.date})</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* =================== CUSTOMERS TAB =================== */}
          <TabsContent value="customers" className="p-4 space-y-4 mt-0">
            {customerLoading ? (
              <LoadingState />
            ) : !customerData ? (
              <EmptyState message="No customer data for this period" />
            ) : (
              <>
                {/* Customer KPIs */}
                <div className="grid grid-cols-4 gap-3">
                  <KPICard
                    label="New Customers"
                    value={String(customerData.newVsReturning.newCustomers)}
                    icon={UserPlus}
                    color="bg-green-500/10 text-green-500"
                  />
                  <KPICard
                    label="Returning Customers"
                    value={String(customerData.newVsReturning.returningCustomers)}
                    icon={UserCheck}
                    color="bg-blue-500/10 text-blue-500"
                  />
                  <KPICard
                    label="Total Customers"
                    value={String(customerData.tierDistribution.reduce((s, t) => s + t.count, 0))}
                    icon={Users}
                    color="bg-primary/10 text-primary"
                  />
                  <KPICard
                    label="Top Spender"
                    value={customerData.topBySpend[0]?.name || "—"}
                    icon={TrendingUp}
                    color="bg-amber-500/10 text-amber-500"
                  />
                </div>

                {/* Tier Distribution + Acquisition Trend */}
                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">Loyalty Tier Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="h-[220px]">
                        {customerData.tierDistribution.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={customerData.tierDistribution.map((t) => ({
                                  name: t.tier.charAt(0).toUpperCase() + t.tier.slice(1),
                                  value: t.count,
                                }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={75}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {customerData.tierDistribution.map((t) => (
                                  <Cell key={t.tier} fill={TIER_COLORS[t.tier] || PIE_COLORS[0]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={TOOLTIP_STYLE} />
                              <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <EmptyState message="No customers" />
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="col-span-2">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">Customer Acquisition</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="h-[220px]">
                        {customerData.acquisitionTrend.length > 1 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={customerData.acquisitionTrend}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis
                                dataKey="date"
                                tickFormatter={(d) => format(new Date(d + "T00:00:00"), "MMM d")}
                                tick={{ fontSize: 11 }}
                                stroke="hsl(var(--muted-foreground))"
                              />
                              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                              <Tooltip
                                labelFormatter={(d) => format(new Date(d + "T00:00:00"), "MMM d, yyyy")}
                                contentStyle={TOOLTIP_STYLE}
                              />
                              <Area
                                type="monotone"
                                dataKey="newCustomers"
                                stroke="hsl(173, 58%, 39%)"
                                fill="hsl(173, 58%, 39%)"
                                fillOpacity={0.1}
                                strokeWidth={2}
                                name="New Customers"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-2xl font-bold">{customerData.newVsReturning.newCustomers}</p>
                              <p className="text-xs text-muted-foreground mt-1">New customers in this period</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Customers */}
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold">Top Customers by Lifetime Spend</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead className="text-right">Visits</TableHead>
                          <TableHead className="text-right">Lifetime Spend</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerData.topBySpend.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              No customers found
                            </TableCell>
                          </TableRow>
                        ) : (
                          customerData.topBySpend.map((cust, idx) => (
                            <TableRow key={cust.id}>
                              <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="text-sm font-medium">{cust.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{cust.phone || "—"}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] capitalize"
                                  style={{ borderColor: TIER_COLORS[cust.tier] || undefined, color: TIER_COLORS[cust.tier] || undefined }}
                                >
                                  {cust.tier}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{cust.visitCount}</TableCell>
                              <TableCell className="text-right tabular-nums font-medium">{fmtCurrency(cust.lifetimeSpend)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* =================== ENTERPRISE TAB =================== */}
          <TabsContent value="enterprise" className="p-4 space-y-4 mt-0">
            {enterpriseLoading ? (
              <LoadingState />
            ) : !enterprise ? (
              <EmptyState message="No enterprise data available for this period" />
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-6 gap-3">
                  <KPICard
                    label="Total Revenue"
                    value={fmtCurrency(enterprise.overview.totalRevenue)}
                    icon={DollarSign}
                    color="bg-primary/10 text-primary"
                  />
                  <KPICard
                    label="Total Orders"
                    value={String(enterprise.overview.totalOrders)}
                    icon={ShoppingBag}
                    color="bg-blue-500/10 text-blue-500"
                  />
                  <KPICard
                    label="Avg Order"
                    value={fmtCurrency(enterprise.overview.avgOrderValue)}
                    icon={TrendingUp}
                    color="bg-green-500/10 text-green-500"
                  />
                  <KPICard
                    label="Total Tips"
                    value={fmtCurrency(enterprise.overview.totalTips)}
                    icon={Receipt}
                    color="bg-amber-500/10 text-amber-500"
                  />
                  <KPICard
                    label="Labor Cost"
                    value={fmtCurrency(enterprise.overview.totalLaborCost)}
                    icon={Clock}
                    color="bg-purple-500/10 text-purple-500"
                  />
                  <KPICard
                    label="Labor %"
                    value={fmtPercent(enterprise.overview.laborRatio)}
                    icon={TrendingUp}
                    color="bg-red-500/10 text-red-500"
                  />
                </div>

                {/* Location Comparison Table */}
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold">Location Performance Comparison</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Avg Order</TableHead>
                          <TableHead className="text-right">Tips</TableHead>
                          <TableHead className="text-right">Labor Cost</TableHead>
                          <TableHead className="text-right">Labor %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enterprise.locationBreakdown.map((loc, idx) => (
                          <TableRow key={loc.locationId}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LOCATION_COLORS[idx % LOCATION_COLORS.length] }} />
                                {loc.locationName}
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{loc.orders}</TableCell>
                            <TableCell className="text-right tabular-nums font-medium">{fmtCurrency(loc.revenue)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtCurrency(loc.avgOrderValue)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtCurrency(loc.tips)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtCurrency(loc.laborCost)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              <Badge variant={loc.laborRatio > 30 ? "destructive" : "outline"} className="text-[10px]">
                                {fmtPercent(loc.laborRatio)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell className="font-bold">Total</TableCell>
                          <TableCell className="text-right tabular-nums font-bold">{enterprise.overview.totalOrders}</TableCell>
                          <TableCell className="text-right tabular-nums font-bold">{fmtCurrency(enterprise.overview.totalRevenue)}</TableCell>
                          <TableCell className="text-right tabular-nums font-bold">{fmtCurrency(enterprise.overview.avgOrderValue)}</TableCell>
                          <TableCell className="text-right tabular-nums font-bold">{fmtCurrency(enterprise.overview.totalTips)}</TableCell>
                          <TableCell className="text-right tabular-nums font-bold">{fmtCurrency(enterprise.overview.totalLaborCost)}</TableCell>
                          <TableCell className="text-right tabular-nums font-bold">
                            <Badge variant={enterprise.overview.laborRatio > 30 ? "destructive" : "outline"} className="text-[10px]">
                              {fmtPercent(enterprise.overview.laborRatio)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </CardContent>
                </Card>

                {/* Revenue Trend by Location (stacked bar chart) */}
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold">Daily Revenue by Location</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="h-[280px]">
                      {enterprise.dailyTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={enterprise.dailyTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(d) => format(new Date(d + "T00:00:00"), "MMM d")}
                              tick={{ fontSize: 11 }}
                              stroke="hsl(var(--muted-foreground))"
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              stroke="hsl(var(--muted-foreground))"
                              tickFormatter={(v) => `$${v}`}
                            />
                            <Tooltip
                              labelFormatter={(d) => format(new Date(d + "T00:00:00"), "MMM d, yyyy")}
                              formatter={(value: number) => [`$${value.toFixed(2)}`, undefined]}
                              contentStyle={TOOLTIP_STYLE}
                            />
                            <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                            {locationNames.map((name, idx) => (
                              <Bar
                                key={name}
                                dataKey={name}
                                stackId="revenue"
                                fill={LOCATION_COLORS[idx % LOCATION_COLORS.length]}
                                radius={idx === locationNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyState message="No daily data available" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Bottom row: payment, source, top items */}
                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">By Payment Method</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {enterprise.paymentBreakdown.map((p) => (
                            <TableRow key={p.method}>
                              <TableCell className="text-sm capitalize">{p.method}</TableCell>
                              <TableCell className="text-right tabular-nums">{p.count}</TableCell>
                              <TableCell className="text-right tabular-nums font-medium">{fmtCurrency(p.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">By Source</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Source</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {enterprise.sourceBreakdown.map((s) => (
                            <TableRow key={s.source}>
                              <TableCell className="text-sm capitalize">{s.source}</TableCell>
                              <TableCell className="text-right tabular-nums">{s.count}</TableCell>
                              <TableCell className="text-right tabular-nums font-medium">{fmtCurrency(s.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">Top Items (All Locations)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {enterprise.topItems.map((item) => (
                            <TableRow key={item.name}>
                              <TableCell className="text-sm">{item.name}</TableCell>
                              <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                              <TableCell className="text-right tabular-nums font-medium">{fmtCurrency(item.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                {/* Items Sold by Day (Enterprise) */}
                {enterprise.itemsSoldByDay.length > 0 && (
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold">Items Sold by Day (All Locations)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {enterprise.itemsSoldByDay.map((day) =>
                            day.items.map((item, idx) => (
                              <TableRow key={`${day.date}-${item.name}`}>
                                {idx === 0 ? (
                                  <TableCell rowSpan={day.items.length} className="text-sm font-medium align-top border-r">
                                    {format(new Date(day.date + "T00:00:00"), "MMM d, yyyy")}
                                  </TableCell>
                                ) : null}
                                <TableCell className="text-sm">{item.name}</TableCell>
                                <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                                <TableCell className="text-right tabular-nums">{fmtCurrency(item.revenue)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
