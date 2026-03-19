import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  ChevronDown,
  ChevronRight,
  ImagePlus,
  X,
} from "lucide-react";
import type { MenuCategory, MenuItem } from "@shared/schema";

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

export default function MenuManagement() {
  const { toast } = useToast();
  const [tab, setTab] = useState("items");

  const { data: categories = [] } = useQuery<MenuCategory[]>({
    queryKey: ["/api/menu/categories"],
  });

  const { data: allItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu/items"],
  });

  const { data: modifierGroups = [] } = useQuery<ModifierGroupWithOptions[]>({
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

  // ── Edit / Add Item Dialog ──
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    nameZh: "",
    price: "",
    cost: "",
    description: "",
    categoryId: "",
    isPopular: false,
    isAvailable: true,
    prepStation: "kitchen",
    image: "",
    modifierGroups: [] as number[],
  });
  const imageInputRef = useRef<HTMLInputElement>(null);

  const openEditDialog = (item: MenuItem) => {
    setEditItem(item);
    setIsNewItem(false);
    setEditForm({
      name: item.name,
      nameZh: item.nameZh || "",
      price: String(item.price),
      cost: item.cost ? String(item.cost) : "",
      description: item.description || "",
      categoryId: item.categoryId ? String(item.categoryId) : "",
      isPopular: item.isPopular || false,
      isAvailable: item.isAvailable !== false,
      prepStation: item.prepStation || "kitchen",
      image: item.image || "",
      modifierGroups: (item.modifierGroups || []).map(Number),
    });
    setEditOpen(true);
  };

  const openAddItemDialog = () => {
    setEditItem(null);
    setIsNewItem(true);
    setEditForm({
      name: "",
      nameZh: "",
      price: "",
      cost: "",
      description: "",
      categoryId: categories.length > 0 ? String(categories[0].id) : "",
      isPopular: false,
      isAvailable: true,
      prepStation: "bar",
      image: "",
      modifierGroups: [],
    });
    setEditOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 2MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm((f) => ({ ...f, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const toggleModifierGroup = (groupId: number) => {
    setEditForm((f) => ({
      ...f,
      modifierGroups: f.modifierGroups.includes(groupId)
        ? f.modifierGroups.filter((id) => id !== groupId)
        : [...f.modifierGroups, groupId],
    }));
  };

  const saveItemMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: editForm.name,
        nameZh: editForm.nameZh || null,
        price: parseFloat(editForm.price),
        cost: editForm.cost ? parseFloat(editForm.cost) : null,
        description: editForm.description || null,
        categoryId: editForm.categoryId ? parseInt(editForm.categoryId) : null,
        isPopular: editForm.isPopular,
        isAvailable: editForm.isAvailable,
        prepStation: editForm.prepStation,
        image: editForm.image || null,
        modifierGroups: editForm.modifierGroups,
      };
      if (isNewItem) {
        const res = await apiRequest("POST", "/api/menu/items", body);
        return res.json();
      } else {
        const res = await apiRequest("PATCH", `/api/menu/items/${editItem!.id}`, body);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/items"] });
      setEditOpen(false);
      toast({ title: isNewItem ? "Item created" : "Item updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ── Add Category Dialog ──
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

  // ── Modifier Group Management ──
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const toggleGroup = (id: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Add Modifier Group Dialog
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({
    name: "",
    type: "single",
    required: false,
    maxSelections: "1",
  });

  const addGroupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/menu/modifier-groups", {
        name: newGroupForm.name,
        type: newGroupForm.type,
        required: newGroupForm.required,
        maxSelections: parseInt(newGroupForm.maxSelections),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/modifiers"] });
      setNewGroupOpen(false);
      setNewGroupForm({ name: "", type: "single", required: false, maxSelections: "1" });
      toast({ title: "Modifier group created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Add Modifier Option Dialog
  const [newModOpen, setNewModOpen] = useState(false);
  const [newModGroupId, setNewModGroupId] = useState<number | null>(null);
  const [newModForm, setNewModForm] = useState({
    name: "",
    priceAdjustment: "0",
    isDefault: false,
  });

  const addModifierMutation = useMutation({
    mutationFn: async () => {
      if (!newModGroupId) throw new Error("No group selected");
      const group = modifierGroups.find((g) => g.id === newModGroupId);
      const nextOrder = (group?.modifiers?.length || 0) + 1;
      const res = await apiRequest("POST", "/api/menu/modifiers", {
        groupId: newModGroupId,
        name: newModForm.name,
        priceAdjustment: parseFloat(newModForm.priceAdjustment) || 0,
        isDefault: newModForm.isDefault,
        displayOrder: nextOrder,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu/modifiers"] });
      setNewModOpen(false);
      setNewModForm({ name: "", priceAdjustment: "0", isDefault: false });
      toast({ title: "Modifier option added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openAddModifier = (groupId: number) => {
    setNewModGroupId(groupId);
    setNewModForm({ name: "", priceAdjustment: "0", isDefault: false });
    setNewModOpen(true);
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
          <div className="mb-3">
            <Button size="sm" onClick={openAddItemDialog} data-testid="button-add-item">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
            </Button>
          </div>
          <div className="h-full border rounded-lg overflow-hidden">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Chinese</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-[80px] text-right">Price</TableHead>
                    <TableHead className="w-[70px] text-center">Popular</TableHead>
                    <TableHead className="w-[90px] text-center">Available</TableHead>
                    <TableHead className="w-[80px]">Modifiers</TableHead>
                    <TableHead className="w-[70px]">Station</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allItems.map((item) => {
                    const cat = categories.find((c) => c.id === item.categoryId);
                    const itemModGroups = (item.modifierGroups || []).map(Number);
                    const linkedGroups = modifierGroups.filter((g) => itemModGroups.includes(g.id));
                    return (
                      <TableRow key={item.id} data-testid={`menu-row-${item.id}`}>
                        <TableCell className="p-1">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                              <ImagePlus className="w-3.5 h-3.5 text-muted-foreground/40" />
                            </div>
                          )}
                        </TableCell>
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
                        <TableCell>
                          {linkedGroups.length > 0 ? (
                            <span className="text-xs text-muted-foreground">{linkedGroups.length} groups</span>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">None</span>
                          )}
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
          <div className="mb-3">
            <Button size="sm" onClick={() => setNewGroupOpen(true)} data-testid="button-add-modifier-group">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Modifier Group
            </Button>
          </div>
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {modifierGroups.map((group) => (
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
                      {group.type === "multiple" && (
                        <span className="text-[10px] text-muted-foreground">
                          max {group.maxSelections}
                        </span>
                      )}
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
                          {(group.modifiers || []).map((mod) => (
                            <TableRow key={mod.id}>
                              <TableCell className="text-sm">{mod.name}</TableCell>
                              <TableCell className="text-right text-sm font-mono">
                                {(mod.priceAdjustment ?? 0) > 0
                                  ? `+$${(mod.priceAdjustment || 0).toFixed(2)}`
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddModifier(group.id);
                        }}
                        data-testid={`button-add-modifier-${group.id}`}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Option
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* ── Edit / Add Item Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNewItem ? "Add Menu Item" : "Edit Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Image */}
            <div>
              <label className="text-sm font-medium mb-1 block">Image</label>
              <div className="flex items-center gap-3">
                {editForm.image ? (
                  <div className="relative">
                    <img
                      src={editForm.image}
                      alt="Preview"
                      className="w-16 h-16 rounded-lg object-cover border"
                    />
                    <button
                      onClick={() => setEditForm((f) => ({ ...f, image: "" }))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                >
                  {editForm.image ? "Change" : "Upload"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Classic Milk Tea"
                  data-testid="input-edit-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Chinese Name</label>
                <Input
                  value={editForm.nameZh}
                  onChange={(e) => setEditForm((f) => ({ ...f, nameZh: e.target.value }))}
                  placeholder="经典奶茶"
                  data-testid="input-edit-name-zh"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="House-brewed black tea with fresh milk"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Price</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="5.50"
                  data-testid="input-edit-price"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Cost</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.cost}
                  onChange={(e) => setEditForm((f) => ({ ...f, cost: e.target.value }))}
                  placeholder="1.20"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={editForm.categoryId}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, categoryId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Prep Station</label>
                <Select
                  value={editForm.prepStation}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, prepStation: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="bakery">Bakery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2 pt-5">
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
            </div>

            {/* Modifier Groups Linking */}
            <div>
              <label className="text-sm font-medium mb-2 block">Modifier Groups</label>
              <p className="text-xs text-muted-foreground mb-2">
                Select which modifier options customers can choose for this item
              </p>
              <div className="border rounded-md p-2 space-y-1.5 max-h-[160px] overflow-y-auto">
                {modifierGroups.map((group) => (
                  <label
                    key={group.id}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={editForm.modifierGroups.includes(group.id)}
                      onCheckedChange={() => toggleModifierGroup(group.id)}
                    />
                    <span className="text-sm flex-1">{group.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {group.type} · {group.modifiers?.length || 0} options
                    </Badge>
                  </label>
                ))}
                {modifierGroups.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No modifier groups yet. Create some in the Modifiers tab.
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveItemMutation.mutate()}
              disabled={!editForm.name.trim() || !editForm.price || saveItemMutation.isPending}
              data-testid="button-save-item"
            >
              {isNewItem ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Category Dialog ── */}
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

      {/* ── Add Modifier Group Dialog ── */}
      <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Modifier Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Group Name</label>
              <Input
                value={newGroupForm.name}
                onChange={(e) => setNewGroupForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sugar Level, Toppings"
                data-testid="input-new-group-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Selection Type</label>
              <Select
                value={newGroupForm.type}
                onValueChange={(v) => setNewGroupForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single (pick one)</SelectItem>
                  <SelectItem value="multiple">Multiple (pick many)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Required?</label>
              <Switch
                checked={newGroupForm.required}
                onCheckedChange={(v) => setNewGroupForm((f) => ({ ...f, required: v }))}
              />
            </div>
            {newGroupForm.type === "multiple" && (
              <div>
                <label className="text-sm font-medium">Max Selections</label>
                <Input
                  type="number"
                  min="1"
                  value={newGroupForm.maxSelections}
                  onChange={(e) => setNewGroupForm((f) => ({ ...f, maxSelections: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewGroupOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addGroupMutation.mutate()}
              disabled={!newGroupForm.name.trim() || addGroupMutation.isPending}
              data-testid="button-save-modifier-group"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Modifier Option Dialog ── */}
      <Dialog open={newModOpen} onOpenChange={setNewModOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Add Option to "{modifierGroups.find((g) => g.id === newModGroupId)?.name}"
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Option Name</label>
              <Input
                value={newModForm.name}
                onChange={(e) => setNewModForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Oat Milk, Extra Shot"
                data-testid="input-new-modifier-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Price Adjustment ($)</label>
              <Input
                type="number"
                step="0.25"
                value={newModForm.priceAdjustment}
                onChange={(e) => setNewModForm((f) => ({ ...f, priceAdjustment: e.target.value }))}
                placeholder="0.00"
                data-testid="input-new-modifier-price"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Default selection?</label>
              <Switch
                checked={newModForm.isDefault}
                onCheckedChange={(v) => setNewModForm((f) => ({ ...f, isDefault: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewModOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addModifierMutation.mutate()}
              disabled={!newModForm.name.trim() || addModifierMutation.isPending}
              data-testid="button-save-modifier"
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
