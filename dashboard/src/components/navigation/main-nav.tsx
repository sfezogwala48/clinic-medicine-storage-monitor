import { Link, useMatchRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export type AppRoute =
  | "/"
  | "/realtime"
  | "/access"
  | "/alerts"
  | "/reports"
  | "/settings"
  | "/users";

export interface NavItem {
  to: AppRoute;
  label: string;
  exact?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Monitoring",
    items: [
      { to: "/", label: "Dashboard Home", exact: true },
      { to: "/realtime", label: "Real-Time View" },
      { to: "/access", label: "Access Log" },
    ],
  },
  {
    title: "Management",
    items: [
      { to: "/alerts", label: "Alerts & Events" },
      { to: "/reports", label: "Reports" },
    ],
  },
  {
    title: "System",
    items: [
      { to: "/settings", label: "Settings" },
      { to: "/users", label: "User Management" },
    ],
  },
];

interface MainNavProps {
  items: NavItem[];
  className?: string;
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
}

export function MainNav({
  items,
  className,
  orientation = "horizontal",
  onNavigate,
}: MainNavProps) {
  const matchRoute = useMatchRoute();

  return (
    <NavigationMenu
      orientation={orientation}
      className={cn(orientation === "vertical" && "max-w-none flex-col items-stretch", className)}
    >
      <NavigationMenuList
        className={cn(orientation === "vertical" && "flex-col items-stretch space-x-0 space-y-1")}
      >
        {items.map((item) => {
          const isActive = matchRoute({ to: item.to, fuzzy: !item.exact });

          return (
            <NavigationMenuItem
              key={item.to}
              className={cn(orientation === "vertical" && "w-full")}
            >
              <Link
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  navigationMenuTriggerStyle(),
                  orientation === "vertical" && "w-full justify-start bg-transparent",
                  isActive && "bg-accent text-accent-foreground font-medium",
                )}
              >
                {item.label}
              </Link>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
