import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ModifierModal } from "@/components/modifier-modal";
import { useOnlineStatus, type PendingOrder } from "@/hooks/use-online-status";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  X,
  Star,
  LockOpen,
  Gift,
  UserSearch,
  Loader2,
  WifiOff,
  Wifi,
  CloudUpload,
  Clock,
  Send,
} from "lucide-react";
import type { MenuItem, MenuCategory, Customer, GiftCard } from "@shared/schema";

interface CartItem {
  menuItemId: number;
  name: string;
  nameZh: string | null;
  unitPrice: number;
  quantity: number;
  modifiers: { name: string; price: number }[];
  key: string;
}

type OrderType = "dine_in" | "takeout" | "pickup" | "delivery";

export default function POS({ locationId }: { locationId: number }) {
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [customerName, setCustomerName] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [tipPercent, setTipPercent] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null);
  const [modifierOpen, setModifierOpen] = useState(false);
  // Loyalty member
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<Customer | null>(null);
  const [loyaltySearchOpen, setLoyaltySearchOpen] = useState(false);
  const [loyaltyPhone, setLoyaltyPhone] = useState("");
  const [loyaltySearching, setLoyaltySearching] = useState(false);
  // Gift card payment
  const [giftCardDialogOpen, setGiftCardDialogOpen] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardLookingUp, setGiftCardLookingUp] = useState(false);
  const [foundGiftCard, setFoundGiftCard] = useState<GiftCard | null>(null);

  // Offline mode
  const {
    isOnline,
    pendingOrders,
    pendingCount,
    isSyncing,
    addPendingOrder,
    syncPendingOrders,
    clearSynced,
  } = useOnlineStatus();

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPendingOrders().then((result) => {
        if (result.synced > 0) {
          toast({
            title: "Orders Synced",
            description: `${result.synced} offline order${result.synced > 1 ? "s" : ""} synced (payments processed)${result.failed > 0 ? `. ${result.failed} failed.` : "."}`,
          });
          clearSynced();
          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
          queryClient.invalidateQueries({ queryKey: ["/api/gift-cards"] });
        }
        if (result.failed > 0 && result.errors?.length) {
          toast({
            title: "Some Orders Failed to Sync",
            description: result.errors[0],
            variant: "destructive",
          });
        }
      });
    }
  }, [isOnline]);

  const { data: categories = [] } = useQuery<MenuCategory[]>({
    queryKey: ["/api/menu/categories"],
  });

  const { data: allItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/items"],
  });

  const { data: modifierGroups = [] } = useQuery<any[]>({
    queryKey: ["/api/menu/modifiers"],
  });

  const filteredItems = useMemo(() => {
    let items = allItems.filter((i) => i.isAvailable);
    if (activeCategory !== null) {
      items = items.filter((i) => i.categoryId === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.nameZh && i.nameZh.includes(q))
      );
    }
    return items;
  }, [allItems, activeCategory, searchQuery]);

  const handleItemClick = (item: MenuItem) => {
    const hasModifiers = item.modifierGroups && item.modifierGroups.length > 0;
    if (hasModifiers) {
      setModifierItem(item);
      setModifierOpen(true);
    } else {
      addToCart(item, []);
    }
  };

  const addToCart = (item: MenuItem, mods: { name: string; price: number }[]) => {
    const modKey = mods.map((m) => m.name).sort().join(",");
    const key = `${item.id}-${modKey}`;
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        return prev.map((c) =>
          c.key === key ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          nameZh: item.nameZh,
          unitPrice: item.price,
          quantity: 1,
          modifiers: mods,
          key,
        },
      ];
    });
  };

  const updateQuantity = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.key === key ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const removeItem = (key: string) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  };

  const subtotal = cart.reduce(
    (sum, c) =>
      sum +
      (c.unitPrice + c.modifiers.reduce((ms, m) => ms + m.price, 0)) *
        c.quantity,
    0
  );
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const tip = Math.round(subtotal * (tipPercent / 100) * 100) / 100;
  const total = Math.round((subtotal + tax + tip) * 100) / 100;

  const createOrderMutation = useMutation({
    mutationFn: async (paymentMethod: string) => {
      const res = await apiRequest("POST", "/api/orders", {
        locationId,
        source: "pos",
        type: orderType,
        customerName: customerName || undefined,
        notes: orderNotes || undefined,
        paymentMethod,
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
          modifiers: c.modifiers,
        })),
      });
      return res.json();
    },
    onSuccess: async (order) => {
      // Auto-earn loyalty points
      if (loyaltyCustomer) {
        try {
          await apiRequest("POST", `/api/customers/${loyaltyCustomer.id}/earn`, {
            orderId: order.id,
            amount: order.subtotal,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
        } catch {
          // silently fail — order was still placed
        }
      }
      toast({
        title: "Order Created",
        description: `Order ${order.orderNumber} — $${order.total.toFixed(2)}${loyaltyCustomer ? " (points earned)" : ""}`,
      });
      setCart([]);
      setCustomerName("");
      setOrderNotes("");
      setTipPercent(0);
      setLoyaltyCustomer(null);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Offline order — queues locally for ANY payment type (cash, card, gift card)
  // Payments are processed server-side when connection restores
  const handleOfflineOrder = (paymentMethod: string, giftCard?: GiftCard) => {
    if (cart.length === 0) return;

    const paymentLabel = paymentMethod === "stripe" ? "card" : paymentMethod === "gift_card" ? "gift card" : "cash";

    const offlineOrder: PendingOrder = {
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      locationId,
      source: "pos",
      type: orderType,
      customerName: customerName || undefined,
      orderNotes: orderNotes || undefined,
      paymentMethod,
      items: cart.map((c) => ({
        menuItemId: c.menuItemId,
        quantity: c.quantity,
        modifiers: c.modifiers,
      })),
      subtotal,
      tax,
      tip,
      total,
      synced: false,
      loyaltyCustomerId: loyaltyCustomer?.id,
      loyaltyEarnAmount: loyaltyCustomer ? subtotal : undefined,
      giftCardId: giftCard?.id,
      giftCardCode: giftCard?.code,
    };

    addPendingOrder(offlineOrder);

    toast({
      title: "Offline Order Queued",
      description: `$${total.toFixed(2)} ${paymentLabel} order saved. Will process when back online.`,
    });

    setCart([]);
    setCustomerName("");
    setOrderNotes("");
    setTipPercent(0);
    setLoyaltyCustomer(null);
  };

  const handleLoyaltySearch = async () => {
    if (!loyaltyPhone.trim()) return;
    setLoyaltySearching(true);
    try {
      const res = await apiRequest("GET", `/api/customers/lookup/phone/${encodeURIComponent(loyaltyPhone.trim())}`);
      const customer: Customer = await res.json();
      setLoyaltyCustomer(customer);
      setCustomerName(customer.name);
      setLoyaltySearchOpen(false);
      setLoyaltyPhone("");
      toast({ title: "Member Found", description: `${customer.name} — ${customer.rewardPoints ?? 0} points` });
    } catch {
      toast({ title: "Not Found", description: "No loyalty member found with that phone number.", variant: "destructive" });
    } finally {
      setLoyaltySearching(false);
    }
  };

  const handleGiftCardLookup = async () => {
    if (!giftCardCode.trim()) return;
    setGiftCardLookingUp(true);
    setFoundGiftCard(null);
    try {
      const res = await apiRequest("GET", `/api/gift-cards/lookup/${encodeURIComponent(giftCardCode.trim())}`);
      const card: GiftCard = await res.json();
      setFoundGiftCard(card);
    } catch {
      toast({ title: "Not Found", description: "No gift card found with that code.", variant: "destructive" });
    } finally {
      setGiftCardLookingUp(false);
    }
  };

  const handleGiftCardPay = async () => {
    if (!foundGiftCard || cart.length === 0) return;
    if (foundGiftCard.balance < total) {
      toast({
        title: "Insufficient Balance",
        description: `Gift card balance ($${foundGiftCard.balance.toFixed(2)}) is less than the total ($${total.toFixed(2)}). Remaining: $${(total - foundGiftCard.balance).toFixed(2)} needed.`,
        variant: "destructive",
      });
      return;
    }

    // Offline: queue the gift card order for later processing
    if (!isOnline) {
      handleOfflineOrder("gift_card", foundGiftCard);
      setGiftCardDialogOpen(false);
      setGiftCardCode("");
      setFoundGiftCard(null);
      return;
    }

    try {
      await apiRequest("POST", `/api/gift-cards/${foundGiftCard.id}/use`, {
        amount: total,
      });
      createOrderMutation.mutate("gift_card");
      setGiftCardDialogOpen(false);
      setGiftCardCode("");
      setFoundGiftCard(null);
      queryClient.invalidateQueries({ queryKey: ["/api/gift-cards"] });
    } catch (err: any) {
      toast({ title: "Payment Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePayCard = async () => {
    if (cart.length === 0) return;

    // Offline: queue the card order — will charge Stripe on reconnect
    if (!isOnline) {
      handleOfflineOrder("stripe");
      return;
    }

    // Online: create payment intent then create order
    try {
      const piRes = await apiRequest("POST", "/api/stripe/payment-intent", {
        amount: Math.round(total * 100),
      });
      const pi = await piRes.json();
      await apiRequest("POST", "/api/stripe/capture", {
        paymentIntentId: pi.id,
      });
      createOrderMutation.mutate("stripe");
    } catch (err: any) {
      toast({ title: "Payment Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePayCash = () => {
    if (cart.length === 0) return;
    if (!isOnline) {
      handleOfflineOrder("cash");
      return;
    }
    createOrderMutation.mutate("cash");
  };

  const handleSendOrder = () => {
    if (cart.length === 0) return;
    if (!isOnline) {
      handleOfflineOrder("unpaid");
      return;
    }
    createOrderMutation.mutate("unpaid");
  };

  const openCashDrawer = async () => {
    try {
      await apiRequest("POST", "/api/cash-drawer/open", { locationId });
      toast({ title: "Cash Drawer", description: "Drawer open command sent" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleManualSync = async () => {
    const result = await syncPendingOrders();
    if (result.synced > 0) {
      toast({
        title: "Orders Synced",
        description: `${result.synced} order${result.synced > 1 ? "s" : ""} synced.${result.failed > 0 ? ` ${result.failed} failed.` : ""}`,
      });
      clearSynced();
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    } else if (result.failed > 0) {
      toast({
        title: "Sync Failed",
        description: `Could not sync ${result.failed} order${result.failed > 1 ? "s" : ""}. Server may still be unreachable.`,
        variant: "destructive",
      });
    }
  };

  const orderTypes: { value: OrderType; label: string }[] = [
    { value: "dine_in", label: "Dine In" },
    { value: "takeout", label: "Takeout" },
    { value: "pickup", label: "Pickup" },
    { value: "delivery", label: "Delivery" },
  ];

  return (
    <div className="flex h-full overflow-hidden" data-testid="pos-page">
      {/* LEFT: Menu Grid */}
      <div className="flex-1 flex flex-col min-w-0 border-r">
        {/* Offline Banner */}
        {!isOnline && (
          <div
            className="px-3 py-2 bg-amber-500/15 border-b border-amber-500/30 flex items-center gap-2 shrink-0"
            data-testid="offline-banner"
          >
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Offline Mode
              </span>
              <span className="text-xs text-amber-600/80 dark:text-amber-400/70 ml-2">
                All payments accepted. Orders and charges will process on reconnect.
              </span>
            </div>
            {pendingCount > 0 && (
              <Badge
                variant="outline"
                className="border-amber-500/50 text-amber-700 dark:text-amber-400 shrink-0 gap-1"
              >
                <Clock className="w-3 h-3" />
                {pendingCount} queued
              </Badge>
            )}
          </div>
        )}

        {/* Sync Banner — shows when online + has pending orders */}
        {isOnline && pendingCount > 0 && (
          <div
            className="px-3 py-2 bg-blue-500/10 border-b border-blue-500/25 flex items-center gap-2 shrink-0"
            data-testid="sync-banner"
          >
            <CloudUpload className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-sm text-blue-700 dark:text-blue-400 flex-1">
              {isSyncing
                ? "Syncing offline orders..."
                : `${pendingCount} offline order${pendingCount > 1 ? "s" : ""} ready to sync`}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-blue-500/40 text-blue-700 dark:text-blue-400"
              onClick={handleManualSync}
              disabled={isSyncing}
              data-testid="button-manual-sync"
            >
              {isSyncing ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <CloudUpload className="w-3 h-3 mr-1" />
              )}
              Sync Now
            </Button>
          </div>
        )}

        {/* Search bar */}
        <div className="p-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search menu items..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-menu"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-3 pb-2 shrink-0">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setActiveCategory(null)}
              data-testid="category-all"
              className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeCategory === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                data-testid={`category-${cat.id}`}
                className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                style={{
                  backgroundColor:
                    activeCategory === cat.id ? cat.color || undefined : undefined,
                  color: activeCategory === cat.id ? "#fff" : undefined,
                  border:
                    activeCategory === cat.id
                      ? undefined
                      : `1px solid ${cat.color || "hsl(var(--border))"}`,
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu items grid */}
        <ScrollArea className="flex-1 px-3 pb-3">
          <div className="grid grid-cols-4 xl:grid-cols-5 gap-2">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                data-testid={`menu-item-${item.id}`}
                className="relative flex flex-col items-start p-2.5 rounded-lg border bg-card text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                {item.isPopular && (
                  <Star className="absolute top-1.5 right-1.5 w-3 h-3 fill-amber-400 text-amber-400" />
                )}
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full aspect-square rounded-md object-cover mb-1.5"
                  />
                )}
                <span className="text-sm font-medium leading-tight line-clamp-2">
                  {item.name}
                </span>
                {item.nameZh && (
                  <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                    {item.nameZh}
                  </span>
                )}
                <span className="text-sm font-semibold text-primary mt-auto pt-1">
                  ${item.price.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No items found</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* RIGHT: Cart Panel */}
      <div className="w-[340px] xl:w-[380px] flex flex-col bg-card shrink-0">
        {/* Order Type + Connection Status */}
        <div className="p-3 border-b shrink-0">
          <div className="flex gap-1 items-center">
            <div className="flex gap-1 flex-1">
              {orderTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setOrderType(t.value)}
                  data-testid={`order-type-${t.value}`}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    orderType === t.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {/* Connection indicator dot */}
            <div
              className="ml-1.5 shrink-0"
              title={isOnline ? "Online" : "Offline — cash only"}
              data-testid="connection-indicator"
            >
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
              )}
            </div>
          </div>
        </div>

        {/* Loyalty Member */}
        <div className="px-3 pt-2 pb-0 shrink-0">
          {loyaltyCustomer ? (
            <div className="flex items-center gap-2 p-1.5 rounded-md bg-primary/5 border border-primary/20">
              <UserSearch className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" data-testid="text-loyalty-name">{loyaltyCustomer.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  <span className="capitalize font-medium" style={{ color: { bronze: "#CD7F32", silver: "#C0C0C0", gold: "#FFD700", platinum: "#E5E4E2" }[loyaltyCustomer.tier || "bronze"] }}>
                    {loyaltyCustomer.tier || "bronze"}
                  </span>
                  {" · "}{loyaltyCustomer.rewardPoints ?? 0} pts
                </div>
              </div>
              <button
                onClick={() => { setLoyaltyCustomer(null); setCustomerName(""); }}
                className="p-0.5 text-muted-foreground hover:text-foreground"
                data-testid="button-remove-loyalty"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Popover open={loyaltySearchOpen} onOpenChange={setLoyaltySearchOpen}>
              <PopoverTrigger asChild>
                <button
                  className={`flex items-center gap-1.5 text-xs transition-colors ${
                    isOnline
                      ? "text-muted-foreground hover:text-primary"
                      : "text-muted-foreground/50 cursor-not-allowed"
                  }`}
                  disabled={!isOnline}
                  data-testid="button-loyalty-search"
                >
                  <UserSearch className="w-3.5 h-3.5" />
                  <span>Loyalty Member{!isOnline ? " (offline)" : ""}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="start">
                <div className="text-xs font-medium mb-2">Search by phone</div>
                <div className="flex gap-1.5">
                  <Input
                    placeholder="Phone number"
                    value={loyaltyPhone}
                    onChange={(e) => setLoyaltyPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLoyaltySearch()}
                    className="h-7 text-xs"
                    data-testid="input-loyalty-phone"
                  />
                  <Button
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleLoyaltySearch}
                    disabled={loyaltySearching}
                    data-testid="button-loyalty-lookup"
                  >
                    {loyaltySearching ? <Loader2 className="w-3 h-3 animate-spin" /> : "Find"}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Customer & Notes */}
        <div className="px-3 pt-1.5 pb-1 space-y-1.5 shrink-0">
          <Input
            placeholder="Customer name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="h-8 text-sm"
            data-testid="input-customer-name"
          />
          <Input
            placeholder="Order notes"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            className="h-8 text-sm"
            data-testid="input-order-notes"
          />
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1 px-3 py-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShoppingCartIcon className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => {
                const modTotal = item.modifiers.reduce((s, m) => s + m.price, 0);
                const lineTotal = (item.unitPrice + modTotal) * item.quantity;
                return (
                  <div
                    key={item.key}
                    className="flex gap-2 p-2 rounded-md bg-background border text-sm"
                    data-testid={`cart-item-${item.key}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.name}</div>
                      {item.modifiers.length > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          {item.modifiers.map((m) => m.name).join(", ")}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <button
                          onClick={() => updateQuantity(item.key, -1)}
                          data-testid={`button-qty-minus-${item.key}`}
                          className="w-5 h-5 rounded bg-secondary flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.key, 1)}
                          data-testid={`button-qty-plus-${item.key}`}
                          className="w-5 h-5 rounded bg-secondary flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="font-medium">${lineTotal.toFixed(2)}</span>
                      <button
                        onClick={() => removeItem(item.key)}
                        data-testid={`button-remove-${item.key}`}
                        className="mt-auto p-0.5 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Totals & Payment */}
        <div className="border-t p-3 space-y-2 shrink-0 bg-card">
          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => setCart([])}
              data-testid="button-clear-cart"
            >
              <Trash2 className="w-3 h-3 mr-1" /> Clear Cart
            </Button>
          )}

          {/* Tip selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground shrink-0">Tip:</span>
            {[0, 10, 15, 20].map((pct) => (
              <button
                key={pct}
                onClick={() => setTipPercent(pct)}
                data-testid={`tip-${pct}`}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                  tipPercent === pct
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-0.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            {tip > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tip ({tipPercent}%)</span>
                <span>${tip.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-1 border-t">
              <span>Total</span>
              <span data-testid="text-total">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Send Order (no payment) */}
          <Button
            variant="secondary"
            className="w-full h-11 gap-2"
            onClick={handleSendOrder}
            disabled={cart.length === 0 || createOrderMutation.isPending}
            data-testid="button-send-order"
          >
            <Send className="w-4 h-4" />
            Send Order (Pay Later)
          </Button>

          {/* Payment Buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              className={`flex-1 h-11 ${!isOnline ? "border-amber-500/50" : ""}`}
              onClick={handlePayCard}
              disabled={cart.length === 0 || createOrderMutation.isPending}
              data-testid="button-pay-card"
            >
              <CreditCard className="w-4 h-4 mr-1.5" />
              Card
              {!isOnline && <Clock className="w-3 h-3 ml-1 opacity-60" />}
            </Button>
            <Button
              variant="outline"
              className={`flex-1 h-11 ${!isOnline ? "border-amber-500/50" : ""}`}
              onClick={handlePayCash}
              disabled={cart.length === 0 || createOrderMutation.isPending}
              data-testid="button-pay-cash"
            >
              <Banknote className="w-4 h-4 mr-1.5" />
              Cash
              {!isOnline && <Clock className="w-3 h-3 ml-1 opacity-60" />}
            </Button>
            <Button
              variant="outline"
              className={`flex-1 h-11 ${!isOnline ? "border-amber-500/50" : ""}`}
              onClick={() => {
                setGiftCardDialogOpen(true);
                setGiftCardCode("");
                setFoundGiftCard(null);
              }}
              disabled={cart.length === 0 || createOrderMutation.isPending}
              data-testid="button-pay-gift-card"
            >
              <Gift className="w-4 h-4 mr-1.5" />
              Gift Card
              {!isOnline && <Clock className="w-3 h-3 ml-1 opacity-60" />}
            </Button>
          </div>
          <button
            onClick={openCashDrawer}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-open-drawer"
          >
            <LockOpen className="w-3 h-3" />
            Open Cash Drawer
          </button>
        </div>
      </div>

      {/* Modifier Modal */}
      <ModifierModal
        open={modifierOpen}
        onOpenChange={setModifierOpen}
        item={modifierItem}
        modifierGroups={modifierGroups}
        onConfirm={(mods) => {
          if (modifierItem) addToCart(modifierItem, mods);
        }}
      />

      {/* Gift Card Payment Dialog */}
      <Dialog open={giftCardDialogOpen} onOpenChange={setGiftCardDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Gift Card Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Order total: <span className="font-semibold text-foreground">${total.toFixed(2)}</span>
            </div>
            {!isOnline && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-400">
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <span>Offline — cannot verify balance. Payment will be charged on reconnect.</span>
              </div>
            )}
            <div className="flex gap-1.5">
              <Input
                placeholder="Enter gift card code"
                className="font-mono text-sm"
                value={giftCardCode}
                onChange={(e) => setGiftCardCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (isOnline ? handleGiftCardLookup() : null)}
                data-testid="input-gift-card-code"
              />
              {isOnline && (
                <Button
                  variant="outline"
                  onClick={handleGiftCardLookup}
                  disabled={giftCardLookingUp || !giftCardCode.trim()}
                  data-testid="button-lookup-gift-card"
                >
                  {giftCardLookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : "Look Up"}
                </Button>
              )}
            </div>
            {foundGiftCard && (
              <div className="p-3 border rounded-md bg-muted/50 space-y-1">
                <div className="font-mono text-sm font-medium" data-testid="text-found-gc-code">{foundGiftCard.code}</div>
                <div className="text-lg font-bold" data-testid="text-found-gc-balance">
                  Balance: ${foundGiftCard.balance.toFixed(2)}
                </div>
                {foundGiftCard.balance < total && (
                  <div className="text-xs text-destructive">
                    Insufficient — ${(total - foundGiftCard.balance).toFixed(2)} more needed
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setGiftCardDialogOpen(false)}
                data-testid="button-cancel-gc-pay"
              >
                Cancel
              </Button>
              {isOnline ? (
                <Button
                  onClick={handleGiftCardPay}
                  disabled={!foundGiftCard || foundGiftCard.balance < total || createOrderMutation.isPending}
                  data-testid="button-confirm-gc-pay"
                >
                  Pay ${total.toFixed(2)}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (!giftCardCode.trim()) return;
                    // Create a minimal gift card reference for offline queuing
                    handleOfflineOrder("gift_card", {
                      id: 0, // unknown — will be resolved on sync by code lookup
                      code: giftCardCode.trim().toUpperCase(),
                      balance: total, // assumed sufficient
                      initialValue: 0,
                      isActive: true,
                      customerId: null,
                      purchasedAt: new Date(),
                      expiresAt: null,
                    } as GiftCard);
                    setGiftCardDialogOpen(false);
                    setGiftCardCode("");
                    setFoundGiftCard(null);
                  }}
                  disabled={!giftCardCode.trim()}
                  data-testid="button-confirm-gc-pay-offline"
                >
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  Queue ${total.toFixed(2)}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShoppingCartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
