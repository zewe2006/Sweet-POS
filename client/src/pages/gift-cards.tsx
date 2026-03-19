import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Gift,
  Search,
  Plus,
  CreditCard,
  DollarSign,
  Copy,
  RefreshCw,
  Loader2,
  Wallet,
} from "lucide-react";
import type { GiftCard, CustomerTransaction } from "@shared/schema";

const issueCardSchema = z.object({
  initialValue: z.coerce.number().min(1, "Must be at least $1"),
  purchasedBy: z.string().optional(),
  recipientName: z.string().optional(),
  recipientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
});

type IssueCardFormValues = z.infer<typeof issueCardSchema>;

function getCardStatus(card: GiftCard): { label: string; className: string } {
  if (!card.isActive) {
    return { label: "Inactive", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };
  }
  if (card.balance === 0) {
    return { label: "Empty", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
  }
  return { label: "Active", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
}

export default function GiftCards() {
  const { toast } = useToast();
  const [issueOpen, setIssueOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lookupCode, setLookupCode] = useState("");
  const [reloadAmount, setReloadAmount] = useState("");
  const [reloadOpen, setReloadOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  const { data: giftCards = [], isLoading } = useQuery<GiftCard[]>({
    queryKey: ["/api/gift-cards"],
  });

  const { data: cardTransactions = [] } = useQuery<CustomerTransaction[]>({
    queryKey: ["/api/transactions", { giftCardId: selectedCard?.id }],
    queryFn: async () => {
      if (!selectedCard) return [];
      const res = await apiRequest("GET", `/api/transactions?giftCardId=${selectedCard.id}`);
      return res.json();
    },
    enabled: !!selectedCard,
  });

  // Stats
  const stats = useMemo(() => {
    const activeCards = giftCards.filter((c) => c.isActive && c.balance > 0);
    const totalBalance = activeCards.reduce((sum, c) => sum + c.balance, 0);
    return {
      activeCount: activeCards.length,
      totalBalance,
      totalIssued: giftCards.length,
    };
  }, [giftCards]);

  const form = useForm<IssueCardFormValues>({
    resolver: zodResolver(issueCardSchema),
    defaultValues: {
      initialValue: 25,
      purchasedBy: "",
      recipientName: "",
      recipientEmail: "",
    },
  });

  const issueMutation = useMutation({
    mutationFn: async (data: IssueCardFormValues) => {
      const res = await apiRequest("POST", "/api/gift-cards", {
        ...data,
        purchasedBy: data.purchasedBy || undefined,
        recipientName: data.recipientName || undefined,
        recipientEmail: data.recipientEmail || undefined,
      });
      return res.json();
    },
    onSuccess: (card) => {
      toast({ title: "Gift Card Issued", description: `Card ${card.code} created with $${card.initialValue.toFixed(2)} balance.` });
      setIssueOpen(false);
      form.reset({ initialValue: 25, purchasedBy: "", recipientName: "", recipientEmail: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/gift-cards"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const reloadMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) => {
      const res = await apiRequest("POST", `/api/gift-cards/${id}/reload`, { amount });
      return res.json();
    },
    onSuccess: (updatedCard) => {
      toast({ title: "Card Reloaded", description: `New balance: $${updatedCard.balance.toFixed(2)}` });
      setReloadOpen(false);
      setReloadAmount("");
      setSelectedCard(updatedCard);
      queryClient.invalidateQueries({ queryKey: ["/api/gift-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCardClick = (card: GiftCard) => {
    setSelectedCard(card);
    setSheetOpen(true);
  };

  const handleLookup = async () => {
    if (!lookupCode.trim()) return;
    try {
      const res = await apiRequest("GET", `/api/gift-cards/lookup/${encodeURIComponent(lookupCode.trim())}`);
      const card: GiftCard = await res.json();
      setSelectedCard(card);
      setSheetOpen(true);
      setLookupCode("");
    } catch (err: any) {
      toast({ title: "Not Found", description: "No gift card found with that code.", variant: "destructive" });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast({ title: "Copied", description: "Gift card code copied to clipboard." });
    }).catch(() => {
      // clipboard might not be available in sandbox
    });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full p-4" data-testid="gift-cards-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Gift Cards</h1>
        <div className="flex items-center gap-2">
          {/* Lookup */}
          <div className="relative flex items-center gap-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Enter card code..."
                className="pl-9 w-[200px] h-8 text-sm font-mono"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                data-testid="input-lookup-code"
              />
            </div>
            <Button size="sm" variant="outline" onClick={handleLookup} data-testid="button-lookup-card">
              Look Up
            </Button>
          </div>
          <Button size="sm" onClick={() => setIssueOpen(true)} data-testid="button-issue-card">
            <Plus className="w-4 h-4 mr-1.5" />
            Issue New Card
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="text-lg font-bold" data-testid="text-active-cards">{stats.activeCount}</div>
              <div className="text-[10px] text-muted-foreground">Active Cards</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-bold" data-testid="text-total-balance">${stats.totalBalance.toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground">Total Balance Outstanding</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Gift className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="text-lg font-bold" data-testid="text-total-issued">{stats.totalIssued}</div>
              <div className="text-[10px] text-muted-foreground">Cards Issued (All Time)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gift Cards Table */}
      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Code</TableHead>
                <TableHead className="w-[130px] text-right">Balance / Initial</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Purchased By</TableHead>
                <TableHead className="w-[80px] text-center">Status</TableHead>
                <TableHead className="w-[100px]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : giftCards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No gift cards issued yet
                  </TableCell>
                </TableRow>
              ) : (
                giftCards.map((card) => {
                  const status = getCardStatus(card);
                  return (
                    <TableRow
                      key={card.id}
                      className="cursor-pointer"
                      onClick={() => handleCardClick(card)}
                      data-testid={`gift-card-row-${card.id}`}
                    >
                      <TableCell className="font-mono text-sm font-medium">{card.code}</TableCell>
                      <TableCell className="text-right text-sm">
                        <span className="font-medium">${card.balance.toFixed(2)}</span>
                        <span className="text-muted-foreground"> / ${card.initialValue.toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="text-sm">{card.recipientName || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{card.purchasedBy || "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className={`text-[10px] ${status.className}`}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(card.createdAt)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Issue Card Dialog */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue New Gift Card</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => issueMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="initialValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <div className="flex gap-2 mb-2">
                      {[25, 50, 100].map((amount) => (
                        <Button
                          key={amount}
                          type="button"
                          variant={field.value === amount ? "default" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            field.onChange(amount);
                            setCustomAmount("");
                          }}
                          data-testid={`button-preset-${amount}`}
                        >
                          ${amount}
                        </Button>
                      ))}
                      <Input
                        type="number"
                        placeholder="Custom"
                        className="flex-1 h-8 text-sm"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value);
                          if (e.target.value) {
                            field.onChange(parseFloat(e.target.value));
                          }
                        }}
                        data-testid="input-custom-amount"
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchasedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchased By</FormLabel>
                    <FormControl>
                      <Input placeholder="Buyer name" {...field} data-testid="input-purchased-by" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recipientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Recipient name (optional)" {...field} data-testid="input-recipient-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recipientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email (optional)" {...field} data-testid="input-recipient-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIssueOpen(false)} data-testid="button-cancel-issue">
                  Cancel
                </Button>
                <Button type="submit" disabled={issueMutation.isPending} data-testid="button-confirm-issue">
                  {issueMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Gift className="w-4 h-4 mr-1.5" />
                  )}
                  Issue Card
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Card Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[440px] sm:w-[480px] p-0 flex flex-col">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Gift Card Details
            </SheetTitle>
          </SheetHeader>
          {selectedCard && (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Balance display */}
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl font-bold" data-testid="text-card-balance">
                      ${selectedCard.balance.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      of ${selectedCard.initialValue.toFixed(2)} original value
                    </div>
                    <div className="mt-3">
                      <Badge variant="secondary" className={`${getCardStatus(selectedCard).className}`}>
                        {getCardStatus(selectedCard).label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Code */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Card Code</div>
                        <div className="text-xl font-mono font-bold tracking-wider" data-testid="text-card-code">
                          {selectedCard.code}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyCode(selectedCard.code)}
                        data-testid="button-copy-code"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Card info */}
                <Card>
                  <CardContent className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recipient</span>
                      <span className="font-medium">{selectedCard.recipientName || "—"}</span>
                    </div>
                    {selectedCard.recipientEmail && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-medium">{selectedCard.recipientEmail}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Purchased By</span>
                      <span className="font-medium">{selectedCard.purchasedBy || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">{formatDate(selectedCard.createdAt)}</span>
                    </div>
                    {selectedCard.expiresAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expires</span>
                        <span className="font-medium">{formatDate(selectedCard.expiresAt)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Reload Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setReloadOpen(true)}
                  disabled={!selectedCard.isActive}
                  data-testid="button-reload-card"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Reload Card
                </Button>

                {/* Transaction History */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Transaction History</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[110px]">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cardTransactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                              No transactions
                            </TableCell>
                          </TableRow>
                        ) : (
                          cardTransactions.map((txn) => (
                            <TableRow key={txn.id} data-testid={`gc-txn-row-${txn.id}`}>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] capitalize">
                                  {(txn.type || "").replace(/_/g, " ")}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {txn.amount != null ? (
                                  <span className={txn.type === "gift_card_use" ? "text-red-600" : "text-green-600"}>
                                    {txn.type === "gift_card_use" ? "-" : "+"}${Math.abs(txn.amount).toFixed(2)}
                                  </span>
                                ) : "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground truncate max-w-[140px]">
                                {txn.description || "—"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatDateTime(txn.createdAt)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* Reload Dialog */}
      <Dialog open={reloadOpen} onOpenChange={setReloadOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reload Gift Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Card: <span className="font-mono font-medium text-foreground">{selectedCard?.code}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Current balance: <span className="font-semibold text-foreground">${selectedCard?.balance.toFixed(2)}</span>
            </div>
            <div>
              <label className="text-sm font-medium">Amount to add</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={reloadAmount}
                onChange={(e) => setReloadAmount(e.target.value)}
                className="mt-1"
                data-testid="input-reload-amount"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReloadOpen(false)} data-testid="button-cancel-reload">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const amt = parseFloat(reloadAmount);
                  if (amt > 0 && selectedCard) {
                    reloadMutation.mutate({ id: selectedCard.id, amount: amt });
                  }
                }}
                disabled={!reloadAmount || parseFloat(reloadAmount) <= 0 || reloadMutation.isPending}
                data-testid="button-confirm-reload"
              >
                {reloadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                )}
                Reload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
