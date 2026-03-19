import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Award,
  Coins,
  Gift,
  ArrowRight,
  Save,
  Loader2,
} from "lucide-react";
import type { RewardConfig } from "@shared/schema";

const tierColors: Record<string, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2",
};

const rewardConfigSchema = z.object({
  programName: z.string().min(1, "Program name is required"),
  isActive: z.boolean(),
  pointsPerDollar: z.coerce.number().int().min(1),
  bonusPointsEnabled: z.boolean(),
  bonusMultiplier: z.coerce.number().min(1),
  pointsPerReward: z.coerce.number().int().min(1),
  rewardValue: z.coerce.number().min(0.01),
  minRedeemPoints: z.coerce.number().int().min(0),
  maxRedeemPercent: z.coerce.number().int().min(0).max(100),
  silverThreshold: z.coerce.number().int().min(1),
  goldThreshold: z.coerce.number().int().min(1),
  platinumThreshold: z.coerce.number().int().min(1),
  silverMultiplier: z.coerce.number().min(1),
  goldMultiplier: z.coerce.number().min(1),
  platinumMultiplier: z.coerce.number().min(1),
});

type RewardConfigFormValues = z.infer<typeof rewardConfigSchema>;

export default function RewardsConfig() {
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery<RewardConfig>({
    queryKey: ["/api/rewards/config"],
  });

  const form = useForm<RewardConfigFormValues>({
    resolver: zodResolver(rewardConfigSchema),
    defaultValues: {
      programName: "Sweet Rewards",
      isActive: true,
      pointsPerDollar: 1,
      bonusPointsEnabled: false,
      bonusMultiplier: 2,
      pointsPerReward: 100,
      rewardValue: 1,
      minRedeemPoints: 50,
      maxRedeemPercent: 50,
      silverThreshold: 500,
      goldThreshold: 2000,
      platinumThreshold: 5000,
      silverMultiplier: 1.25,
      goldMultiplier: 1.5,
      platinumMultiplier: 2,
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        programName: config.programName || "Sweet Rewards",
        isActive: config.isActive ?? true,
        pointsPerDollar: config.pointsPerDollar ?? 1,
        bonusPointsEnabled: config.bonusPointsEnabled ?? false,
        bonusMultiplier: config.bonusMultiplier ?? 2,
        pointsPerReward: config.pointsPerReward ?? 100,
        rewardValue: config.rewardValue ?? 1,
        minRedeemPoints: config.minRedeemPoints ?? 50,
        maxRedeemPercent: config.maxRedeemPercent ?? 50,
        silverThreshold: config.silverThreshold ?? 500,
        goldThreshold: config.goldThreshold ?? 2000,
        platinumThreshold: config.platinumThreshold ?? 5000,
        silverMultiplier: config.silverMultiplier ?? 1.25,
        goldMultiplier: config.goldMultiplier ?? 1.5,
        platinumMultiplier: config.platinumMultiplier ?? 2,
      });
    }
  }, [config, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: RewardConfigFormValues) => {
      const res = await apiRequest("PATCH", "/api/rewards/config", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings Saved", description: "Reward program settings updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/config"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (data: RewardConfigFormValues) => {
    saveMutation.mutate(data);
  };

  const watchedValues = form.watch();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="rewards-config-page">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-2 shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{watchedValues.programName || "Sweet Rewards"}</h1>
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-program-active"
                      />
                    </FormControl>
                    <Badge variant={field.value ? "default" : "secondary"} className="text-[10px]">
                      {field.value ? "Active" : "Inactive"}
                    </Badge>
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" size="sm" disabled={saveMutation.isPending} data-testid="button-save-rewards">
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1.5" />
              )}
              Save Changes
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 px-4 pb-4">
            <div className="grid grid-cols-2 gap-4 max-w-5xl">
              {/* Program Name */}
              <Card className="col-span-2">
                <CardContent className="p-4">
                  <FormField
                    control={form.control}
                    name="programName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Program Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="max-w-sm" data-testid="input-program-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Earning Rules */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" />
                    Earning Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <FormField
                    control={form.control}
                    name="pointsPerDollar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points per dollar spent</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={1} data-testid="input-points-per-dollar" />
                        </FormControl>
                        <FormDescription>Customers earn this many points for every $1 spent.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="bonusPointsEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Bonus Points</FormLabel>
                            <FormDescription>Enable bonus point multiplier for special events.</FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-bonus-points"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    {watchedValues.bonusPointsEnabled && (
                      <FormField
                        control={form.control}
                        name="bonusMultiplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bonus Multiplier</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.25" {...field} min={1} data-testid="input-bonus-multiplier" />
                            </FormControl>
                            <FormDescription>{field.value}x points during bonus events.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Redemption Rules */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Gift className="w-4 h-4 text-primary" />
                    Redemption Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="pointsPerReward"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Points per reward</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} min={1} data-testid="input-points-per-reward" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rewardValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reward value ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} min={0.01} data-testid="input-reward-value" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                    {watchedValues.pointsPerReward} points = ${watchedValues.rewardValue?.toFixed(2) ?? "1.00"} discount
                  </div>
                  <FormField
                    control={form.control}
                    name="minRedeemPoints"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum points to redeem</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min={0} data-testid="input-min-redeem" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxRedeemPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max % of order payable by points</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-3">
                            <Slider
                              min={0}
                              max={100}
                              step={5}
                              value={[field.value]}
                              onValueChange={([v]) => field.onChange(v)}
                              className="flex-1"
                              data-testid="slider-max-redeem"
                            />
                            <span className="text-sm font-medium w-10 text-right">{field.value}%</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Tier Configuration */}
              <Card className="col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    Tier Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {/* Visual tier ladder */}
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    {(["bronze", "silver", "gold", "platinum"] as const).map((tier, idx) => (
                      <div key={tier} className="flex items-center gap-2 flex-1">
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <Badge
                            className="text-[10px] font-semibold capitalize border-0 w-full justify-center"
                            style={{
                              backgroundColor: tierColors[tier],
                              color: tier === "gold" ? "#5C4300" : "#fff",
                            }}
                          >
                            {tier}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {tier === "bronze"
                              ? "0 pts"
                              : tier === "silver"
                              ? `${watchedValues.silverThreshold?.toLocaleString() ?? 500} pts`
                              : tier === "gold"
                              ? `${watchedValues.goldThreshold?.toLocaleString() ?? 2000} pts`
                              : `${watchedValues.platinumThreshold?.toLocaleString() ?? 5000} pts`}
                          </span>
                        </div>
                        {idx < 3 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                      </div>
                    ))}
                  </div>

                  {/* Tier settings grid */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Silver */}
                    <div className="space-y-3 p-3 border rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tierColors.silver }} />
                        <span className="text-sm font-medium">Silver</span>
                      </div>
                      <FormField
                        control={form.control}
                        name="silverThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Threshold (lifetime pts)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} className="h-8 text-sm" data-testid="input-silver-threshold" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="silverMultiplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Earning Multiplier</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.05" {...field} className="h-8 text-sm" data-testid="input-silver-multiplier" />
                            </FormControl>
                            <FormDescription className="text-[10px]">{field.value}x points earned</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Gold */}
                    <div className="space-y-3 p-3 border rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tierColors.gold }} />
                        <span className="text-sm font-medium">Gold</span>
                      </div>
                      <FormField
                        control={form.control}
                        name="goldThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Threshold (lifetime pts)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} className="h-8 text-sm" data-testid="input-gold-threshold" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="goldMultiplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Earning Multiplier</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.05" {...field} className="h-8 text-sm" data-testid="input-gold-multiplier" />
                            </FormControl>
                            <FormDescription className="text-[10px]">{field.value}x points earned</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Platinum */}
                    <div className="space-y-3 p-3 border rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tierColors.platinum }} />
                        <span className="text-sm font-medium">Platinum</span>
                      </div>
                      <FormField
                        control={form.control}
                        name="platinumThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Threshold (lifetime pts)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} className="h-8 text-sm" data-testid="input-platinum-threshold" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="platinumMultiplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Earning Multiplier</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.05" {...field} className="h-8 text-sm" data-testid="input-platinum-multiplier" />
                            </FormControl>
                            <FormDescription className="text-[10px]">{field.value}x points earned</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </form>
      </Form>
    </div>
  );
}
