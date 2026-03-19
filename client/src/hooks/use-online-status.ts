import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook to detect network + server connectivity.
 * Uses navigator.onLine + periodic health-check pings to the backend.
 *
 * Offline mode queues ALL payment types (cash, card, gift card).
 * On reconnect, sync processes Stripe charges and gift card deductions
 * before creating the server-side order.
 */

export interface PendingOrder {
  id: string; // local UUID
  createdAt: string;
  locationId: number;
  source: string;
  type: string;
  customerName?: string;
  orderNotes?: string;
  paymentMethod: string; // "cash" | "stripe" | "gift_card"
  items: {
    menuItemId: number;
    quantity: number;
    modifiers: { name: string; price: number }[];
  }[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  synced: boolean;
  syncError?: string;
  loyaltyCustomerId?: number;
  loyaltyEarnAmount?: number;
  // Gift card fields (for gift_card payments)
  giftCardId?: number;
  giftCardCode?: string;
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const healthCheckRef = useRef<ReturnType<typeof setInterval>>();

  // Check actual server reachability (not just browser online flag)
  const checkServerHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch("/api/locations", { signal: controller.signal });
      clearTimeout(timeout);
      setIsOnline(res.ok);
    } catch {
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      // Browser says online, verify with server
      checkServerHealth();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic health check every 10 seconds
    healthCheckRef.current = setInterval(checkServerHealth, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (healthCheckRef.current) clearInterval(healthCheckRef.current);
    };
  }, [checkServerHealth]);

  const addPendingOrder = useCallback((order: PendingOrder) => {
    setPendingOrders((prev) => [...prev, order]);
  }, []);

  /**
   * Sync a single order. Handles payment processing before creating the order.
   * - stripe: creates payment intent → captures → creates order
   * - gift_card: deducts gift card balance → creates order
   * - cash: creates order directly
   */
  const syncSingleOrder = async (
    order: PendingOrder
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Step 1: Process payment if needed
      if (order.paymentMethod === "stripe") {
        // Create and capture Stripe payment intent
        const piRes = await fetch("/api/stripe/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: Math.round(order.total * 100) }),
        });
        if (!piRes.ok) return { success: false, error: "Stripe payment intent failed" };
        const pi = await piRes.json();

        const captureRes = await fetch("/api/stripe/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: pi.id }),
        });
        if (!captureRes.ok) return { success: false, error: "Stripe capture failed" };
      }

      if (order.paymentMethod === "gift_card") {
        // Resolve gift card ID from code if needed (offline orders may only have code)
        let gcId = order.giftCardId;
        if ((!gcId || gcId === 0) && order.giftCardCode) {
          const lookupRes = await fetch(`/api/gift-cards/lookup/${encodeURIComponent(order.giftCardCode)}`);
          if (!lookupRes.ok) {
            return { success: false, error: `Gift card ${order.giftCardCode} not found` };
          }
          const gc = await lookupRes.json();
          gcId = gc.id;
          // Check balance
          if (gc.balance < order.total) {
            return {
              success: false,
              error: `Gift card ${order.giftCardCode} has insufficient balance ($${gc.balance.toFixed(2)} < $${order.total.toFixed(2)})`,
            };
          }
        }
        if (!gcId) {
          return { success: false, error: "Gift card ID could not be resolved" };
        }
        // Deduct gift card balance
        const gcRes = await fetch(`/api/gift-cards/${gcId}/use`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: order.total }),
        });
        if (!gcRes.ok) {
          const err = await gcRes.json().catch(() => ({}));
          return {
            success: false,
            error: err.message || "Gift card deduction failed — balance may have changed",
          };
        }
      }

      // Step 2: Create the order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: order.locationId,
          source: order.source,
          type: order.type,
          customerName: order.customerName || undefined,
          notes: order.orderNotes || undefined,
          paymentMethod: order.paymentMethod,
          items: order.items,
        }),
      });

      if (!orderRes.ok) return { success: false, error: "Order creation failed" };
      const serverOrder = await orderRes.json();

      // Step 3: Auto-earn loyalty points if customer was attached
      if (order.loyaltyCustomerId && order.loyaltyEarnAmount) {
        try {
          await fetch(`/api/customers/${order.loyaltyCustomerId}/earn`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: serverOrder.id,
              amount: order.loyaltyEarnAmount,
            }),
          });
        } catch {
          // silently fail — order was synced
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  };

  const syncPendingOrders = useCallback(async () => {
    const unsyncedOrders = pendingOrders.filter((o) => !o.synced);
    if (unsyncedOrders.length === 0 || isSyncing) return { synced: 0, failed: 0, errors: [] as string[] };

    setIsSyncing(true);
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const order of unsyncedOrders) {
      const result = await syncSingleOrder(order);
      if (result.success) {
        setPendingOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, synced: true, syncError: undefined } : o))
        );
        synced++;
      } else {
        setPendingOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, syncError: result.error } : o))
        );
        failed++;
        if (result.error) errors.push(`${order.paymentMethod} order $${order.total.toFixed(2)}: ${result.error}`);
      }
    }

    setIsSyncing(false);
    return { synced, failed, errors };
  }, [pendingOrders, isSyncing]);

  const clearSynced = useCallback(() => {
    setPendingOrders((prev) => prev.filter((o) => !o.synced));
  }, []);

  const pendingCount = pendingOrders.filter((o) => !o.synced).length;

  return {
    isOnline,
    pendingOrders,
    pendingCount,
    isSyncing,
    addPendingOrder,
    syncPendingOrders,
    clearSynced,
  };
}
