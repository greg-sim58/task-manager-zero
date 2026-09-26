import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Wrench,
  BarChart3,
  Calendar,
  Settings,
  HelpCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const workspaceItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Tasks", url: "/tasks", icon: ListTodo },
  { title: "Calendar", url: "/calendar", icon: Calendar },
];

const systemItems = [
  { title: "Tools", url: "/tools", icon: Wrench },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Support", url: "/support", icon: HelpCircle },
];

function GroupLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pb-2 pt-5 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/55">
      {children}
    </p>
  );
}

function NavItem({ item }: { item: (typeof workspaceItems)[number] }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild size="lg">
        <NavLink
          to={item.url}
          end={item.url === "/"}
          className={({ isActive }) =>
            cn(
              "group relative h-11 gap-3 overflow-hidden rounded-[var(--radius)] px-3 transition-all duration-300",
              isActive
                ? "font-semibold text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* Active rail — a gradient bar that fades in from the left */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-gradient-to-b from-primary via-primary-2 to-transparent transition-all duration-300",
                  isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-50"
                )}
              />
              {/* Wash behind the active row */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-0 rounded-[var(--radius)] bg-gradient-to-r from-primary/15 via-primary-2/5 to-transparent transition-opacity duration-300",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
              <item.icon
                className={cn(
                  "relative h-[18px] w-[18px] shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span className="relative tracking-tight">{item.title}</span>
            </>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}


export function AppSidebar() {
  const { open, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      navigate("/auth");
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/70 bg-sidebar/70 backdrop-blur-xl">
      <SidebarHeader className="border-b border-sidebar-border/60 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[calc(var(--radius)-2px)] bg-gradient-to-br from-primary via-primary to-primary-2 shadow-glow">
            <span className="font-display text-xl font-bold leading-none text-primary-foreground">
              0
            </span>
          </div>
          {open && (
            <div className="flex flex-col leading-none">
              <span className="font-display text-xl font-bold tracking-tight text-sidebar-foreground">
                Task Zero
              </span>
              <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                Workspace
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            {open && <GroupLabel>Workspace</GroupLabel>}
            <SidebarMenu>
              {workspaceItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            {open && <GroupLabel>System</GroupLabel>}
            <SidebarMenu>
              {systemItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 p-3">
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 rounded-[var(--radius)] text-muted-foreground"
            onClick={toggleSidebar}
          >
            {open ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
            {open && <span className="tracking-tight">Collapse</span>}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 rounded-[var(--radius)] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {open && <span className="tracking-tight">Sign out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
