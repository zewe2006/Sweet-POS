import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Store,
  Truck,
  ShoppingBag,
  Smartphone,
  Globe,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Order, OrderItem } from "@shared/schema";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  confirmed: { label: "Confirmed", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  preparing: { label: "Preparing", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  ready: { label: "Ready", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  completed: { label: "Completed", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const sourceIcons: Record<string, typeof Store> = {
  pos: Store,
  ubereats: Truck,
  doordash: ShoppingBag,
  app: Smartphone,
  website: Globe,
};

const typeLabels: Record<string, string> = {
  dine_in: "Dine In",
  takeout: "Takeout",
  pickup: "Pickup",
  delivery: "Delivery",
};

interface OrderDetail extends Order {
  items: OrderItem[];
}

export default function Orders({ locationId }: { locationId: number }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders", { locationId }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/orders?locationId=${locationId}`);
      return res.json();
    },
  });

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (sourceFilter !== "all" && o.source !== sourceFilter) return false;
    return true;
  });

  const handleOrderClick = async (order: Order) => {
    try {
      const res = await apiRequest("GET", `/api/orders/${order.id}`);
      const detail: OrderDetail = await res.json();
      setSelectedOrder(detail);
      setDetailOpen(true);
    } catch {
      // ignore
    }
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full p-4" data-testid="orders-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Orders</h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-sm" data-testid="filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusConfig).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[130px] h-8 text-sm" data-testid="filter-source">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="pos">POS</SelectItem>
              <SelectItem value="ubereats">UberEats</SelectItem>
              <SelectItem value="doordash">DoorDash</SelectItem>
              <SelectItem value="app">App</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Order #</TableHead>
                <TableHead className="w-[90px]">Source</TableHead>
                <TableHead className="w-[80px]">Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="w-[60px] text-center">Items</TableHead>
                <TableHead className="w-[80px] text-right">Total</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[130px]">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const SourceIcon = sourceIcons[order.source] || Store;
                  const statusCfg = statusConfig[order.status || ""] || statusConfig.pending;
                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => handleOrderClick(order)}
                      data-testid={`order-row-${order.id}`}
                    >
                      <TableCell className="font-mono font-medium text-sm">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <SourceIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="capitalize">{order.source}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {typeLabels[order.type || ""] || order.type}
                      </TableCell>
                      <TableCell className="text-sm">{order.customerName || "—"}</TableCell>
                      <TableCell className="text-center text-sm">—</TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        ${order.total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${statusCfg.className}`}
                        >
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTime(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={statusConfig[selectedOrder.status || ""]?.className}>
                  {statusConfig[selectedOrder.status || ""]?.label}
                </Badge>
                <span className="text-xs text-muted-foreground capitalize">{selectedOrder.source}</span>
                <span className="text-xs text-muted-foreground">{typeLabels[selectedOrder.type || ""] || selectedOrder.type}</span>
              </div>
              {selectedOrder.customerName && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Customer:</span>{" "}
                  <span className="font-medium">{selectedOrder.customerName}</span>
                </div>
              )}
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-[40px] text-center">Qty</TableHead>
                      <TableHead className="w-[70px] text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="text-sm font-medium">{item.name}</div>
                          {item.modifiers && (item.modifiers as any[]).length > 0 && (
                            <div className="text-[10px] text-muted-foreground">
                              {(item.modifiers as any[]).map((m: any) => m.name).join(", ")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm">
                          ${(item.unitPrice * (item.quantity || 1)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-0.5 text-sm pt-2 border-t">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${selectedOrder.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>Total</span>
                  <span>${selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatTime(selectedOrder.createdAt)} · {selectedOrder.paymentMethod || "—"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
