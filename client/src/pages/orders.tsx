import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ManagerPinDialog } from "@/components/manager-pin-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import {
  Store,
  Truck,
  ShoppingBag,
  Smartphone,
  Globe,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  CreditCard,
  Banknote,
  Search,
  RotateCcw,
  Receipt,
} from "lucide-react";
import type { Order, OrderItem } from "@shared/schema";

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  pending: { label: "Pending", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  confirmed: { label: "Confirmed", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  preparing: { label: "Preparing", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  ready: { label: "Ready", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  closed: { label: "Closed", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  completed: { label: "Completed", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

// The next logical status for each status
const nextStatus: Record<string, string> = {
  open: "preparing",
  pending: "preparing",
  confirmed: "preparing",
  preparing: "ready",
  ready: "closed",
};

const nextStatusLabel: Record<string, string> = {
  open: "Start Preparing",
  pending: "Start Preparing",
  confirmed: "Start Preparing",
  preparing: "Mark Ready",
  ready: "Close Order",
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

const paymentLabels: Record<string, string> = {
  stripe: "Card",
  cash: "Cash",
  gift_card: "Gift Card",
  external: "External",
  unpaid: "Unpaid",
};

interface OrderDetail extends Order {
  items: OrderItem[];
}

export default function Orders({ locationId }: { locationId: number }) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelTargetOrderId, setCancelTargetOrderId] = useState<number | null>(null);
  // Refund
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundManagerAuth, setRefundManagerAuth] = useState(false);
  const [refundAuthorizer, setRefundAuthorizer] = useState("");
  // Receipt
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  // Digital receipt
  const [sendReceiptEmail, setSendReceiptEmail] = useState("");
  const [sendingReceipt, setSendingReceipt] = useState(false);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders", { locationId }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/orders?locationId=${locationId}`);
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      return res.json();
    },
    onSuccess: (updatedOrder: Order) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      if (selectedOrder && selectedOrder.id === updatedOrder.id) {
        setSelectedOrder({ ...selectedOrder, status: updatedOrder.status, completedAt: updatedOrder.completedAt });
      }
      const statusLabel = statusConfig[updatedOrder.status || ""]?.label || updatedOrder.status;
      toast({
        title: `Order ${updatedOrder.orderNumber}`,
        description: `Status updated to ${statusLabel}`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const refundMutation = useMutation({
    mutationFn: async ({ orderId, amount, reason, refundedBy }: { orderId: number; amount: number; reason: string; refundedBy: string }) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/refund`, { amount, reason, refundedBy });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setRefundDialogOpen(false);
      setRefundAmount("");
      setRefundReason("");
      toast({ title: "Refund Processed", description: `Refund of $${refundAmount} issued successfully` });
    },
    onError: (err: Error) => {
      toast({ title: "Refund Failed", description: err.message, variant: "destructive" });
    },
  });

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (sourceFilter !== "all" && o.source !== sourceFilter) return false;
    if (paymentFilter !== "all" && o.paymentMethod !== paymentFilter) return false;
    if (dateFilter) {
      const orderDate = o.createdAt ? new Date(o.createdAt).toISOString().split("T")[0] : "";
      if (orderDate !== dateFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !o.orderNumber.toLowerCase().includes(q) &&
        !(o.customerName || "").toLowerCase().includes(q)
      ) return false;
    }
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

  const handleAdvanceStatus = (e: React.MouseEvent, orderId: number, currentStatus: string) => {
    e.stopPropagation();
    const next = nextStatus[currentStatus];
    if (next) {
      updateStatusMutation.mutate({ orderId, status: next });
    }
  };

  const handleCompleteOrder = (orderId: number) => {
    updateStatusMutation.mutate({ orderId, status: "closed" });
  };

  const handleCancelOrder = (orderId: number) => {
    updateStatusMutation.mutate({ orderId, status: "cancelled" });
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
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search order # or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm pl-7 w-[200px]"
            />
          </div>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-8 text-sm w-[140px]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-8 text-sm" data-testid="filter-status">
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
            <SelectTrigger className="w-[120px] h-8 text-sm" data-testid="filter-source">
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
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[120px] h-8 text-sm">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="stripe">Card</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="gift_card">Gift Card</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
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
                <TableHead className="w-[80px]">Payment</TableHead>
                <TableHead className="w-[80px] text-right">Total</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[130px]">Time</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const SourceIcon = sourceIcons[order.source] || Store;
                  const statusCfg = statusConfig[order.status || ""] || statusConfig.pending;
                  const canAdvance = !!nextStatus[order.status || ""];
                  const isUnpaid = order.paymentMethod === "unpaid" || !order.paymentMethod;
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
                      <TableCell>
                        {isUnpaid ? (
                          <Badge variant="destructive" className="text-[10px]">Unpaid</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {paymentLabels[order.paymentMethod || ""] || order.paymentMethod}
                          </span>
                        )}
                      </TableCell>
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
                      <TableCell>
                        {canAdvance && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2"
                            onClick={(e) => handleAdvanceStatus(e, order.id, order.status || "")}
                            disabled={updateStatusMutation.isPending}
                          >
                            {nextStatusLabel[order.status || ""] || "Next"}
                            <ChevronRight className="w-3 h-3 ml-0.5" />
                          </Button>
                        )}
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
                {(selectedOrder.paymentMethod === "unpaid" || !selectedOrder.paymentMethod) && (
                  <Badge variant="destructive" className="text-[10px]">Unpaid</Badge>
                )}
                {selectedOrder.paymentMethod && selectedOrder.paymentMethod !== "unpaid" && (
                  <Badge variant="outline" className="text-[10px]">
                    {paymentLabels[selectedOrder.paymentMethod] || selectedOrder.paymentMethod}
                  </Badge>
                )}
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
                {formatTime(selectedOrder.createdAt)}
              </div>

              {/* Action Buttons */}
              {selectedOrder.status !== "completed" && selectedOrder.status !== "closed" && selectedOrder.status !== "cancelled" && (
                <div className="flex gap-2 pt-2 border-t">
                  {nextStatus[selectedOrder.status || ""] && (
                    <Button
                      className="flex-1 gap-1.5"
                      onClick={() => {
                        const next = nextStatus[selectedOrder.status || ""];
                        if (next) updateStatusMutation.mutate({ orderId: selectedOrder.id, status: next });
                      }}
                      disabled={updateStatusMutation.isPending}
                    >
                      {updateStatusMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {nextStatusLabel[selectedOrder.status || ""] || "Advance"}
                    </Button>
                  )}
                  {selectedOrder.status !== "ready" && (
                    <Button
                      variant="outline"
                      className="gap-1.5 text-teal-700 border-teal-300 hover:bg-teal-50"
                      onClick={() => handleCompleteOrder(selectedOrder.id)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Close
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="gap-1.5 text-red-700 border-red-300 hover:bg-red-50"
                    onClick={() => setCancelTargetOrderId(selectedOrder.id)}
                    disabled={updateStatusMutation.isPending}
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel
                  </Button>
                </div>
              )}

              {/* Refund & Receipt for closed/completed orders */}
              {(selectedOrder.status === "closed" || selectedOrder.status === "completed") && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5 text-orange-700 border-orange-300 hover:bg-orange-50"
                    onClick={() => {
                      setRefundAmount(String(selectedOrder.total));
                      setRefundReason("");
                      setRefundManagerAuth(true);
                    }}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Refund
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={async () => {
                      try {
                        const res = await apiRequest("GET", `/api/orders/${selectedOrder.id}/receipt`);
                        const data = await res.json();
                        setReceiptData(data);
                        setReceiptDialogOpen(true);
                      } catch {
                        toast({ title: "Error", description: "Failed to load receipt", variant: "destructive" });
                      }
                    }}
                  >
                    <Receipt className="w-4 h-4" />
                    Receipt
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manager PIN for Cancel */}
      <ManagerPinDialog
        open={cancelTargetOrderId !== null}
        onOpenChange={(open) => { if (!open) setCancelTargetOrderId(null); }}
        actionDescription={`Cancel order #${orders.find((o) => o.id === cancelTargetOrderId)?.orderNumber ?? ""}`}
        onAuthorized={(user) => {
          if (cancelTargetOrderId !== null) {
            updateStatusMutation.mutate({ orderId: cancelTargetOrderId, status: "cancelled" });
            toast({
              title: "Order Cancelled",
              description: `Authorized by ${user.name}`,
            });
          }
          setCancelTargetOrderId(null);
        }}
      />

      {/* Manager PIN for Refund */}
      <ManagerPinDialog
        open={refundManagerAuth}
        onOpenChange={(open) => { if (!open) setRefundManagerAuth(false); }}
        actionDescription={`Refund $${refundAmount} on order #${selectedOrder?.orderNumber ?? ""}`}
        onAuthorized={(user) => {
          setRefundManagerAuth(false);
          setRefundAuthorizer(user.name);
          setRefundDialogOpen(true);
        }}
      />

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-orange-600" />
              Issue Refund — {selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              Order total: <span className="font-semibold">${selectedOrder?.total.toFixed(2)}</span>
            </div>
            <div className="space-y-1">
              <Label>Refund Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedOrder?.total}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Customer complaint, wrong order, etc."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => {
                  if (selectedOrder) {
                    refundMutation.mutate({
                      orderId: selectedOrder.id,
                      amount: parseFloat(refundAmount),
                      reason: refundReason,
                      refundedBy: refundAuthorizer,
                    });
                  }
                }}
                disabled={!refundAmount || parseFloat(refundAmount) <= 0 || refundMutation.isPending}
              >
                {refundMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Refund ${parseFloat(refundAmount || "0").toFixed(2)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {receiptData && (
            <div className="font-mono text-xs space-y-2 p-4 bg-white text-black rounded border">
              <div className="text-center space-y-0.5">
                <div className="font-bold text-sm">{receiptData.storeName}</div>
                {receiptData.storeAddress && <div>{receiptData.storeAddress}</div>}
                {receiptData.storePhone && <div>{receiptData.storePhone}</div>}
              </div>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <div className="flex justify-between">
                <span>Order: {receiptData.orderNumber}</span>
                <span>{receiptData.type}</span>
              </div>
              <div>{receiptData.date}</div>
              {receiptData.customerName && <div>Customer: {receiptData.customerName}</div>}
              <div className="border-t border-dashed border-gray-400 my-2" />
              {receiptData.items.map((item: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span>${item.total.toFixed(2)}</span>
                  </div>
                  {item.modifiers?.length > 0 && (
                    <div className="pl-3 text-[10px] text-gray-500">
                      {item.modifiers.map((m: any) => m.name).join(", ")}
                    </div>
                  )}
                </div>
              ))}
              <div className="border-t border-dashed border-gray-400 my-2" />
              {receiptData.discountAmount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount</span>
                  <span>-${receiptData.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${receiptData.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>${receiptData.tax.toFixed(2)}</span>
              </div>
              {receiptData.tip > 0 && (
                <div className="flex justify-between">
                  <span>Tip</span>
                  <span>${receiptData.tip.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm border-t border-dashed border-gray-400 pt-1">
                <span>TOTAL</span>
                <span>${receiptData.total.toFixed(2)}</span>
              </div>
              {receiptData.refundAmount > 0 && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>REFUND</span>
                  <span>-${receiptData.refundAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Payment</span>
                <span>{paymentLabels[receiptData.paymentMethod || ""] || receiptData.paymentMethod}</span>
              </div>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <div className="text-center text-[10px]">
                {receiptData.header}
              </div>
              <div className="text-center text-[10px]">
                {receiptData.footer}
              </div>
            </div>
          )}
          {/* Send digital receipt */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-xs">Email receipt to:</Label>
              <Input
                type="email"
                placeholder="customer@email.com"
                value={sendReceiptEmail}
                onChange={(e) => setSendReceiptEmail(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!sendReceiptEmail || sendingReceipt}
              onClick={async () => {
                if (!selectedOrder) return;
                setSendingReceipt(true);
                try {
                  await apiRequest("POST", `/api/orders/${selectedOrder.id}/send-receipt`, { email: sendReceiptEmail });
                  toast({ title: "Receipt Sent", description: `Emailed to ${sendReceiptEmail}` });
                  setSendReceiptEmail("");
                } catch {
                  toast({ title: "Failed", description: "Could not send receipt", variant: "destructive" });
                } finally {
                  setSendingReceipt(false);
                }
              }}
            >
              {sendingReceipt ? <Loader2 className="w-3 h-3 animate-spin" /> : "Send"}
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>Close</Button>
            <Button onClick={() => window.print()}>Print</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
