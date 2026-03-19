import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Star,
  Store,
  Truck,
  Smartphone,
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
} from "recharts";
import type { Order, MenuItem } from "@shared/schema";

const today = new Date().toISOString().split("T")[0];

export default function Reports({ locationId }: { locationId: number }) {
  const { data: dailySales } = useQuery<{
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
  }>({
    queryKey: ["/api/reports/daily", { locationId, date: today }],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/reports/daily?locationId=${locationId}&date=${today}`
      );
      return res.json();
    },
  });

  const { data: hourlyData = [] } = useQuery<
    { hour: number; orders: number; revenue: number }[]
  >({
    queryKey: ["/api/reports/hourly", { locationId, date: today }],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/reports/hourly?locationId=${locationId}&date=${today}`
      );
      return res.json();
    },
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders", { locationId, forReports: true }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/orders?locationId=${locationId}`);
      return res.json();
    },
  });

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/items"],
  });

  // Compute source breakdown from all orders
  const sourceBreakdown = orders.reduce(
    (acc, o) => {
      const s = o.source || "pos";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const sourcePieData = Object.entries(sourceBreakdown).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const pieColors = ["hsl(12, 78%, 60%)", "hsl(173, 58%, 39%)", "hsl(262, 60%, 52%)", "hsl(43, 74%, 49%)", "hsl(27, 87%, 55%)"];

  // Find top selling item (simple: count occurrences)
  const topItem = menuItems.length > 0 ? menuItems.find((i) => i.isPopular) || menuItems[0] : null;

  const recentOrders = orders.slice(0, 10);

  const formatHour = (h: number) => {
    if (h === 0) return "12AM";
    if (h < 12) return `${h}AM`;
    if (h === 12) return "12PM";
    return `${h - 12}PM`;
  };

  // Filter hourly data to only show business hours
  const filteredHourly = hourlyData.filter((h) => h.hour >= 7 && h.hour <= 22);

  return (
    <div className="h-full overflow-auto" data-testid="reports-page">
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">Reports Dashboard</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Today's Revenue</p>
                  <p className="text-lg font-bold tabular-nums" data-testid="kpi-revenue">
                    ${(dailySales?.totalRevenue ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ShoppingBag className="w-4.5 h-4.5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Orders Today</p>
                  <p className="text-lg font-bold tabular-nums" data-testid="kpi-orders">
                    {dailySales?.totalOrders ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4.5 h-4.5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Order Value</p>
                  <p className="text-lg font-bold tabular-nums" data-testid="kpi-avg">
                    ${(dailySales?.avgOrderValue ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Star className="w-4.5 h-4.5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Top Selling</p>
                  <p className="text-sm font-bold truncate max-w-[120px]" data-testid="kpi-top-item">
                    {topItem?.name || "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-3 gap-3">
          {/* Orders by Hour */}
          <Card className="col-span-2">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">Orders by Hour</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredHourly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={formatHour}
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      labelFormatter={(h) => formatHour(h as number)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Orders by Source */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">Orders by Source</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourcePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sourcePieData.map((_, idx) => (
                        <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      iconSize={8}
                      wrapperStyle={{ fontSize: "11px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id} data-testid={`report-order-${order.id}`}>
                    <TableCell className="font-mono text-sm font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{order.source}</TableCell>
                    <TableCell className="text-sm">{order.customerName || "—"}</TableCell>
                    <TableCell className="text-sm capitalize">
                      {(order.type || "").replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${order.total.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
