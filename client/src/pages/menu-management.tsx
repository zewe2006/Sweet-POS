import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { MenuCategory, MenuItem } from "@shared/schema";

export default function MenuManagement() {
  const { toast } = useToast();
  const [tab, setTab] = useState("items");

  const { data: categories = [] } = useQuery<MenuCategory[]>({
    queryKey: ["/api/menu/categories"],
  });

  const { data: allItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/items"],
  });

  const { data: modifierGroups = [] } = useQuery<any[]>({
    queryKey: ["/api/menu/modifiers"],
  });

  const toggleAvailability = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: number; isAvailable: boolean }) => {
      const res = await apiRequest("PATCH", `/api/menu/items/${id}`, { isAvailable });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/items"] });
    },
  });

  // Edit item dialog
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    nameZh: "",
    price: "",
    isPopular: false,
    isAvailable: true,
    prepStation: "kitchen",
  });

  const openEditDialog = (item: MenuItem) => {
    setEditItem(item);
    setEditForm({
      name: item.name,
      nameZh: item.nameZh || "",
      price: String(item.price),
      isPopular: item.isPopular || false,
      isAvailable: item.isAvailable !== false,
      prepStation: item.prepStation || "kitchen",
    });
    setEditOpen(true);
  };

  const saveItemMutation = useMutation({
    mutationFn: async () => {
      if (!editItem) return;
      const res = await apiRequest("PATCH", `/api/menu/items/${editItem.id}`, {
        name: editForm.name,
        nameZh: editForm.nameZh || null,
        price: parseFloat(editForm.price),
        isPopular: editForm.isPopular,
        isAvailable: editForm.isAvailable,
        prepStation: editForm.prepStation,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/items"] });
      setEditOpen(false);
      toast({ title: "Item updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Add category dialog
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#E8634A");

  const addCategoryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/menu/categories", {
        name: newCatName,
        color: newCatColor,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/categories"] });
      setNewCatOpen(false);
      setNewCatName("");
      toast({ title: "Category added" });
    },
  });

  // Expanded modifier groups
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const toggleGroup = (id: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full p-4" data-testid="menu-management-page">
      <h1 className="text-xl font-bold mb-4">Menu Management</h1>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0 w-fit">
          <TabsTrigger value="items" data-testid="tab-items">Items</TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
          <TabsTrigger value="modifiers" data-testid="tab-modifiers">Modifiers</TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="flex-1 min-h-0 mt-3">
          <div className="h-full border rounded-lg overflow-hidden">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Chinese</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-[80px] text-right">Price</TableHead>
                    <TableHead className="w-[70px] text-center">Popular</TableHead>
                    <TableHead className="w-[90px] text-center">Available</TableHead>
                    <TableHead className="w-[70px]">Station</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allItems.map((item) => {
                    const cat = categories.find((c) => c.id === item.categoryId);
                    return (
                      <TableRow key={item.id} data-testid={`menu-row-${item.id}`}>
                        <TableCell className="font-medium text-sm">{item.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.nameZh || "—"}</TableCell>
                        <TableCell>
                          {cat && (
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                              style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                            >
                              {cat.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          ${item.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.isPopular && <Badge variant="secondary" className="text-[10px]">Popular</Badge>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={item.isAvailable !== false}
                            onCheckedChange={(checked) =>
                              toggleAvailability.mutate({ id: item.id, isAvailable: checked })
                            }
                            data-testid={`switch-available-${item.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize">
                          {item.prepStation}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(item)}
                            data-testid={`button-edit-item-${item.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="flex-1 min-h-0 mt-3">
          <div className="mb-3">
            <Button size="sm" onClick={() => setNewCatOpen(true)} data-testid="button-add-category">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Category
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">Order</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[80px]">Color</TableHead>
                  <TableHead className="w-[80px] text-center">Items</TableHead>
                  <TableHead className="w-[80px] text-center">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map((cat) => (
                    <TableRow key={cat.id} data-testid={`category-row-${cat.id}`}>
                      <TableCell className="text-sm text-muted-foreground">
                        {cat.displayOrder}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{cat.name}</TableCell>
                      <TableCell>
                        <div
                          className="w-6 h-6 rounded-md"
                          style={{ backgroundColor: cat.color || "#ccc" }}
                        />
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {allItems.filter((i) => i.categoryId === cat.id).length}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={cat.isActive ? "default" : "secondary"} className="text-[10px]">
                          {cat.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Modifiers Tab */}
        <TabsContent value="modifiers" className="flex-1 min-h-0 mt-3">
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {modifierGroups.map((group: any) => (
                <div key={group.id} className="border rounded-lg" data-testid={`modifier-group-${group.id}`}>
                  <button
                    className="w-full flex items-center justify-between p-3 text-left"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedGroups.has(group.id) ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-sm">{group.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {group.type} · {group.required ? "Required" : "Optional"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {group.modifiers?.length || 0} options
                    </span>
                  </button>
                  {expandedGroups.has(group.id) && (
                    <div className="px-3 pb-3">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-[100px] text-right">Price Adj.</TableHead>
                            <TableHead className="w-[80px] text-center">Default</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(group.modifiers || []).map((mod: any) => (
                            <TableRow key={mod.id}>
                              <TableCell className="text-sm">{mod.name}</TableCell>
                              <TableCell className="text-right text-sm font-mono">
                                {mod.priceAdjustment > 0
                                  ? `+$${mod.priceAdjustment.toFixed(2)}`
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-center">
                                {mod.isDefault && (
                                  <Badge variant="secondary" className="text-[10px]">Default</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Edit Item Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                data-testid="input-edit-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Chinese Name</label>
              <Input
                value={editForm.nameZh}
                onChange={(e) => setEditForm((f) => ({ ...f, nameZh: e.target.value }))}
                data-testid="input-edit-name-zh"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Price</label>
              <Input
                type="number"
                step="0.01"
                value={editForm.price}
                onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                data-testid="input-edit-price"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Popular</label>
              <Switch
                checked={editForm.isPopular}
                onCheckedChange={(v) => setEditForm((f) => ({ ...f, isPopular: v }))}
                data-testid="switch-edit-popular"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Available</label>
              <Switch
                checked={editForm.isAvailable}
                onCheckedChange={(v) => setEditForm((f) => ({ ...f, isAvailable: v }))}
                data-testid="switch-edit-available"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveItemMutation.mutate()}
              disabled={saveItemMutation.isPending}
              data-testid="button-save-item"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={newCatOpen} onOpenChange={setNewCatOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Seasonal Specials"
                data-testid="input-new-category-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <input
                type="color"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCatOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addCategoryMutation.mutate()}
              disabled={!newCatName.trim() || addCategoryMutation.isPending}
              data-testid="button-save-category"
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
