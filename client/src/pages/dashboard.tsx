import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  CreditCard,
  Banknote,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Order, Shift, User } from "@shared/schema";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  confirmed: { label: "Confirmed", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  preparing: { label: "Preparing", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  ready: { label: "Ready", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  completed: { label: "Completed", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const paymentMethodLabels: Record<string, string> = {
  stripe: "Card",
  cash: "Cash",
  external: "External",
  gift_card: "Gift Card",
  split: "Split",
};

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function isToday(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function Dashboard({ locationId }: { locationId: number }) {
  const { data: allOrders = [] } = useQuery<Order[]>({
    queryKey: [`/api/orders?locationId=${locationId}`],
    refetchInterval: 30000,
  });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: [`/api/shifts?locationId=${locationId}`],
    refetchInterval: 30000,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const userMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const user of users) {
      map[user.id] = user.name;
    }
    return map;
  }, [users]);

  const todayOrders = useMemo(
    () => allOrders.filter((o) => isToday(o.createdAt)),
    [allOrders],
  );

  const completedOrders = useMemo(
    () => todayOrders.filter((o) => o.status === "completed" || o.status === "closed"),
    [todayOrders],
  );

  const activeShifts = useMemo(
    () => shifts.filter((s) => s.status === "active"),
    [shifts],
  );

  // KPI calculations
  const todayRevenue = useMemo(
    () => completedOrders.reduce((sum, o) => sum + (o.total ?? 0), 0),
    [completedOrders],
  );

  const todayOrderCount = todayOrders.length;

  const averageOrderValue = todayOrderCount > 0 ? todayRevenue / todayOrderCount : 0;

  const cashSales = useMemo(
    () =>
      completedOrders
        .filter((o) => o.paymentMethod === "cash")
        .reduce((sum, o) => sum + (o.total ?? 0), 0),
    [completedOrders],
  );

  const cardSales = useMemo(
    () =>
      completedOrders
        .filter((o) => o.paymentMethod === "stripe")
        .reduce((sum, o) => sum + (o.total ?? 0), 0),
    [completedOrders],
  );

  const tipsCollected = useMemo(
    () => completedOrders.reduce((sum, o) => sum + (o.tip ?? 0), 0),
    [completedOrders],
  );

  // Recent orders (last 10 of today)
  const recentOrders = useMemo(
    () =>
      [...todayOrders]
        .sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        )
        .slice(0, 10),
    [todayOrders],
  );

  // Hourly revenue chart data
  const hourlyData = useMemo(() => {
    const hourMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) {
      hourMap[h] = 0;
    }
    for (const order of completedOrders) {
      if (order.createdAt) {
        const hour = new Date(order.createdAt).getHours();
        hourMap[hour] += order.total ?? 0;
      }
    }
    // Only show hours that have data or are within business-like range (7am-10pm)
    return Object.entries(hourMap)
      .filter(([h, val]) => {
        const hour = parseInt(h);
        return val > 0 || (hour >= 7 && hour <= 22);
      })
      .map(([h, val]) => ({
        hour: `${parseInt(h) % 12 || 12}${parseInt(h) < 12 ? "a" : "p"}`,
        revenue: Math.round(val * 100) / 100,
      }));
  }, [completedOrders]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Today at a Glance</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todayRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayOrderCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Order Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageOrderValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Staff
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeShifts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash / Card
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              <span className="flex items-center gap-1">
                <Banknote className="h-3.5 w-3.5 text-green-600" />
                {formatCurrency(cashSales)}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                {formatCurrency(cardSales)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tips Collected
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(tipsCollected)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders - spans 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No orders today yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => {
                    const status = statusConfig[order.status ?? "pending"] ?? statusConfig.pending;
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.total ?? 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={status.className}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {paymentMethodLabels[order.paymentMethod ?? ""] ?? order.paymentMethod ?? "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Who's Clocked In */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Who's Clocked In
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeShifts.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No active shifts right now.
              </p>
            ) : (
              <div className="space-y-3">
                {activeShifts.map((shift) => {
                  const clockInTime = shift.clockIn
                    ? new Date(shift.clockIn).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "";
                  return (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {userMap[shift.userId] ?? `User #${shift.userId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Clocked in at {clockInTime}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Active
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hourly Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hourly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {hourlyData.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No revenue data to display yet.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
