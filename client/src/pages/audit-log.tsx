import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Search, Filter } from "lucide-react";
import type { AuditLog } from "@shared/schema";

const PAGE_SIZE = 100;

const actionTypes = [
  { value: "all", label: "All Actions" },
  { value: "void_order", label: "Void Order" },
  { value: "refund", label: "Refund" },
  { value: "cancel_order", label: "Cancel Order" },
  { value: "cash_drawer_open", label: "Cash Drawer Open" },
  { value: "price_change", label: "Price Change" },
  { value: "discount_applied", label: "Discount Applied" },
  { value: "split_payment", label: "Split Payment" },
  { value: "login", label: "Login" },
  { value: "settings_change", label: "Settings Change" },
] as const;

const actionBadgeConfig: Record<string, { label: string; className: string }> = {
  void_order: {
    label: "Void Order",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  refund: {
    label: "Refund",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  cancel_order: {
    label: "Cancel Order",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  login: {
    label: "Login",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  cash_drawer_open: {
    label: "Cash Drawer",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  split_payment: {
    label: "Split Payment",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  discount_applied: {
    label: "Discount",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  price_change: {
    label: "Price Change",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  settings_change: {
    label: "Settings",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
};

function getActionBadge(action: string) {
  const config = actionBadgeConfig[action];
  if (config) {
    return config;
  }
  return {
    label: action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTarget(targetType: string | null, targetId: number | null): string {
  if (!targetType) return "—";
  const prefix = targetType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (targetId != null) {
    if (targetType === "order") {
      return `Order #SH-${String(targetId).padStart(4, "0")}`;
    }
    return `${prefix} #${targetId}`;
  }
  return prefix;
}

export default function AuditLogPage({ locationId }: { locationId: number }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: auditLogs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs", locationId],
    queryFn: async () => {
      const res = await fetch(`/api/audit-logs?locationId=${locationId}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  const filteredLogs = useMemo(() => {
    let logs = auditLogs;

    if (actionFilter !== "all") {
      logs = logs.filter((log) => log.action === actionFilter);
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      logs = logs.filter((log) => new Date(log.createdAt) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      logs = logs.filter((log) => new Date(log.createdAt) <= end);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      logs = logs.filter(
        (log) =>
          (log.userName && log.userName.toLowerCase().includes(query)) ||
          (log.details && log.details.toLowerCase().includes(query))
      );
    }

    return logs;
  }, [auditLogs, actionFilter, startDate, endDate, searchQuery]);

  const visibleLogs = filteredLogs.slice(0, visibleCount);
  const hasMore = filteredLogs.length > visibleCount;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            Track all system activity and changes
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1.5 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user or details..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="w-[200px]">
              <label className="text-sm font-medium mb-1.5 block">Action Type</label>
              <Select
                value={actionFilter}
                onValueChange={(value) => {
                  setActionFilter(value);
                  setVisibleCount(PAGE_SIZE);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[170px]">
              <label className="text-sm font-medium mb-1.5 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
              />
            </div>

            <div className="w-[170px]">
              <label className="text-sm font-medium mb-1.5 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Activity Log
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                Loading audit logs...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Shield className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No audit log entries found</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead className="w-[140px]">User</TableHead>
                      <TableHead className="w-[150px]">Action</TableHead>
                      <TableHead className="w-[160px]">Target</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleLogs.map((log) => {
                      const badge = getActionBadge(log.action);
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatTimestamp(log.createdAt)}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {log.userName ?? "System"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={badge.className}
                            >
                              {badge.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatTarget(log.targetType, log.targetId)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                            {log.details ?? "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {hasMore && (
                  <div className="flex justify-center py-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    >
                      Load More ({filteredLogs.length - visibleCount} remaining)
                    </Button>
                  </div>
                )}
              </>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
