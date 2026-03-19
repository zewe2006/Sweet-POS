import { Link, useLocation } from "wouter";
import {
  ShoppingCart,
  UtensilsCrossed,
  ClipboardList,
  BookOpen,
  BarChart3,
  Megaphone,
  Settings,
  MapPin,
  Users,
  Gift,
  Trophy,
  Clock,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import type { Location as StoreLocation } from "@shared/schema";

const navItems = [
  { title: "POS", href: "/", icon: ShoppingCart },
  { title: "Kitchen Display", href: "/kitchen", icon: UtensilsCrossed },
  { title: "Orders", href: "/orders", icon: ClipboardList },
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Gift Cards", href: "/gift-cards", icon: Gift },
  { title: "Rewards", href: "/rewards", icon: Trophy },
  { title: "Time Clock", href: "/time-clock", icon: Clock },
  { title: "Menu", href: "/menu", icon: BookOpen },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Promotions", href: "/promotions", icon: Megaphone },
  { title: "Settings", href: "/settings", icon: Settings },
];

function SweetHutLogo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Sweet Hut Logo"
    >
      {/* Bread/bun shape */}
      <path
        d="M6 22C6 22 6 14 16 10C26 14 26 22 26 22H6Z"
        fill="hsl(var(--primary))"
        opacity="0.9"
      />
      {/* Base line */}
      <rect x="4" y="22" width="24" height="3" rx="1.5" fill="hsl(var(--primary))" />
      {/* Steam lines */}
      <path
        d="M12 8C12 8 11 5 12 3"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M16 7C16 7 15 4 16 2"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M20 8C20 8 19 5 20 3"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

interface AppSidebarProps {
  locationId: number;
  onLocationChange: (id: number) => void;
}

export function AppSidebar({ locationId, onLocationChange }: AppSidebarProps) {
  const [location] = useLocation();

  const { data: locations = [] } = useQuery<StoreLocation[]>({
    queryKey: ["/api/locations"],
  });

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2.5" data-testid="link-home">
          <SweetHutLogo />
          <span className="font-semibold text-base tracking-tight">Sweet Hut</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? location === "/" || location === ""
                    : location.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.href}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
          <MapPin className="w-3 h-3" />
          <span>Location</span>
        </div>
        <Select
          value={String(locationId)}
          onValueChange={(v) => onLocationChange(Number(v))}
        >
          <SelectTrigger className="w-full text-sm" data-testid="select-location">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={String(loc.id)} data-testid={`location-${loc.id}`}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SidebarFooter>
    </Sidebar>
  );
}
