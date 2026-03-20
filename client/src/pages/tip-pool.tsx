import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Coins, Settings, Users, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Matches the actual API response shape
interface TipPoolConfigData {
  id: number;
  locationId: number;
  name: string;
  isActive: boolean;
  cashierPercent: number;
  kitchenPercent: number;
  managerPercent: number;
  method: string;
}

interface DistributionEntry {
  userId: number;
  name: string;
  role: string;
  hoursWorked: number;
  tipSharePercent: number;
  tipAmount: number;
}

interface DistributionResponse {
  totalTips: number;
  startDate: string;
  endDate: string;
  method: string;
  distribution: DistributionEntry[];
}

export default function TipPool({ locationId }: { locationId: number }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("configuration");

  // Configuration state
  const [poolName, setPoolName] = useState("Default Pool");
  const [method, setMethod] = useState("equal");
  const [cashierPercent, setCashierPercent] = useState(40);
  const [kitchenPercent, setKitchenPercent] = useState(30);
  const [managerPercent, setManagerPercent] = useState(30);
  const [configId, setConfigId] = useState<number>(0);

  // Distribution state
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);

  const roleTotal = cashierPercent + kitchenPercent + managerPercent;
  const isRoleTotalValid = roleTotal === 100;

  // Fetch config
  const { data: config, isLoading: configLoading } = useQuery<TipPoolConfigData>({
    queryKey: ["/api/tip-pool/config", { locationId }],
    queryFn: async () => {
      const res = await fetch(`/api/tip-pool/config?locationId=${locationId}`);
      return res.json();
    },
  });

  // Sync config into local state when loaded
  useEffect(() => {
    if (config) {
      setPoolName(config.name || "Default Pool");
      setMethod(config.method || "equal");
      setCashierPercent(config.cashierPercent ?? 40);
      setKitchenPercent(config.kitchenPercent ?? 30);
      setManagerPercent(config.managerPercent ?? 30);
      setConfigId(config.id || 0);
    }
  }, [config]);

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        locationId,
        name: poolName,
        method,
        cashierPercent,
        kitchenPercent,
        managerPercent,
        isActive: true,
      };
      if (configId > 0) {
        await apiRequest("PATCH", `/api/tip-pool/config/${configId}`, payload);
      } else {
        await apiRequest("POST", "/api/tip-pool/config", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tip-pool/config"] });
      toast({ title: "Configuration saved", description: "Tip pool settings updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Fetch distribution
  const { data: distribution, isLoading: distributionLoading } = useQuery<DistributionResponse>({
    queryKey: ["/api/tip-pool/distribute", { locationId, startDate, endDate }],
    queryFn: async () => {
      const res = await fetch(`/api/tip-pool/distribute?locationId=${locationId}&startDate=${startDate}&endDate=${endDate}`);
      return res.json();
    },
    enabled: !!startDate && !!endDate,
  });

  const handlePercentChange = (role: "cashier" | "kitchen" | "manager", value: string) => {
    const num = Math.max(0, Math.min(100, parseInt(value) || 0));
    if (role === "cashier") setCashierPercent(num);
    else if (role === "kitchen") setKitchenPercent(num);
    else setManagerPercent(num);
  };

  return (
    <div className="h-full overflow-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Coins className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Tip Pool</h1>
          <p className="text-sm text-muted-foreground">
            Configure and distribute tips among staff
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="configuration" className="gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="distribution" className="gap-2">
            <Users className="h-4 w-4" />
            Distribution
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle>Tip Pool Configuration</CardTitle>
              <CardDescription>
                Set up how tips are pooled and distributed among staff roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {configLoading ? (
                <p className="text-muted-foreground">Loading configuration...</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="poolName">Pool Name</Label>
                    <Input
                      id="poolName"
                      value={poolName}
                      onChange={(e) => setPoolName(e.target.value)}
                      placeholder="e.g. Daily Tip Pool"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Distribution Method</Label>
                    <Select value={method} onValueChange={setMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equal">Equal Split</SelectItem>
                        <SelectItem value="hours_worked">Based on Hours Worked</SelectItem>
                        <SelectItem value="custom">Custom Percentages</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      <Label className="text-base font-semibold">Role Percentages</Label>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cashierPct">Cashier %</Label>
                        <Input
                          id="cashierPct"
                          type="number"
                          min={0}
                          max={100}
                          value={cashierPercent}
                          onChange={(e) => handlePercentChange("cashier", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="kitchenPct">Kitchen %</Label>
                        <Input
                          id="kitchenPct"
                          type="number"
                          min={0}
                          max={100}
                          value={kitchenPercent}
                          onChange={(e) => handlePercentChange("kitchen", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="managerPct">Manager %</Label>
                        <Input
                          id="managerPct"
                          type="number"
                          min={0}
                          max={100}
                          value={managerPercent}
                          onChange={(e) => handlePercentChange("manager", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={isRoleTotalValid ? "default" : "destructive"}>
                        Total: {roleTotal}%
                      </Badge>
                      {!isRoleTotalValid && (
                        <span className="text-sm text-destructive">
                          Role percentages must sum to 100%
                        </span>
                      )}
                      {isRoleTotalValid && (
                        <span className="text-sm text-green-600">Valid</span>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => saveConfigMutation.mutate()}
                    disabled={!isRoleTotalValid || saveConfigMutation.isPending}
                  >
                    {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Tip Distribution</CardTitle>
              <CardDescription>
                View how tips are distributed among employees for a given period.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {distributionLoading && (
                <p className="text-muted-foreground">Loading distribution data...</p>
              )}

              {distribution && (
                <>
                  <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Coins className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total Tips ({distribution.method})</p>
                          <p className="text-2xl font-bold text-green-700">${distribution.totalTips.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {distribution.distribution.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                          <TableHead className="text-right">Share %</TableHead>
                          <TableHead className="text-right">Tip Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {distribution.distribution.map((entry) => (
                          <TableRow key={entry.userId}>
                            <TableCell className="font-medium">{entry.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{entry.role}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{entry.hoursWorked}h</TableCell>
                            <TableCell className="text-right">{entry.tipSharePercent}%</TableCell>
                            <TableCell className="text-right font-semibold text-green-700">
                              ${entry.tipAmount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No tip data for this date range.
                    </p>
                  )}
                </>
              )}

              {!distribution && !distributionLoading && (
                <p className="text-muted-foreground text-center py-8">
                  Select a date range to view tip distribution.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
