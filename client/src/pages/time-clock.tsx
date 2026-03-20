import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Clock, LogIn, LogOut, Timer, Coffee, Delete, KeyRound, Pencil, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
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

function PinPad({
  pin,
  onPinChange,
  onSubmit,
  loading,
  error,
}: {
  pin: string;
  onPinChange: (pin: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string;
}) {
  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      onPinChange(newPin);
    }
  };

  const handleBackspace = () => {
    onPinChange(pin.slice(0, -1));
  };

  const handleClear = () => {
    onPinChange("");
  };

  return (
    <div className="space-y-4">
      {/* PIN display */}
      <div className="flex items-center justify-center gap-1">
        <KeyRound className="w-4 h-4 text-muted-foreground mr-2" />
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < pin.length
                  ? "bg-primary border-primary"
                  : "border-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button
            key={digit}
            onClick={() => handleDigit(digit)}
            className="h-14 rounded-lg border bg-card text-lg font-semibold hover:bg-accent transition-colors active:scale-95"
            data-testid={`pin-${digit}`}
          >
            {digit}
          </button>
        ))}
        <button
          onClick={handleClear}
          className="h-14 rounded-lg border bg-card text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
          data-testid="pin-clear"
        >
          Clear
        </button>
        <button
          onClick={() => handleDigit("0")}
          className="h-14 rounded-lg border bg-card text-lg font-semibold hover:bg-accent transition-colors active:scale-95"
          data-testid="pin-0"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          className="h-14 rounded-lg border bg-card flex items-center justify-center hover:bg-accent transition-colors"
          data-testid="pin-backspace"
        >
          <Delete className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <Button
        className="w-full h-12 text-base"
        onClick={onSubmit}
        disabled={pin.length < 4 || loading}
        data-testid="button-pin-submit"
      >
        {loading ? "Verifying..." : "Enter"}
      </Button>
    </div>
  );
}

export default function TimeClock({ locationId }: { locationId: number }) {
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [identifiedUser, setIdentifiedUser] = useState<Omit<User, "password"> | null>(null);
  const [clockOutDialogOpen, setClockOutDialogOpen] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState("");
  const [clockOutNotes, setClockOutNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch users
  const { data: users = [] } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/users"],
  });

  const activeUsers = users.filter((u) => u.isActive);

  // Fetch active shift for identified user
  const { data: activeShift } = useQuery<Shift | null>({
    queryKey: ["/api/shifts/active", identifiedUser?.id],
    queryFn: async () => {
      if (!identifiedUser) return null;
      const res = await fetch(`/api/shifts/active/${identifiedUser.id}`);
      return res.json();
    },
    enabled: !!identifiedUser,
    refetchInterval: 10000,
  });

  // Fetch recent shifts for this location
  const { data: recentShifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", locationId],
    queryFn: async () => {
      const res = await fetch(`/api/shifts?locationId=${locationId}`);
      return res.json();
    },
  });

  // Auto-reset back to PIN screen after 30s of inactivity
  useEffect(() => {
    if (identifiedUser) {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setIdentifiedUser(null);
        setPin("");
      }, 30000);
      return () => {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      };
    }
  }, [identifiedUser]);

  const handlePinSubmit = () => {
    setPinError("");
    const matched = activeUsers.find((u) => u.pin === pin);
    if (matched) {
      setIdentifiedUser(matched);
      setPin("");
    } else {
      setPinError("Invalid PIN. Try again.");
      setPin("");
    }
  };

  // Also allow pressing Enter on the last digit
  useEffect(() => {
    if (pin.length === 6 && !identifiedUser) {
      handlePinSubmit();
    }
  }, [pin]);

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!identifiedUser) throw new Error("No user identified");
      const res = await fetch("/api/shifts/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: identifiedUser.id,
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
      toast({ title: "Clocked In", description: `${identifiedUser?.name} is now on shift.` });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts/active"] });
      // Go back to PIN screen after clock in
      setTimeout(() => {
        setIdentifiedUser(null);
        setPin("");
      }, 3000);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!identifiedUser) throw new Error("No user identified");
      const res = await fetch(`/api/shifts/clock-out/${identifiedUser.id}`, {
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
        description: `${identifiedUser?.name} — ${data.totalHours?.toFixed(2)} hours.`,
      });
      setClockOutDialogOpen(false);
      setBreakMinutes("");
      setClockOutNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts/active"] });
      // Go back to PIN screen
      setTimeout(() => {
        setIdentifiedUser(null);
        setPin("");
      }, 3000);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Admin adjust shift
  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editBreak, setEditBreak] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const openEditDialog = (shift: Shift) => {
    setEditShift(shift);
    // Format datetime-local value
    const fmtDT = (d: Date | string | null) => {
      if (!d) return "";
      const dt = new Date(d);
      return dt.getFullYear() + "-" +
        String(dt.getMonth() + 1).padStart(2, "0") + "-" +
        String(dt.getDate()).padStart(2, "0") + "T" +
        String(dt.getHours()).padStart(2, "0") + ":" +
        String(dt.getMinutes()).padStart(2, "0");
    };
    setEditClockIn(fmtDT(shift.clockIn));
    setEditClockOut(shift.clockOut ? fmtDT(shift.clockOut) : "");
    setEditBreak(String(shift.breakMinutes ?? 0));
    setEditNotes(shift.notes ?? "");
  };

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!editShift) throw new Error("No shift selected");
      const body: Record<string, unknown> = {};
      if (editClockIn) body.clockIn = new Date(editClockIn).toISOString();
      if (editClockOut) body.clockOut = new Date(editClockOut).toISOString();
      body.breakMinutes = Number(editBreak) || 0;
      body.notes = editNotes || null;
      const res = await apiRequest("PATCH", `/api/shifts/${editShift.id}`, body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Shift Updated", description: "Time clock entry has been adjusted." });
      setEditShift(null);
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/shifts/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Shift Deleted", description: "Time clock entry has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isClockedIn = activeShift && activeShift.id;

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
          <p className="text-muted-foreground">Enter your PIN to clock in or out</p>
        </div>
        {identifiedUser && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setIdentifiedUser(null); setPin(""); }}
          >
            Switch User
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clock In/Out Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              {identifiedUser ? identifiedUser.name : "Clock In / Out"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Live Clock */}
            <LiveClock />

            {!identifiedUser ? (
              /* PIN Entry */
              <PinPad
                pin={pin}
                onPinChange={(p) => { setPin(p); setPinError(""); }}
                onSubmit={handlePinSubmit}
                loading={false}
                error={pinError}
              />
            ) : (
              /* Status & Actions */
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
                      className="w-full h-12 text-base"
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
                        {identifiedUser.name} is not currently on shift
                      </p>
                    </div>
                    <Button
                      className="w-full h-12 text-base"
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
                <TableHead className="text-right">Actions</TableHead>
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
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(shift)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete shift for ${getUserName(shift.userId)}?`)) {
                            deleteMutation.mutate(shift.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {recentShifts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No shifts recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Shift Dialog */}
      <Dialog open={!!editShift} onOpenChange={(open) => !open && setEditShift(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Time Clock — {editShift ? getUserName(editShift.userId) : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Clock In</Label>
              <Input
                type="datetime-local"
                value={editClockIn}
                onChange={(e) => setEditClockIn(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Clock Out</Label>
              <Input
                type="datetime-local"
                value={editClockOut}
                onChange={(e) => setEditClockOut(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Break (minutes)</Label>
              <Input
                type="number"
                placeholder="0"
                value={editBreak}
                onChange={(e) => setEditBreak(e.target.value)}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Reason for adjustment..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditShift(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => adjustMutation.mutate()}
              disabled={adjustMutation.isPending}
            >
              <Pencil className="w-4 h-4 mr-2" />
              {adjustMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clock Out Dialog */}
      <Dialog open={clockOutDialogOpen} onOpenChange={setClockOutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clock Out - {identifiedUser?.name}</DialogTitle>
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
