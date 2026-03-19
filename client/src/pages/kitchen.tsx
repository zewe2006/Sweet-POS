import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  ChefHat,
  CheckCircle2,
  Truck,
  Store,
  ShoppingBag,
  Smartphone,
} from "lucide-react";
import type { Order, OrderItem } from "@shared/schema";

interface OrderWithItems extends Order {
  items: OrderItem[];
}

const sourceConfig: Record<string, { label: string; icon: typeof Store; color: string }> = {
  pos: { label: "POS", icon: Store, color: "bg-blue-500/20 text-blue-400" },
  ubereats: { label: "UberEats", icon: Truck, color: "bg-green-500/20 text-green-400" },
  doordash: { label: "DoorDash", icon: ShoppingBag, color: "bg-red-500/20 text-red-400" },
  app: { label: "App", icon: Smartphone, color: "bg-purple-500/20 text-purple-400" },
};

const typeLabels: Record<string, string> = {
  dine_in: "Dine In",
  takeout: "Takeout",
  pickup: "Pickup",
  delivery: "Delivery",
};

export default function Kitchen({ locationId }: { locationId: number }) {
  const { toast } = useToast();

  // Apply dark mode for kitchen display
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  const { data: orders = [] } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders/queue", String(locationId)],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/orders/queue/${locationId}`);
      return res.json();
    },
    refetchInterval: 5000,
  });

  // Also fetch confirmed orders (queue endpoint only returns preparing/ready)
  const { data: allOrders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders", { locationId, status: "confirmed" }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/orders?locationId=${locationId}&status=confirmed`);
      return res.json();
    },
    refetchInterval: 5000,
  });

  // We need items for confirmed orders too
  const { data: confirmedWithItems = [] } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders/confirmed-items", locationId],
    queryFn: async () => {
      const results: OrderWithItems[] = [];
      for (const order of allOrders) {
        const res = await apiRequest("GET", `/api/orders/${order.id}`);
        results.push(await res.json());
      }
      return results;
    },
    enabled: allOrders.length > 0,
    refetchInterval: 5000,
  });

  const allDisplayOrders = [
    ...confirmedWithItems.filter((o) => o.status === "confirmed"),
    ...orders,
  ].sort((a, b) => {
    const statusOrder: Record<string, number> = { confirmed: 0, preparing: 1, ready: 2 };
    const sa = statusOrder[a.status || ""] ?? 3;
    const sb = statusOrder[b.status || ""] ?? 3;
    if (sa !== sb) return sa - sb;
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/confirmed-items"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const getTimeSince = (date: Date | string | null) => {
    if (!date) return "";
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (diff < 1) return "Just now";
    if (diff === 1) return "1 min ago";
    return `${diff} min ago`;
  };

  const statusColors: Record<string, string> = {
    confirmed: "border-blue-500/40 bg-blue-500/5",
    preparing: "border-amber-500/40 bg-amber-500/5",
    ready: "border-green-500/40 bg-green-500/5",
  };

  return (
    <div className="h-full overflow-auto p-4 bg-background" data-testid="kitchen-page">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Kitchen Display</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Confirmed ({allDisplayOrders.filter((o) => o.status === "confirmed").length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Preparing ({allDisplayOrders.filter((o) => o.status === "preparing").length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span>Ready ({allDisplayOrders.filter((o) => o.status === "ready").length})</span>
          </div>
        </div>
      </div>

      {allDisplayOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <ChefHat className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">No active orders</p>
          <p className="text-sm">Orders will appear here when placed</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {allDisplayOrders.map((order) => {
            const source = sourceConfig[order.source] || sourceConfig.pos;
            const SourceIcon = source.icon;
            return (
              <div
                key={order.id}
                data-testid={`kitchen-order-${order.id}`}
                className={`rounded-lg border-2 p-3 ${statusColors[order.status || ""] || ""}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-2xl font-bold tracking-tight">{order.orderNumber}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className={`text-[10px] ${source.color}`}>
                        <SourceIcon className="w-2.5 h-2.5 mr-0.5" />
                        {source.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {typeLabels[order.type || ""] || order.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{getTimeSince(order.createdAt)}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1 mb-3">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="text-sm">
                      <div className="flex gap-2">
                        <span className="font-bold text-primary">{item.quantity}x</span>
                        <div>
                          <span className="font-medium">{item.name}</span>
                          {item.modifiers && (item.modifiers as any[]).length > 0 && (
                            <div className="text-[10px] text-muted-foreground">
                              {(item.modifiers as any[]).map((m: any) => m.name).join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {order.status === "confirmed" && (
                    <Button
                      size="sm"
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={() =>
                        updateStatusMutation.mutate({ id: order.id, status: "preparing" })
                      }
                      disabled={updateStatusMutation.isPending}
                      data-testid={`button-start-${order.id}`}
                    >
                      <ChefHat className="w-3.5 h-3.5 mr-1" />
                      Start Preparing
                    </Button>
                  )}
                  {order.status === "preparing" && (
                    <Button
                      size="sm"
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                      onClick={() =>
                        updateStatusMutation.mutate({ id: order.id, status: "ready" })
                      }
                      disabled={updateStatusMutation.isPending}
                      data-testid={`button-ready-${order.id}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Ready
                    </Button>
                  )}
                  {order.status === "ready" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        updateStatusMutation.mutate({ id: order.id, status: "completed" })
                      }
                      disabled={updateStatusMutation.isPending}
                      data-testid={`button-complete-${order.id}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
