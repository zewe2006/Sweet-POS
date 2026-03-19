import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MenuItem } from "@shared/schema";

interface ModifierOption {
  id: number;
  groupId: number;
  name: string;
  priceAdjustment: number | null;
  isDefault: boolean | null;
  displayOrder: number | null;
}

interface ModifierGroupWithOptions {
  id: number;
  name: string;
  type: string | null;
  required: boolean | null;
  maxSelections: number | null;
  modifiers: ModifierOption[];
}

interface ModifierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem | null;
  modifierGroups: ModifierGroupWithOptions[];
  onConfirm: (selectedModifiers: { name: string; price: number }[]) => void;
}

export function ModifierModal({
  open,
  onOpenChange,
  item,
  modifierGroups,
  onConfirm,
}: ModifierModalProps) {
  const [selections, setSelections] = useState<Record<number, number[]>>({});

  if (!item) return null;

  const itemGroupIds = (item.modifierGroups || []).map(Number);
  const relevantGroups = modifierGroups.filter((g) => itemGroupIds.includes(g.id));

  const handleSelect = (group: ModifierGroupWithOptions, modId: number) => {
    setSelections((prev) => {
      const current = prev[group.id] || [];
      if (group.type === "single") {
        return { ...prev, [group.id]: [modId] };
      }
      // multiple
      const max = group.maxSelections || 99;
      if (current.includes(modId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== modId) };
      }
      if (current.length >= max) return prev;
      return { ...prev, [group.id]: [...current, modId] };
    });
  };

  const handleConfirm = () => {
    const mods: { name: string; price: number }[] = [];
    for (const group of relevantGroups) {
      const selected = selections[group.id] || [];
      for (const modId of selected) {
        const mod = group.modifiers.find((m) => m.id === modId);
        if (mod) {
          mods.push({ name: mod.name, price: mod.priceAdjustment || 0 });
        }
      }
    }
    onConfirm(mods);
    setSelections({});
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelections({});
    onOpenChange(false);
  };

  const extraCost = Object.entries(selections).reduce((total, [groupId, modIds]) => {
    const group = relevantGroups.find((g) => g.id === Number(groupId));
    if (!group) return total;
    return total + modIds.reduce((sum, modId) => {
      const mod = group.modifiers.find((m) => m.id === modId);
      return sum + (mod?.priceAdjustment || 0);
    }, 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-baseline gap-2">
            <span>{item.name}</span>
            {item.nameZh && (
              <span className="text-sm font-normal text-muted-foreground">{item.nameZh}</span>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
        </DialogHeader>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto py-2">
          {relevantGroups.map((group) => {
            const selected = selections[group.id] || [];
            return (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm">{group.name}</span>
                  {group.required && (
                    <Badge variant="outline" className="text-xs">Required</Badge>
                  )}
                  {group.type === "multiple" && (
                    <span className="text-xs text-muted-foreground">
                      Up to {group.maxSelections}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.modifiers.map((mod) => {
                    const isSelected = selected.includes(mod.id);
                    return (
                      <button
                        key={mod.id}
                        data-testid={`modifier-${mod.id}`}
                        onClick={() => handleSelect(group, mod.id)}
                        className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:bg-accent"
                        }`}
                      >
                        {mod.name}
                        {(mod.priceAdjustment ?? 0) > 0 && (
                          <span className="ml-1 opacity-70">+${(mod.priceAdjustment || 0).toFixed(2)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Total: ${(item.price + extraCost).toFixed(2)}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} data-testid="button-modifier-cancel">
              Cancel
            </Button>
            <Button onClick={handleConfirm} data-testid="button-modifier-confirm">
              Add to Order
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
