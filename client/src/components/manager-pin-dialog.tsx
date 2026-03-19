import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Delete, KeyRound, Loader2 } from "lucide-react";

interface AuthorizedUser {
  id: number;
  name: string;
  role: string;
}

interface ManagerPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthorized: (user: AuthorizedUser) => void;
  actionDescription?: string;
}

export function ManagerPinDialog({
  open,
  onOpenChange,
  onAuthorized,
  actionDescription,
}: ManagerPinDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError("");
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  const handleClear = () => {
    setPin("");
    setError("");
  };

  const handleSubmit = async () => {
    if (pin.length < 4) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest("POST", "/api/auth/verify-manager-pin", { pin });
      const user = await res.json();
      setPin("");
      onAuthorized(user);
    } catch (err: any) {
      const msg = err.message || "Verification failed";
      if (msg.includes("403")) {
        setError("Manager authorization required");
      } else if (msg.includes("401")) {
        setError("Invalid PIN");
      } else {
        setError(msg);
      }
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPin("");
      setError("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            Manager Authorization
          </DialogTitle>
          {actionDescription && (
            <DialogDescription className="text-sm">
              {actionDescription}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* PIN dots */}
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
              >
                {digit}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="h-14 rounded-lg border bg-card text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => handleDigit("0")}
              className="h-14 rounded-lg border bg-card text-lg font-semibold hover:bg-accent transition-colors active:scale-95"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="h-14 rounded-lg border bg-card flex items-center justify-center hover:bg-accent transition-colors"
            >
              <Delete className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <Button
            className="w-full h-12 text-base"
            onClick={handleSubmit}
            disabled={pin.length < 4 || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              "Authorize"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
