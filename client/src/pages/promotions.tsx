import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Megaphone,
  Calendar,
  Tag,
  Percent,
} from "lucide-react";
import type { Promotion } from "@shared/schema";

const typeLabels: Record<string, string> = {
  percentage: "Percentage Off",
  fixed: "Fixed Discount",
  bogo: "Buy One Get One",
  freeItem: "Free Item",
};

const typeIcons: Record<string, typeof Percent> = {
  percentage: Percent,
  fixed: Tag,
  bogo: Megaphone,
  freeItem: Megaphone,
};

export default function Promotions() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "percentage",
    value: "",
    code: "",
    startDate: "",
    endDate: "",
  });

  const { data: promotions = [], isLoading } = useQuery<Promotion[]>({
    queryKey: ["/api/promotions"],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/promotions/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promotions"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/promotions", {
        title: form.title,
        description: form.description || null,
        type: form.type,
        value: form.value ? parseFloat(form.value) : null,
        code: form.code || null,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promotions"] });
      setCreateOpen(false);
      setForm({ title: "", description: "", type: "percentage", value: "", code: "", startDate: "", endDate: "" });
      toast({ title: "Promotion created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const formatDate = (d: Date | string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="flex flex-col h-full p-4" data-testid="promotions-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Promotions</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="button-create-promo">
          <Plus className="w-3.5 h-3.5 mr-1" /> New Promotion
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : promotions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Megaphone className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No promotions yet</p>
            <p className="text-xs">Create your first promotion to attract customers.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {promotions.map((promo) => {
              const TypeIcon = typeIcons[promo.type] || Megaphone;
              return (
                <Card key={promo.id} data-testid={`promo-card-${promo.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <TypeIcon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{promo.title}</h3>
                          <Badge variant="outline" className="text-[10px] mt-0.5">
                            {typeLabels[promo.type] || promo.type}
                          </Badge>
                        </div>
                      </div>
                      <Switch
                        checked={promo.isActive !== false}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: promo.id, isActive: v })}
                        data-testid={`switch-promo-${promo.id}`}
                      />
                    </div>
                    {promo.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {promo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {promo.code && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span className="font-mono">{promo.code}</span>
                        </div>
                      )}
                      {promo.value && (
                        <span>
                          {promo.type === "percentage" ? `${promo.value}% off` : `$${promo.value} off`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(promo.startDate)} — {formatDate(promo.endDate)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Create Promotion Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Promotion</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Summer Special"
                data-testid="input-promo-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe the promotion..."
                className="resize-none"
                rows={2}
                data-testid="input-promo-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger data-testid="select-promo-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Off</SelectItem>
                    <SelectItem value="fixed">Fixed Discount</SelectItem>
                    <SelectItem value="bogo">Buy One Get One</SelectItem>
                    <SelectItem value="freeItem">Free Item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Value</label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder={form.type === "percentage" ? "e.g. 20" : "e.g. 5.00"}
                  data-testid="input-promo-value"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Promo Code</label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. SUMMER20"
                data-testid="input-promo-code"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  data-testid="input-promo-start"
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  data-testid="input-promo-end"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.title.trim() || createMutation.isPending}
              data-testid="button-save-promo"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
