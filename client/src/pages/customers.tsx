import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  Search,
  Plus,
  UserPlus,
  Award,
  TrendingUp,
  Calendar,
  DollarSign,
  Coins,
} from "lucide-react";
import type { Customer, CustomerTransaction, RewardConfig } from "@shared/schema";

const tierColors: Record<string, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2",
};

const tierTextColors: Record<string, string> = {
  bronze: "#8B5E20",
  silver: "#606060",
  gold: "#B8860B",
  platinum: "#707070",
};

function TierBadge({ tier }: { tier: string }) {
  return (
    <Badge
      className="text-[10px] font-semibold capitalize border-0"
      style={{
        backgroundColor: tierColors[tier] || tierColors.bronze,
        color: ["gold", "silver", "platinum"].includes(tier) ? tierTextColors[tier] || "#333" : "#fff",
        border: tier === "platinum" ? "1px solid #B0B0B0" : undefined,
      }}
      data-testid={`badge-tier-${tier}`}
    >
      {tier}
    </Badge>
  );
}

const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function Customers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [adjustPointsOpen, setAdjustPointsOpen] = useState(false);
  const [adjustPointsValue, setAdjustPointsValue] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers", { search: debouncedSearch }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/customers?search=${encodeURIComponent(debouncedSearch)}`);
      return res.json();
    },
  });

  const { data: rewardConfig } = useQuery<RewardConfig>({
    queryKey: ["/api/rewards/config"],
  });

  const { data: customerTransactions = [] } = useQuery<CustomerTransaction[]>({
    queryKey: ["/api/transactions", { customerId: selectedCustomer?.id }],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const res = await apiRequest("GET", `/api/transactions?customerId=${selectedCustomer.id}`);
      return res.json();
    },
    enabled: !!selectedCustomer,
  });

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      const res = await apiRequest("POST", "/api/customers", {
        ...data,
        email: data.email || undefined,
        phone: data.phone || undefined,
        notes: data.notes || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Customer Created", description: "New customer has been added." });
      setDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CustomerFormValues }) => {
      const res = await apiRequest("PATCH", `/api/customers/${id}`, {
        ...data,
        email: data.email || undefined,
        phone: data.phone || undefined,
        notes: data.notes || undefined,
      });
      return res.json();
    },
    onSuccess: (updatedCustomer) => {
      toast({ title: "Customer Updated", description: "Changes saved." });
      setDialogOpen(false);
      setEditingCustomer(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      if (selectedCustomer && selectedCustomer.id === updatedCustomer.id) {
        setSelectedCustomer(updatedCustomer);
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async ({ id, points }: { id: number; points: number }) => {
      const res = await apiRequest("POST", `/api/customers/${id}/redeem`, { points });
      return res.json();
    },
    onSuccess: (updatedCustomer) => {
      toast({ title: "Points Adjusted", description: "Points have been redeemed." });
      setAdjustPointsOpen(false);
      setAdjustPointsValue("");
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setSelectedCustomer(updatedCustomer);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    form.reset({ name: "", phone: "", email: "", notes: "" });
    setDialogOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      notes: customer.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (data: CustomerFormValues) => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleRowClick = async (customer: Customer) => {
    try {
      const res = await apiRequest("GET", `/api/customers/${customer.id}`);
      const detail: Customer = await res.json();
      setSelectedCustomer(detail);
      setSheetOpen(true);
    } catch {
      setSelectedCustomer(customer);
      setSheetOpen(true);
    }
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

  const getNextTierInfo = (customer: Customer) => {
    if (!rewardConfig) return null;
    const { lifetimePoints = 0 } = customer;
    const tier = customer.tier || "bronze";
    if (tier === "platinum") return { nextTier: null, progress: 100, remaining: 0 };
    const thresholds: Record<string, { next: string; threshold: number }> = {
      bronze: { next: "silver", threshold: rewardConfig.silverThreshold || 500 },
      silver: { next: "gold", threshold: rewardConfig.goldThreshold || 2000 },
      gold: { next: "platinum", threshold: rewardConfig.platinumThreshold || 5000 },
    };
    const info = thresholds[tier];
    if (!info) return null;
    const progress = Math.min(100, Math.round((lifetimePoints / info.threshold) * 100));
    return { nextTier: info.next, progress, remaining: Math.max(0, info.threshold - lifetimePoints) };
  };

  const getPointsValue = (points: number) => {
    if (!rewardConfig) return 0;
    const ppr = rewardConfig.pointsPerReward || 100;
    const rv = rewardConfig.rewardValue || 1;
    return Math.floor(points / ppr) * rv;
  };

  return (
    <div className="flex flex-col h-full p-4" data-testid="customers-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Customers</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search name, phone, email..."
              className="pl-9 w-[260px] h-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-customers"
            />
          </div>
          <Button size="sm" onClick={handleOpenCreate} data-testid="button-add-customer">
            <UserPlus className="w-4 h-4 mr-1.5" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Customer Table */}
      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[110px]">Phone</TableHead>
                <TableHead className="w-[160px]">Email</TableHead>
                <TableHead className="w-[80px] text-center">Tier</TableHead>
                <TableHead className="w-[70px] text-right">Points</TableHead>
                <TableHead className="w-[60px] text-center">Visits</TableHead>
                <TableHead className="w-[100px]">Last Visit</TableHead>
                <TableHead className="w-[100px] text-right">Lifetime Spend</TableHead>
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
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {debouncedSearch ? "No customers match your search" : "No customers yet"}
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(customer)}
                    data-testid={`customer-row-${customer.id}`}
                  >
                    <TableCell className="font-medium text-sm">{customer.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{customer.phone || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[160px]">{customer.email || "—"}</TableCell>
                    <TableCell className="text-center">
                      <TierBadge tier={customer.tier || "bronze"} />
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">{customer.rewardPoints ?? 0}</TableCell>
                    <TableCell className="text-center text-sm">{customer.visitCount ?? 0}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(customer.lastVisit)}</TableCell>
                    <TableCell className="text-right text-sm">${(customer.lifetimeSpend ?? 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Add/Edit Customer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} data-testid="input-customer-form-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} data-testid="input-customer-form-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email address" {...field} data-testid="input-customer-form-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Customer notes..." rows={3} {...field} data-testid="input-customer-form-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-customer">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-customer"
                >
                  {editingCustomer ? "Save Changes" : "Add Customer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[440px] sm:w-[480px] p-0 flex flex-col">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="flex items-center gap-2">
              {selectedCustomer?.name}
              {selectedCustomer && <TierBadge tier={selectedCustomer.tier || "bronze"} />}
            </SheetTitle>
          </SheetHeader>
          {selectedCustomer && (
            <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
              <TabsList className="mx-4 w-fit shrink-0">
                <TabsTrigger value="overview" data-testid="tab-customer-overview">Overview</TabsTrigger>
                <TabsTrigger value="history" data-testid="tab-customer-history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex-1 min-h-0 mt-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {/* Contact info */}
                    <Card>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Phone:</span>{" "}
                              <span className="font-medium">{selectedCustomer.phone || "—"}</span>
                            </div>
                            <div className="text-sm mt-1">
                              <span className="text-muted-foreground">Email:</span>{" "}
                              <span className="font-medium">{selectedCustomer.email || "—"}</span>
                            </div>
                            <div className="text-sm mt-1">
                              <span className="text-muted-foreground">Member since:</span>{" "}
                              <span className="font-medium">{formatDate(selectedCustomer.createdAt)}</span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(selectedCustomer);
                            }}
                            data-testid="button-edit-customer"
                          >
                            Edit
                          </Button>
                        </div>
                        {selectedCustomer.notes && (
                          <p className="text-xs text-muted-foreground border-t pt-2 mt-2">{selectedCustomer.notes}</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Tier Progress */}
                    {(() => {
                      const tierInfo = getNextTierInfo(selectedCustomer);
                      if (!tierInfo) return null;
                      return (
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Tier Progress</span>
                              <TierBadge tier={selectedCustomer.tier || "bronze"} />
                            </div>
                            {tierInfo.nextTier ? (
                              <>
                                <Progress value={tierInfo.progress} className="h-2" />
                                <p className="text-xs text-muted-foreground mt-1.5">
                                  {tierInfo.remaining.toLocaleString()} points to{" "}
                                  <span className="capitalize font-medium" style={{ color: tierColors[tierInfo.nextTier] }}>
                                    {tierInfo.nextTier}
                                  </span>
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground">Highest tier achieved!</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })()}

                    {/* Points Summary */}
                    <div className="grid grid-cols-3 gap-3">
                      <Card>
                        <CardContent className="p-3 text-center">
                          <Coins className="w-5 h-5 mx-auto text-primary mb-1" />
                          <div className="text-lg font-bold" data-testid="text-current-points">
                            {(selectedCustomer.rewardPoints ?? 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Current Points</div>
                          <div className="text-xs font-medium text-primary mt-0.5">
                            ≈ ${getPointsValue(selectedCustomer.rewardPoints ?? 0).toFixed(2)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <TrendingUp className="w-5 h-5 mx-auto text-green-600 mb-1" />
                          <div className="text-lg font-bold">
                            {(selectedCustomer.lifetimePoints ?? 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Lifetime Points</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <DollarSign className="w-5 h-5 mx-auto text-amber-600 mb-1" />
                          <div className="text-lg font-bold">
                            ${(selectedCustomer.lifetimeSpend ?? 0).toFixed(0)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Lifetime Spend</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Quick Actions */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="text-sm font-medium">Quick Actions</div>
                            <p className="text-xs text-muted-foreground">Manage reward points</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAdjustPointsOpen(true)}
                            data-testid="button-adjust-points"
                          >
                            <Award className="w-3.5 h-3.5 mr-1" />
                            Adjust Points
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Visit stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-semibold">{selectedCustomer.visitCount ?? 0}</div>
                              <div className="text-[10px] text-muted-foreground">Total Visits</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-semibold">{formatDate(selectedCustomer.lastVisit)}</div>
                              <div className="text-[10px] text-muted-foreground">Last Visit</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="history" className="flex-1 min-h-0 mt-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Points</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[110px]">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerTransactions.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                                No transactions yet
                              </TableCell>
                            </TableRow>
                          ) : (
                            customerTransactions.slice(0, 20).map((txn) => (
                              <TableRow key={txn.id} data-testid={`txn-row-${txn.id}`}>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] capitalize">
                                    {(txn.type || "").replace(/_/g, " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {txn.points != null ? (
                                    <span className={txn.points >= 0 ? "text-green-600" : "text-red-600"}>
                                      {txn.points >= 0 ? "+" : ""}{txn.points}
                                    </span>
                                  ) : "—"}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {txn.amount != null ? `$${txn.amount.toFixed(2)}` : "—"}
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
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      {/* Adjust Points Dialog */}
      <Dialog open={adjustPointsOpen} onOpenChange={setAdjustPointsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Points</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Current balance: <span className="font-semibold text-foreground">{(selectedCustomer?.rewardPoints ?? 0).toLocaleString()} pts</span>
            </div>
            <div>
              <label className="text-sm font-medium">Points to redeem</label>
              <Input
                type="number"
                placeholder="Enter points"
                value={adjustPointsValue}
                onChange={(e) => setAdjustPointsValue(e.target.value)}
                className="mt-1"
                data-testid="input-adjust-points"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAdjustPointsOpen(false)} data-testid="button-cancel-adjust">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const pts = parseInt(adjustPointsValue);
                  if (pts > 0 && selectedCustomer) {
                    redeemMutation.mutate({ id: selectedCustomer.id, points: pts });
                  }
                }}
                disabled={!adjustPointsValue || parseInt(adjustPointsValue) <= 0 || redeemMutation.isPending}
                data-testid="button-confirm-adjust"
              >
                Redeem Points
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
