import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  CreditCard,
  Banknote,
  Gift,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  FileText,
  Calendar,
  TrendingUp,
  Clock,
  XCircle,
  ChevronRight,
  Loader2,
  Plus,
  Minus,
  ArrowDownToLine,
  ArrowUpFromLine,
  Trash2,
} from "lucide-react";
import { ManagerPinDialog } from "@/components/manager-pin-dialog";
import type { Settlement, User, CashDrawerTransaction } from "@shared/schema";

interface SettlementPreview {
  date: string;
  locationId: number;
  totalOrders: number;
  totalRevenue: number;
  totalTax: number;
  totalTips: number;
  cashSales: number;
  cardSales: number;
  giftCardSales: number;
  externalSales: number;
  cancelledOrders: number;
  totalRefunds: number;
  totalLaborHours: number;
  activeShifts: number;
  unfulfilledOrders: number;
  expectedCashFromSales: number;
  totalCashIn: number;
  totalCashOut: number;
}

const CASH_IN_REASONS = ["Starting float", "Change added", "Loan from safe", "Other"];
const CASH_OUT_REASONS = ["Bank deposit", "Petty cash", "Vendor payment", "Safe drop", "Other"];

function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function SettlementPage({ locationId }: { locationId: number }) {
  const { toast } = useToast();
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [cashDrawerDialogOpen, setCashDrawerDialogOpen] = useState(false);
  const [cashDrawerType, setCashDrawerType] = useState<"cash_in" | "cash_out">("cash_in");
  const [cashDrawerAmount, setCashDrawerAmount] = useState("");
  const [cashDrawerReason, setCashDrawerReason] = useState("");
  const [cashDrawerNotes, setCashDrawerNotes] = useState("");
  const [startingCash, setStartingCash] = useState("200.00");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [viewSettlement, setViewSettlement] = useState<Settlement | null>(null);
  const [historyTab, setHistoryTab] = useState(false);
  const [voidTargetId, setVoidTargetId] = useState<number | null>(null);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Check if day is already closed
  const { data: checkData } = useQuery<{ closed: boolean; settlement: Settlement | null }>({
    queryKey: [`/api/settlements/check/${locationId}/${selectedDate}`],
  });

  // Get Z-report preview
  const { data: preview, isLoading: previewLoading } = useQuery<SettlementPreview>({
    queryKey: [`/api/settlements/preview/${locationId}/${selectedDate}`],
  });

  // Cash drawer transactions for the selected date
  const { data: cashDrawerTxns = [] } = useQuery<CashDrawerTransaction[]>({
    queryKey: ["/api/cash-drawer", locationId, selectedDate],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/cash-drawer?locationId=${locationId}&date=${selectedDate}`);
      return res.json();
    },
  });

  // Settlement history
  const { data: history = [] } = useQuery<Settlement[]>({
    queryKey: ["/api/settlements", locationId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/settlements?locationId=${locationId}`);
      return res.json();
    },
  });

  const cashDrawerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cash-drawer", {
        locationId,
        type: cashDrawerType,
        amount: parseFloat(cashDrawerAmount) || 0,
        reason: cashDrawerReason,
        performedBy: "Manager",
        notes: cashDrawerNotes || null,
        date: selectedDate,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-drawer", locationId, selectedDate] });
      queryClient.invalidateQueries({ queryKey: [`/api/settlements/preview/${locationId}/${selectedDate}`] });
      setCashDrawerDialogOpen(false);
      setCashDrawerAmount("");
      setCashDrawerReason("");
      setCashDrawerNotes("");
      toast({
        title: cashDrawerType === "cash_in" ? "Cash In Recorded" : "Cash Out Recorded",
        description: `${formatCurrency(parseFloat(cashDrawerAmount) || 0)} — ${cashDrawerReason}`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteCashDrawerMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/cash-drawer/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-drawer", locationId, selectedDate] });
      queryClient.invalidateQueries({ queryKey: [`/api/settlements/preview/${locationId}/${selectedDate}`] });
    },
  });

  const closeDayMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/settlements", {
        locationId,
        date: selectedDate,
        closedByName: "Manager",
        startingCash: parseFloat(startingCash) || 200,
        actualCash: parseFloat(actualCash) || 0,
        notes: notes || null,
      });
      return res.json();
    },
    onSuccess: (settlement: Settlement) => {
      queryClient.invalidateQueries({ queryKey: [`/api/settlements/check/${locationId}/${selectedDate}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      setCloseDialogOpen(false);
      toast({
        title: "Day Closed",
        description: `Settlement for ${formatDate(selectedDate)} recorded. ${
          (settlement.cashDifference ?? 0) !== 0
            ? `Cash ${(settlement.cashDifference ?? 0) > 0 ? "over" : "short"}: ${formatCurrency(Math.abs(settlement.cashDifference ?? 0))}`
            : "Cash balanced."
        }`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isDayClosed = checkData?.closed;
  const existingSettlement = checkData?.settlement;
  const totalCashIn = preview?.totalCashIn ?? 0;
  const totalCashOut = preview?.totalCashOut ?? 0;
  const expectedCash = preview
    ? Math.round(((parseFloat(startingCash) || 200) + preview.expectedCashFromSales + totalCashIn - totalCashOut) * 100) / 100
    : 0;
  const cashDiff = actualCash
    ? Math.round((parseFloat(actualCash) - expectedCash) * 100) / 100
    : 0;

  const openCloseDialog = () => {
    setActualCash("");
    setNotes("");
    setCloseDialogOpen(true);
  };

  const openCashDrawerDialog = (type: "cash_in" | "cash_out") => {
    setCashDrawerType(type);
    setCashDrawerAmount("");
    setCashDrawerReason("");
    setCashDrawerNotes("");
    setCashDrawerDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4" data-testid="settlement-page">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold">End-of-Day Settlement</h1>
          <p className="text-sm text-muted-foreground">Cash drawer management, close the day, and Z-report</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={historyTab ? "default" : "outline"}
            size="sm"
            onClick={() => setHistoryTab(!historyTab)}
          >
            <FileText className="w-4 h-4 mr-1" />
            {historyTab ? "Back to Today" : "History"}
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[160px] h-8 text-sm"
              data-testid="input-settlement-date"
            />
          </div>
        </div>
      </div>

      {historyTab ? (
        /* ── Settlement History ── */
        <ScrollArea className="flex-1">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Closed By</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Cash</TableHead>
                  <TableHead className="text-right">Card</TableHead>
                  <TableHead className="text-right">Cash Diff</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      No settlement history yet. Close your first day to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((s) => (
                    <TableRow key={s.id} data-testid={`settlement-row-${s.id}`}>
                      <TableCell className="font-medium">{formatDate(s.date)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.closedByName || "—"}</TableCell>
                      <TableCell className="text-right">{s.totalOrders}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(s.totalRevenue || 0)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(s.cashSales || 0)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(s.cardSales || 0)}</TableCell>
                      <TableCell className="text-right">
                        {(s.cashDifference ?? 0) === 0 ? (
                          <Badge variant="secondary" className="text-[10px]">Balanced</Badge>
                        ) : (s.cashDifference ?? 0) > 0 ? (
                          <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                            +{formatCurrency(s.cashDifference!)}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            {formatCurrency(s.cashDifference!)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setViewSettlement(s)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      ) : (
        /* ── Today's View ── */
        <ScrollArea className="flex-1">
          {isDayClosed && existingSettlement ? (
            /* Day already closed */
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 p-4 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">
                    Day Closed
                  </p>
                  <p className="text-sm text-emerald-600/80 dark:text-emerald-400/70">
                    {formatDate(selectedDate)} was closed by {existingSettlement.closedByName || "a manager"}.
                    Revenue: {formatCurrency(existingSettlement.totalRevenue || 0)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setViewSettlement(existingSettlement)}
                >
                  View Report
                </Button>
              </div>
            </div>
          ) : previewLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : preview ? (
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Warnings */}
              {(preview.activeShifts > 0 || preview.unfulfilledOrders > 0) && (
                <div className="space-y-2">
                  {preview.activeShifts > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-sm text-amber-700 dark:text-amber-400">
                        {preview.activeShifts} employee{preview.activeShifts > 1 ? "s" : ""} still clocked in.
                        Clock them out before closing.
                      </span>
                    </div>
                  )}
                  {preview.unfulfilledOrders > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-sm text-amber-700 dark:text-amber-400">
                        {preview.unfulfilledOrders} order{preview.unfulfilledOrders > 1 ? "s" : ""} still
                        open/preparing. Close or cancel them before settling.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Cash Drawer Actions */}
              <Card>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Banknote className="w-4 h-4" /> Cash Drawer
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        onClick={() => openCashDrawerDialog("cash_in")}
                      >
                        <ArrowDownToLine className="w-3 h-3" /> Cash In
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-red-700 border-red-300 hover:bg-red-50"
                        onClick={() => openCashDrawerDialog("cash_out")}
                      >
                        <ArrowUpFromLine className="w-3 h-3" /> Cash Out
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {/* Summary row */}
                  <div className="flex items-center gap-4 mb-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Cash In:</span>
                      <span className="font-mono font-medium text-emerald-700">{formatCurrency(totalCashIn)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Cash Out:</span>
                      <span className="font-mono font-medium text-red-700">{formatCurrency(totalCashOut)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Net:</span>
                      <span className={`font-mono font-medium ${(totalCashIn - totalCashOut) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {(totalCashIn - totalCashOut) >= 0 ? "+" : ""}{formatCurrency(totalCashIn - totalCashOut)}
                      </span>
                    </div>
                  </div>

                  {/* Transaction list */}
                  {cashDrawerTxns.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      No cash drawer transactions today. Use the buttons above to record cash in or cash out.
                    </p>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs">
                            <TableHead className="h-8 text-xs">Time</TableHead>
                            <TableHead className="h-8 text-xs">Type</TableHead>
                            <TableHead className="h-8 text-xs">Reason</TableHead>
                            <TableHead className="h-8 text-xs text-right">Amount</TableHead>
                            <TableHead className="h-8 text-xs w-[40px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cashDrawerTxns.map((txn) => (
                            <TableRow key={txn.id} className="text-xs">
                              <TableCell className="py-1.5">
                                {txn.createdAt ? formatTime(String(txn.createdAt)) : "—"}
                              </TableCell>
                              <TableCell className="py-1.5">
                                {txn.type === "cash_in" ? (
                                  <Badge className="text-[9px] h-4 bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                                    IN
                                  </Badge>
                                ) : (
                                  <Badge className="text-[9px] h-4 bg-red-500/15 text-red-700 border-red-500/30">
                                    OUT
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="py-1.5">
                                {txn.reason}
                                {txn.notes && (
                                  <span className="text-muted-foreground ml-1">— {txn.notes}</span>
                                )}
                              </TableCell>
                              <TableCell className={`py-1.5 text-right font-mono ${txn.type === "cash_in" ? "text-emerald-700" : "text-red-700"}`}>
                                {txn.type === "cash_in" ? "+" : "-"}{formatCurrency(txn.amount)}
                              </TableCell>
                              <TableCell className="py-1.5">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-5 w-5"
                                  onClick={() => setVoidTargetId(txn.id)}
                                >
                                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-3">
                <Card>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className="text-xl font-bold">{formatCurrency(preview.totalRevenue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className="text-xl font-bold">{preview.totalOrders}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Labor Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className="text-xl font-bold">{preview.totalLaborHours}h</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className="text-xl font-bold">{formatCurrency(preview.totalTips)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Breakdown */}
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold">Payment Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Cash</span>
                      </div>
                      <span className="font-mono font-medium">{formatCurrency(preview.cashSales)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">Card (Stripe)</span>
                      </div>
                      <span className="font-mono font-medium">{formatCurrency(preview.cardSales)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-purple-600" />
                        <span className="text-sm">Gift Card</span>
                      </div>
                      <span className="font-mono font-medium">{formatCurrency(preview.giftCardSales)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-orange-600" />
                        <span className="text-sm">Delivery Apps</span>
                      </div>
                      <span className="font-mono font-medium">{formatCurrency(preview.externalSales)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Tax Collected</span>
                      </div>
                      <span className="font-mono font-medium">{formatCurrency(preview.totalTax)}</span>
                    </div>
                    {preview.cancelledOrders > 0 && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-destructive" />
                          <span className="text-sm">
                            Cancelled ({preview.cancelledOrders} order{preview.cancelledOrders > 1 ? "s" : ""})
                          </span>
                        </div>
                        <span className="font-mono font-medium text-destructive">
                          -{formatCurrency(preview.totalRefunds)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-2 font-semibold text-base">
                      <span>Total Revenue</span>
                      <span className="font-mono">{formatCurrency(preview.totalRevenue)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Close Day Button */}
              <div className="flex justify-center pt-2 pb-4">
                <Button
                  size="lg"
                  className="px-8 h-12 text-base gap-2"
                  onClick={openCloseDialog}
                  data-testid="button-close-day"
                >
                  <Lock className="w-5 h-5" />
                  Close Day — {formatDate(selectedDate)}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <FileText className="w-10 h-10 mb-3 opacity-30" />
              <p>Select a date to view the Z-report</p>
            </div>
          )}
        </ScrollArea>
      )}

      {/* ── Manager PIN for Void ── */}
      <ManagerPinDialog
        open={voidTargetId !== null}
        onOpenChange={(open) => { if (!open) setVoidTargetId(null); }}
        actionDescription="Void cash drawer transaction"
        onAuthorized={(user) => {
          if (voidTargetId !== null) {
            deleteCashDrawerMutation.mutate(voidTargetId);
            toast({ title: "Transaction Voided", description: `Authorized by ${user.name}` });
          }
          setVoidTargetId(null);
        }}
      />

      {/* ── Cash In/Out Dialog ── */}
      <Dialog open={cashDrawerDialogOpen} onOpenChange={setCashDrawerDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {cashDrawerType === "cash_in" ? (
                <>
                  <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
                  Cash In
                </>
              ) : (
                <>
                  <ArrowUpFromLine className="w-5 h-5 text-red-600" />
                  Cash Out
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {cashDrawerType === "cash_in"
                ? "Record cash being added to the register drawer."
                : "Record cash being removed from the register drawer."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={cashDrawerAmount}
                onChange={(e) => setCashDrawerAmount(e.target.value)}
                className="mt-1 text-lg font-mono h-11"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Select value={cashDrawerReason} onValueChange={setCashDrawerReason}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {(cashDrawerType === "cash_in" ? CASH_IN_REASONS : CASH_OUT_REASONS).map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input
                value={cashDrawerNotes}
                onChange={(e) => setCashDrawerNotes(e.target.value)}
                placeholder="Additional details..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashDrawerDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => cashDrawerMutation.mutate()}
              disabled={!cashDrawerAmount || !cashDrawerReason || parseFloat(cashDrawerAmount) <= 0 || cashDrawerMutation.isPending}
              className={`gap-1.5 ${cashDrawerType === "cash_in" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
            >
              {cashDrawerMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : cashDrawerType === "cash_in" ? (
                <ArrowDownToLine className="w-4 h-4" />
              ) : (
                <ArrowUpFromLine className="w-4 h-4" />
              )}
              {cashDrawerType === "cash_in" ? "Record Cash In" : "Record Cash Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Close Day Dialog ── */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Close Day — {formatDate(selectedDate)}
            </DialogTitle>
            <DialogDescription>
              Count the cash in the register and enter it below to close the day.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Cash Reconciliation */}
            <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Banknote className="w-4 h-4" /> Cash Reconciliation
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Starting Cash</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={startingCash}
                    onChange={(e) => setStartingCash(e.target.value)}
                    className="mt-1"
                    data-testid="input-starting-cash"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Cash Sales Today</label>
                  <div className="mt-1 h-9 flex items-center px-3 rounded-md border bg-muted text-sm font-mono">
                    {formatCurrency(preview?.expectedCashFromSales ?? 0)}
                  </div>
                </div>
              </div>

              {/* Cash In/Out summary in reconciliation */}
              {(totalCashIn > 0 || totalCashOut > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Cash In (Added)</label>
                    <div className="mt-1 h-9 flex items-center px-3 rounded-md border bg-muted text-sm font-mono text-emerald-700">
                      +{formatCurrency(totalCashIn)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Cash Out (Removed)</label>
                    <div className="mt-1 h-9 flex items-center px-3 rounded-md border bg-muted text-sm font-mono text-red-700">
                      -{formatCurrency(totalCashOut)}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Expected Cash in Drawer</span>
                  <span className="font-mono font-semibold text-base">{formatCurrency(expectedCash)}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Actual Cash Counted</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Count the cash and enter amount..."
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="mt-1 text-lg font-mono h-11"
                  autoFocus
                  data-testid="input-actual-cash"
                />
              </div>

              {actualCash && (
                <div
                  className={`flex items-center justify-between p-2.5 rounded-md ${
                    cashDiff === 0
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : cashDiff > 0
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <span className="text-sm font-medium">
                    {cashDiff === 0
                      ? "Cash Balanced"
                      : cashDiff > 0
                      ? "Cash Over"
                      : "Cash Short"}
                  </span>
                  <span className="font-mono font-bold text-lg">
                    {cashDiff === 0
                      ? "$0.00"
                      : cashDiff > 0
                      ? `+${formatCurrency(cashDiff)}`
                      : formatCurrency(cashDiff)}
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about today (e.g., events, issues, discrepancies)..."
                className="mt-1"
                rows={2}
                data-testid="input-settlement-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => closeDayMutation.mutate()}
              disabled={!actualCash || closeDayMutation.isPending}
              className="gap-1.5"
              data-testid="button-confirm-close-day"
            >
              {closeDayMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              Close Day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Settlement Detail Dialog ── */}
      <Dialog open={!!viewSettlement} onOpenChange={() => setViewSettlement(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          {viewSettlement && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Z-Report — {formatDate(viewSettlement.date)}
                </DialogTitle>
                <DialogDescription>
                  Closed by {viewSettlement.closedByName || "Unknown"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Revenue Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-lg font-bold font-mono">{formatCurrency(viewSettlement.totalRevenue || 0)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs text-muted-foreground">Orders</p>
                    <p className="text-lg font-bold">{viewSettlement.totalOrders || 0}</p>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold">Payment Breakdown</h3>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Cash</span><span className="font-mono">{formatCurrency(viewSettlement.cashSales || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Card</span><span className="font-mono">{formatCurrency(viewSettlement.cardSales || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Gift Card</span><span className="font-mono">{formatCurrency(viewSettlement.giftCardSales || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Delivery Apps</span><span className="font-mono">{formatCurrency(viewSettlement.externalSales || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="font-mono">{formatCurrency(viewSettlement.totalTax || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Tips</span><span className="font-mono">{formatCurrency(viewSettlement.totalTips || 0)}</span></div>
                    {(viewSettlement.cancelledOrders ?? 0) > 0 && (
                      <div className="flex justify-between text-destructive">
                        <span>Cancelled ({viewSettlement.cancelledOrders})</span>
                        <span className="font-mono">-{formatCurrency(viewSettlement.totalRefunds || 0)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cash Reconciliation */}
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold">Cash Reconciliation</h3>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Starting Cash</span><span className="font-mono">{formatCurrency(viewSettlement.startingCash || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Expected</span><span className="font-mono">{formatCurrency(viewSettlement.expectedCash || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Actual Counted</span><span className="font-mono">{formatCurrency(viewSettlement.actualCash || 0)}</span></div>
                    <div className="flex justify-between font-medium pt-1 border-t">
                      <span>{(viewSettlement.cashDifference ?? 0) >= 0 ? "Over" : "Short"}</span>
                      <span className={`font-mono ${(viewSettlement.cashDifference ?? 0) < 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {(viewSettlement.cashDifference ?? 0) >= 0 ? "+" : ""}{formatCurrency(viewSettlement.cashDifference || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Labor */}
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold">Labor</h3>
                  <div className="text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Hours</span><span>{viewSettlement.totalLaborHours || 0}h</span></div>
                  </div>
                </div>

                {/* Notes */}
                {viewSettlement.notes && (
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold">Notes</h3>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">{viewSettlement.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
