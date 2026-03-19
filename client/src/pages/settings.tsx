import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Printer,
  Users,
  Phone,
  Mail,
  Globe,
  Clock,
  DollarSign,
  Save,
  Plus,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
  Receipt,
  Shield,
  ChefHat,
  UserCircle,
  Building2,
} from "lucide-react";
import type { Location as StoreLocation, Printer as PrinterType, User, StoreHours, DayHours } from "@shared/schema";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  cashier: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  kitchen: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const ROLE_ICONS: Record<string, typeof Shield> = {
  admin: Shield,
  manager: Building2,
  cashier: UserCircle,
  kitchen: ChefHat,
};

const defaultDayHours: DayHours = { open: "10:00", close: "22:00", closed: false };
const defaultStoreHours: StoreHours = {
  monday: { ...defaultDayHours },
  tuesday: { ...defaultDayHours },
  wednesday: { ...defaultDayHours },
  thursday: { ...defaultDayHours },
  friday: { ...defaultDayHours },
  saturday: { open: "09:00", close: "23:00", closed: false },
  sunday: { open: "09:00", close: "21:00", closed: false },
};

// ============ Location Edit Form ============
function LocationEditForm({ location, locations }: { location: StoreLocation; locations: StoreLocation[] }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: location.name,
    address: location.address,
    city: location.city || "",
    state: location.state || "",
    zip: location.zip || "",
    phone: location.phone || "",
    email: location.email || "",
    website: location.website || "",
    taxRate: String(((location.taxRate ?? 0.08) * 100).toFixed(2)),
    taxName: location.taxName || "Sales Tax",
    receiptHeader: location.receiptHeader || "",
    receiptFooter: location.receiptFooter || "",
    orderNumberPrefix: location.orderNumberPrefix || "SH",
    defaultPrepTime: String(location.defaultPrepTime ?? 15),
    autoAcceptOrders: location.autoAcceptOrders ?? true,
    stripeTerminalId: location.stripeTerminalId || "",
    uberEatsStoreId: location.uberEatsStoreId || "",
    doordashStoreId: location.doordashStoreId || "",
    isActive: location.isActive ?? true,
  });
  const [hours, setHours] = useState<StoreHours>(location.storeHours || defaultStoreHours);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/locations/${location.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      toast({ title: "Saved", description: `${form.name} settings updated.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save. Try again.", variant: "destructive" });
    },
  });

  const handleSave = () => {
    mutation.mutate({
      name: form.name,
      address: form.address,
      city: form.city || null,
      state: form.state || null,
      zip: form.zip || null,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
      taxRate: parseFloat(form.taxRate) / 100,
      taxName: form.taxName,
      receiptHeader: form.receiptHeader || null,
      receiptFooter: form.receiptFooter || null,
      orderNumberPrefix: form.orderNumberPrefix,
      defaultPrepTime: parseInt(form.defaultPrepTime) || 15,
      autoAcceptOrders: form.autoAcceptOrders,
      stripeTerminalId: form.stripeTerminalId || null,
      uberEatsStoreId: form.uberEatsStoreId || null,
      doordashStoreId: form.doordashStoreId || null,
      storeHours: hours,
      isActive: form.isActive,
    });
  };

  const updateHour = (day: string, field: "open" | "close", value: string) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day as keyof StoreHours], [field]: value } }));
  };
  const toggleClosed = (day: string) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day as keyof StoreHours], closed: !prev[day as keyof StoreHours].closed } }));
  };

  return (
    <div className="space-y-5">
      {/* Store Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Store Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Store Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-sm" data-testid="input-location-name" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-8 text-sm" data-testid="input-location-address" />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">State</Label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="h-8 text-sm" maxLength={2} />
              </div>
              <div>
                <Label className="text-xs">ZIP</Label>
                <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} className="h-8 text-sm" maxLength={10} />
              </div>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-8 text-sm" placeholder="(xxx) xxx-xxxx" />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-8 text-sm" placeholder="store@sweethut.com" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs flex items-center gap-1"><Globe className="w-3 h-3" /> Website</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="h-8 text-sm" placeholder="https://" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} data-testid="switch-location-active" />
            <Label className="text-xs">Location is active</Label>
          </div>
        </CardContent>
      </Card>

      {/* Store Hours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Store Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {DAYS.map((day) => {
              const dh = hours[day];
              return (
                <div key={day} className="flex items-center gap-2 text-sm">
                  <span className="w-10 text-xs font-medium text-muted-foreground">{DAY_LABELS[day]}</span>
                  <Switch checked={!dh.closed} onCheckedChange={() => toggleClosed(day)} className="scale-75" />
                  {dh.closed ? (
                    <span className="text-xs text-muted-foreground italic">Closed</span>
                  ) : (
                    <>
                      <Input type="time" value={dh.open} onChange={(e) => updateHour(day, "open", e.target.value)} className="h-7 text-xs w-28" />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input type="time" value={dh.close} onChange={(e) => updateHour(day, "close", e.target.value)} className="h-7 text-xs w-28" />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tax & Receipt */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" /> Tax & Receipt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tax Rate (%)</Label>
              <Input type="number" step="0.01" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Tax Label</Label>
              <Input value={form.taxName} onChange={(e) => setForm({ ...form, taxName: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Receipt Header</Label>
              <Textarea value={form.receiptHeader} onChange={(e) => setForm({ ...form, receiptHeader: e.target.value })} rows={2} className="text-xs resize-none" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Receipt Footer</Label>
              <Textarea value={form.receiptFooter} onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })} rows={2} className="text-xs resize-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Operations & Integrations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Order # Prefix</Label>
              <Input value={form.orderNumberPrefix} onChange={(e) => setForm({ ...form, orderNumberPrefix: e.target.value })} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Default Prep Time (min)</Label>
              <Input type="number" value={form.defaultPrepTime} onChange={(e) => setForm({ ...form, defaultPrepTime: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={form.autoAcceptOrders} onCheckedChange={(v) => setForm({ ...form, autoAcceptOrders: v })} />
              <Label className="text-xs">Auto-accept delivery orders</Label>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="text-xs">Stripe Terminal ID</Label>
              <Input value={form.stripeTerminalId} onChange={(e) => setForm({ ...form, stripeTerminalId: e.target.value })} className="h-8 text-sm font-mono" placeholder="tmr_..." />
            </div>
            <div>
              <Label className="text-xs">Uber Eats Store ID</Label>
              <Input value={form.uberEatsStoreId} onChange={(e) => setForm({ ...form, uberEatsStoreId: e.target.value })} className="h-8 text-sm font-mono" placeholder="Optional" />
            </div>
            <div>
              <Label className="text-xs">DoorDash Store ID</Label>
              <Input value={form.doordashStoreId} onChange={(e) => setForm({ ...form, doordashStoreId: e.target.value })} className="h-8 text-sm font-mono" placeholder="Optional" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <Button onClick={handleSave} disabled={mutation.isPending} className="w-full" data-testid="btn-save-location">
        <Save className="w-4 h-4 mr-2" />
        {mutation.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}

// ============ Printer Dialog ============
function PrinterDialog({
  open,
  onClose,
  printer,
  locationId,
  locations,
}: {
  open: boolean;
  onClose: () => void;
  printer?: PrinterType;
  locationId: number;
  locations: StoreLocation[];
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: printer?.name || "",
    type: printer?.type || "receipt",
    model: printer?.model || "",
    ipAddress: printer?.ipAddress || "",
    port: String(printer?.port ?? 9100),
    locationId: printer?.locationId ?? locationId,
    paperWidth: String(printer?.paperWidth ?? 80),
    autoCut: printer?.autoCut ?? true,
    openDrawer: printer?.openDrawer ?? false,
    isActive: printer?.isActive ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (printer) {
        const res = await apiRequest("PATCH", `/api/printers/${printer.id}`, data);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/printers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/printers"] });
      toast({ title: printer ? "Updated" : "Created", description: `Printer ${form.name} saved.` });
      onClose();
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      name: form.name,
      type: form.type,
      model: form.model || null,
      ipAddress: form.ipAddress,
      port: parseInt(form.port) || 9100,
      locationId: form.locationId,
      paperWidth: parseInt(form.paperWidth) || 80,
      autoCut: form.autoCut,
      openDrawer: form.openDrawer,
      isActive: form.isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{printer ? "Edit Printer" : "Add Printer"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-sm" placeholder="Kitchen Printer" data-testid="input-printer-name" />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="packing">Packing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Model</Label>
              <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="h-8 text-sm" placeholder="Star mC-Print3" />
            </div>
            <div>
              <Label className="text-xs">IP Address</Label>
              <Input value={form.ipAddress} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} className="h-8 text-sm font-mono" placeholder="192.168.1.100" data-testid="input-printer-ip" />
            </div>
            <div>
              <Label className="text-xs">Port</Label>
              <Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} className="h-8 text-sm font-mono" />
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Select value={String(form.locationId)} onValueChange={(v) => setForm({ ...form, locationId: Number(v) })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Paper Width (mm)</Label>
              <Select value={form.paperWidth} onValueChange={(v) => setForm({ ...form, paperWidth: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="80">80mm</SelectItem>
                  <SelectItem value="58">58mm</SelectItem>
                  <SelectItem value="40">40mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 pt-1">
            <div className="flex items-center gap-2">
              <Switch checked={form.autoCut} onCheckedChange={(v) => setForm({ ...form, autoCut: v })} className="scale-75" />
              <Label className="text-xs">Auto-cut</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.openDrawer} onCheckedChange={(v) => setForm({ ...form, openDrawer: v })} className="scale-75" />
              <Label className="text-xs">Kick drawer</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} className="scale-75" />
              <Label className="text-xs">Active</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending || !form.name || !form.ipAddress} data-testid="btn-save-printer">
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ User Dialog ============
function UserDialog({
  open,
  onClose,
  user,
  locations,
}: {
  open: boolean;
  onClose: () => void;
  user?: Omit<User, "password"> & { password?: string };
  locations: StoreLocation[];
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    username: user?.username || "",
    password: "",
    name: user?.name || "",
    role: user?.role || "cashier",
    locationId: user?.locationId ?? null,
    pin: user?.pin || "",
    email: user?.email || "",
    phone: user?.phone || "",
    hourlyRate: user?.hourlyRate ? String(user.hourlyRate) : "",
    isActive: user?.isActive ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (user) {
        const res = await apiRequest("PATCH", `/api/users/${user.id}`, data);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: user ? "Updated" : "Created", description: `User ${form.name} saved.` });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to save user.", variant: "destructive" });
    },
  });

  const handleSave = () => {
    const payload: any = {
      name: form.name,
      username: form.username,
      role: form.role,
      locationId: form.locationId,
      pin: form.pin || null,
      email: form.email || null,
      phone: form.phone || null,
      hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : null,
      isActive: form.isActive,
    };
    if (!user) {
      // Creating new — password required
      payload.password = form.password || form.username;
    } else if (form.password) {
      payload.password = form.password;
    }
    saveMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{user ? "Edit Staff" : "Add Staff"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-sm" placeholder="John Doe" data-testid="input-user-name" />
            </div>
            <div>
              <Label className="text-xs">Username</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="h-8 text-sm" placeholder="john" data-testid="input-user-username" />
            </div>
            <div>
              <Label className="text-xs">{user ? "New Password" : "Password"}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-8 text-sm" placeholder={user ? "Leave blank to keep" : "Required"} />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Select value={form.locationId ? String(form.locationId) : "all"} onValueChange={(v) => setForm({ ...form, locationId: v === "all" ? null : Number(v) })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">PIN Code</Label>
              <Input value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} className="h-8 text-sm font-mono" maxLength={6} placeholder="1234" />
            </div>
            <div>
              <Label className="text-xs">Hourly Rate ($)</Label>
              <Input type="number" step="0.25" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} className="h-8 text-sm" placeholder="14.00" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-8 text-sm" placeholder="john@sweethut.com" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-8 text-sm" placeholder="(xxx) xxx-xxxx" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            <Label className="text-xs">Account is active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending || !form.name || !form.username} data-testid="btn-save-user">
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Main Settings Page ============
export default function SettingsPage({ locationId }: { locationId: number }) {
  const { toast } = useToast();
  const [selectedLocId, setSelectedLocId] = useState<number>(locationId);
  const [printerDialogOpen, setPrinterDialogOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterType | undefined>();
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>();

  const { data: locations = [] } = useQuery<StoreLocation[]>({
    queryKey: ["/api/locations"],
  });

  const { data: allPrinters = [] } = useQuery<PrinterType[]>({
    queryKey: ["/api/printers"],
  });

  type SafeUser = Omit<User, "password">;
  const { data: users = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
  });

  const deletePrinterMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/printers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/printers"] });
      toast({ title: "Deleted", description: "Printer removed." });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Deleted", description: "User removed." });
    },
  });

  const selectedLocation = locations.find((l) => l.id === selectedLocId);

  return (
    <div className="flex flex-col h-full p-4" data-testid="settings-page">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="locations" className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0 w-fit">
          <TabsTrigger value="locations" data-testid="tab-locations">
            <MapPin className="w-3.5 h-3.5 mr-1" /> Locations
          </TabsTrigger>
          <TabsTrigger value="printers" data-testid="tab-printers">
            <Printer className="w-3.5 h-3.5 mr-1" /> Printers
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="w-3.5 h-3.5 mr-1" /> Staff
          </TabsTrigger>
        </TabsList>

        {/* ============ Locations Tab ============ */}
        <TabsContent value="locations" className="flex-1 min-h-0 mt-3">
          <div className="flex gap-4 h-full">
            {/* Location Selector */}
            <div className="w-52 shrink-0 space-y-2">
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocId(loc.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedLocId === loc.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:bg-muted/50"
                  }`}
                  data-testid={`select-location-${loc.id}`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-sm font-medium truncate">{loc.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate pl-5.5">{loc.city || loc.address}</p>
                  <Badge
                    variant={loc.isActive ? "default" : "secondary"}
                    className="text-[9px] mt-1.5 ml-5.5"
                  >
                    {loc.isActive ? "Active" : "Inactive"}
                  </Badge>
                </button>
              ))}
            </div>

            {/* Location Form */}
            <ScrollArea className="flex-1">
              {selectedLocation ? (
                <LocationEditForm key={selectedLocation.id} location={selectedLocation} locations={locations} />
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                  Select a location to edit
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        {/* ============ Printers Tab ============ */}
        <TabsContent value="printers" className="flex-1 min-h-0 mt-3">
          <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{allPrinters.length} printer{allPrinters.length !== 1 ? "s" : ""} configured</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setEditingPrinter(undefined); setPrinterDialogOpen(true); }}
                data-testid="btn-add-printer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Printer
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden flex-1">
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Location</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Model</TableHead>
                      <TableHead className="text-xs">IP Address</TableHead>
                      <TableHead className="text-xs w-[50px]">Paper</TableHead>
                      <TableHead className="text-xs w-[70px] text-center">Status</TableHead>
                      <TableHead className="text-xs w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPrinters.map((printer) => {
                      const loc = locations.find((l) => l.id === printer.locationId);
                      return (
                        <TableRow key={printer.id} data-testid={`printer-row-${printer.id}`}>
                          <TableCell className="font-medium text-sm">{printer.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{loc?.name?.split(" ").pop() || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] capitalize">{printer.type}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{printer.model || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{printer.ipAddress}</TableCell>
                          <TableCell className="text-xs">{printer.paperWidth}mm</TableCell>
                          <TableCell className="text-center">
                            {printer.isActive ? (
                              <div className="flex items-center justify-center gap-1 text-green-600">
                                <Wifi className="w-3 h-3" />
                                <span className="text-[10px]">Online</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                <WifiOff className="w-3 h-3" />
                                <span className="text-[10px]">Offline</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingPrinter(printer); setPrinterDialogOpen(true); }} data-testid={`btn-edit-printer-${printer.id}`}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deletePrinterMutation.mutate(printer.id)} data-testid={`btn-delete-printer-${printer.id}`}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>

          {printerDialogOpen && (
            <PrinterDialog
              open={printerDialogOpen}
              onClose={() => { setPrinterDialogOpen(false); setEditingPrinter(undefined); }}
              printer={editingPrinter}
              locationId={selectedLocId}
              locations={locations}
            />
          )}
        </TabsContent>

        {/* ============ Users / Staff Tab ============ */}
        <TabsContent value="users" className="flex-1 min-h-0 mt-3">
          <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{users.length} staff member{users.length !== 1 ? "s" : ""}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setEditingUser(undefined); setUserDialogOpen(true); }}
                data-testid="btn-add-user"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Staff
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden flex-1">
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Username</TableHead>
                      <TableHead className="text-xs">Role</TableHead>
                      <TableHead className="text-xs">Location</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">Phone</TableHead>
                      <TableHead className="text-xs">Rate</TableHead>
                      <TableHead className="text-xs w-[70px] text-center">Status</TableHead>
                      <TableHead className="text-xs w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const loc = locations.find((l) => l.id === user.locationId);
                      const RoleIcon = ROLE_ICONS[user.role ?? "cashier"] || UserCircle;
                      return (
                        <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                          <TableCell className="font-medium text-sm">
                            <div className="flex items-center gap-2">
                              <RoleIcon className="w-3.5 h-3.5 text-muted-foreground" />
                              {user.name}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{user.username}</TableCell>
                          <TableCell>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role ?? "cashier"] || ""}`}>
                              {user.role}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{loc?.name?.split(" ").pop() || "All"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{user.email || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{user.phone || "—"}</TableCell>
                          <TableCell className="text-xs">{user.hourlyRate ? `$${user.hourlyRate.toFixed(2)}/hr` : "—"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={user.isActive ? "default" : "secondary"} className="text-[9px]">
                              {user.isActive ? "Active" : "Disabled"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingUser(user); setUserDialogOpen(true); }} data-testid={`btn-edit-user-${user.id}`}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => deleteUserMutation.mutate(user.id)}
                                disabled={user.role === "admin"}
                                data-testid={`btn-delete-user-${user.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>

          {userDialogOpen && (
            <UserDialog
              open={userDialogOpen}
              onClose={() => { setUserDialogOpen(false); setEditingUser(undefined); }}
              user={editingUser}
              locations={locations}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
