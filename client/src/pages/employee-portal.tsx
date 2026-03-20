import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Clock, LogOut, User, CalendarDays, Timer, Coffee } from "lucide-react";

interface EmployeeUser {
  id: number;
  username: string;
  name: string;
  role: string;
  locationId: number | null;
  pin: string | null;
  email: string | null;
  phone: string | null;
  hourlyRate: number | null;
  isActive: boolean;
}

interface Shift {
  id: number;
  userId: number;
  locationId: number;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  notes: string | null;
  status: string;
  totalHours: number | null;
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ============ LOGIN / REGISTER ============
function AuthForm({ onLogin }: { onLogin: (user: EmployeeUser) => void }) {
  const [tab, setTab] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      const user = await res.json();
      onLogin(user);
      toast({ title: `Welcome back, ${user.name}!` });
    } catch (err: any) {
      setError(err.message?.includes("401") ? "Invalid username or password" : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/register", {
        username,
        password,
        name,
        pin: pin || undefined,
      });
      const user = await res.json();
      onLogin(user);
      toast({ title: `Account created! Welcome, ${user.name}!` });
    } catch (err: any) {
      if (err.message?.includes("409")) {
        setError("Username already taken");
      } else if (err.message?.includes("400")) {
        setError(err.message.split(": ").pop() || "Invalid information");
      } else {
        setError("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Sweet Hut Employee Portal</CardTitle>
          <CardDescription>View your clock-in/out history and shift details</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input
                    id="login-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Full Name</Label>
                  <Input
                    id="reg-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Username</Label>
                  <Input
                    id="reg-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-pin">Employee PIN (optional)</Label>
                  <Input
                    id="reg-pin"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit PIN from your manager"
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    If you have a PIN assigned by your manager, enter it to link your account to your existing employee record.
                  </p>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ DASHBOARD ============
function EmployeeDashboard({ user, onLogout }: { user: EmployeeUser; onLogout: () => void }) {
  const { data: shifts = [], isLoading } = useQuery<Shift[]>({
    queryKey: ["/api/employee/shifts"],
    queryFn: async () => {
      const res = await fetch("/api/employee/shifts", {
        headers: { "X-User-Id": String(user.id) },
      });
      if (!res.ok) throw new Error("Failed to load shifts");
      return res.json();
    },
  });

  const { data: locations = [] } = useQuery<any[]>({
    queryKey: ["/api/locations"],
  });

  const locationMap = new Map(locations.map((l: any) => [l.id, l.name]));

  // Summary stats
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);

  const thisWeekShifts = shifts.filter(
    (s) => new Date(s.clockIn) >= thisWeekStart && s.status === "completed"
  );
  const totalWeekHours = thisWeekShifts.reduce((sum, s) => sum + (s.totalHours || 0), 0);
  const totalWeekBreak = thisWeekShifts.reduce((sum, s) => sum + (s.breakMinutes || 0), 0);

  const completedShifts = shifts.filter((s) => s.status === "completed");
  const activeShift = shifts.find((s) => s.status === "active");

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-primary" />
            <span className="font-semibold text-lg">Sweet Hut Employee Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4" />
              <span>{user.name}</span>
              <Badge variant="secondary" className="text-xs">{user.role}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Active Shift Banner */}
        {activeShift && (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="font-medium text-green-700 dark:text-green-400">Currently Clocked In</span>
                <span className="text-sm text-muted-foreground ml-2">
                  since {formatDateTime(activeShift.clockIn)}
                  {activeShift.locationId && locationMap.get(activeShift.locationId) && (
                    <> at {locationMap.get(activeShift.locationId)}</>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Week Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Timer className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">This Week Hours</p>
                  <p className="text-2xl font-bold">{totalWeekHours.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CalendarDays className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Shifts This Week</p>
                  <p className="text-2xl font-bold">{thisWeekShifts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Coffee className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Break Time This Week</p>
                  <p className="text-2xl font-bold">{totalWeekBreak}m</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shift History */}
        <Card>
          <CardHeader>
            <CardTitle>Shift History</CardTitle>
            <CardDescription>Your clock-in and clock-out records</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading shifts...</p>
            ) : completedShifts.length === 0 && !activeShift ? (
              <p className="text-muted-foreground text-center py-8">No shift records found</p>
            ) : (
              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Break</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell className="font-medium">{formatDate(shift.clockIn)}</TableCell>
                        <TableCell>{locationMap.get(shift.locationId) || `Location ${shift.locationId}`}</TableCell>
                        <TableCell>{formatTime(shift.clockIn)}</TableCell>
                        <TableCell>{shift.clockOut ? formatTime(shift.clockOut) : "—"}</TableCell>
                        <TableCell>{shift.breakMinutes ? `${shift.breakMinutes}m` : "—"}</TableCell>
                        <TableCell>{shift.totalHours ? `${shift.totalHours.toFixed(1)}h` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={shift.status === "active" ? "default" : "secondary"}>
                            {shift.status === "active" ? "Active" : "Completed"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============ MAIN PORTAL ============
export default function EmployeePortal() {
  const [user, setUser] = useState<EmployeeUser | null>(null);

  // Restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("employee-user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem("employee-user");
      }
    }
  }, []);

  const handleLogin = (u: EmployeeUser) => {
    setUser(u);
    localStorage.setItem("employee-user", JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("employee-user");
  };

  if (!user) {
    return <AuthForm onLogin={handleLogin} />;
  }

  return <EmployeeDashboard user={user} onLogout={handleLogout} />;
}
