import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { Clock, LogIn, LogOut, Timer, Coffee } from "lucide-react";
import type { User, Shift } from "@shared/schema";

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="text-center">
      <div className="text-5xl font-bold tabular-nums tracking-tight">
        {time.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </div>
      <div className="text-muted-foreground mt-1">
        {time.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>
    </div>
  );
}

function ElapsedTime({ clockIn }: { clockIn: string }) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(clockIn).getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [clockIn]);
  return <span className="font-mono text-lg">{elapsed}</span>;
}

export default function TimeClock({ locationId }: { locationId: number }) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [clockOutDialogOpen, setClockOutDialogOpen] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState("");
  const [clockOutNotes, setClockOutNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users
  const { data: users = [] } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/users"],
  });

  const activeUsers = users.filter((u) => u.isActive);

  // Fetch active shift for selected user
  const { data: activeShift } = useQuery<Shift | null>({
    queryKey: ["/api/shifts/active", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      const res = await fetch(`/api/shifts/active/${selectedUserId}`);
      return res.json();
    },
    enabled: !!selectedUserId,
    refetchInterval: 10000, // refresh every 10s
  });

  // Fetch recent shifts for this location
  const { data: recentShifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", locationId],
    queryFn: async () => {
      const res = await fetch(`/api/shifts?locationId=${locationId}`);
      return res.json();
    },
  });

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/shifts/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(selectedUserId),
          locationId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Clocked In", description: "Shift started successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts/active"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/shifts/clock-out/${selectedUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          breakMinutes: breakMinutes ? Number(breakMinutes) : 0,
          notes: clockOutNotes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Clocked Out",
        description: `Shift completed. Total: ${data.totalHours?.toFixed(2)} hours.`,
      });
      setClockOutDialogOpen(false);
      setBreakMinutes("");
      setClockOutNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts/active"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const selectedUser = activeUsers.find((u) => u.id === Number(selectedUserId));
  const isClockedIn = activeShift && activeShift.id;

  // Get user name by id helper
  const getUserName = (userId: number) => {
    const user = users.find((u) => u.id === userId);
    return user?.name || `User #${userId}`;
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Time Clock
          </h1>
          <p className="text-muted-foreground">Clock in and out for your shift</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clock In/Out Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              Clock In / Out
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Live Clock */}
            <LiveClock />

            {/* User Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Employee</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent>
                  {activeUsers.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status & Actions */}
            {selectedUserId && (
              <div className="space-y-4">
                {isClockedIn ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4 text-center space-y-2">
                      <Badge variant="default" className="bg-green-600">
                        Currently Clocked In
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        Since{" "}
                        {new Date(activeShift.clockIn).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Timer className="w-4 h-4 text-green-600" />
                        <ElapsedTime clockIn={String(activeShift.clockIn)} />
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      variant="destructive"
                      onClick={() => setClockOutDialogOpen(true)}
                    >
                      <LogOut className="w-5 h-5 mr-2" />
                      Clock Out
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-muted/50 border rounded-lg p-4 text-center">
                      <Badge variant="secondary">Not Clocked In</Badge>
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedUser?.name} is not currently on shift
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => clockInMutation.mutate()}
                      disabled={clockInMutation.isPending}
                    >
                      <LogIn className="w-5 h-5 mr-2" />
                      {clockInMutation.isPending ? "Clocking In..." : "Clock In"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!selectedUserId && (
              <div className="text-center text-muted-foreground py-4">
                Select an employee to clock in or out
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Shifts Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5" />
              Currently On Shift
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const activeShifts = recentShifts.filter((s) => s.status === "active");
              if (activeShifts.length === 0) {
                return (
                  <div className="text-center text-muted-foreground py-8">
                    No one is currently on shift
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  {activeShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{getUserName(shift.userId)}</div>
                        <div className="text-sm text-muted-foreground">
                          In since{" "}
                          {new Date(shift.clockIn).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-600">
                          Active
                        </Badge>
                        <ElapsedTime clockIn={String(shift.clockIn)} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Recent Shifts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Break</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentShifts.slice(0, 20).map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">
                    {getUserName(shift.userId)}
                  </TableCell>
                  <TableCell>
                    {new Date(shift.clockIn).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    {shift.clockOut
                      ? new Date(shift.clockOut).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {shift.breakMinutes ? (
                      <span className="flex items-center gap-1">
                        <Coffee className="w-3 h-3" />
                        {shift.breakMinutes}m
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {shift.totalHours != null
                      ? `${shift.totalHours.toFixed(2)}h`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={shift.status === "active" ? "default" : "secondary"}
                      className={shift.status === "active" ? "bg-green-600" : ""}
                    >
                      {shift.status === "active" ? "Active" : "Completed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {shift.notes || "—"}
                  </TableCell>
                </TableRow>
              ))}
              {recentShifts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No shifts recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Clock Out Dialog */}
      <Dialog open={clockOutDialogOpen} onOpenChange={setClockOutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clock Out - {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Coffee className="w-4 h-4" />
                Break Time (minutes)
              </label>
              <Input
                type="number"
                placeholder="0"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(e.target.value)}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Any notes about this shift..."
                value={clockOutNotes}
                onChange={(e) => setClockOutNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClockOutDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => clockOutMutation.mutate()}
              disabled={clockOutMutation.isPending}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {clockOutMutation.isPending ? "Clocking Out..." : "Confirm Clock Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
