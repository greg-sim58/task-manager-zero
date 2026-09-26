import { useState, useEffect, useRef } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Moon,
  Sun,
  PanelLeft,
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  Wrench,
  BarChart3,
  Calendar,
  Settings,
  HelpCircle,
  Search,
  ChevronRight,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useTheme } from "next-themes";
import { APP_VERSION } from "@/lib/version";
import { assignOrphanTasks } from "@/lib/ensureUnassignedProject";

// Real title per route. The layout used to hardcode "Dashboard Overview" on
// every page, which was wrong on 8 of 9 routes.
const routeMeta: { pattern: RegExp; title: string; crumb?: string }[] = [
  { pattern: /^\/$/, title: "Overview" },
  { pattern: /^\/projects$/, title: "Projects" },
  { pattern: /^\/projects\//, title: "Project", crumb: "Projects" },
  { pattern: /^\/tasks$/, title: "Tasks" },
  { pattern: /^\/notes$/, title: "Notes" },
  { pattern: /^\/tools$/, title: "Tools" },
  { pattern: /^\/reports$/, title: "Reports" },
  { pattern: /^\/calendar$/, title: "Calendar" },
  { pattern: /^\/settings$/, title: "Settings" },
  { pattern: /^\/support$/, title: "Support" },
];

function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const { toggleSidebar } = useSidebar();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const pages = [
    { label: "Overview", url: "/", icon: LayoutDashboard },
    { label: "Projects", url: "/projects", icon: FolderKanban },
    { label: "Tasks", url: "/tasks", icon: ListTodo },
    { label: "Calendar", url: "/calendar", icon: Calendar },
    { label: "Tools", url: "/tools", icon: Wrench },
    { label: "Reports", url: "/reports", icon: BarChart3 },
    { label: "Settings", url: "/settings", icon: Settings },
    { label: "Support", url: "/support", icon: HelpCircle },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to a page…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {pages.map((p) => (
            <CommandItem
              key={p.url}
              value={p.label}
              onSelect={() => {
                navigate(p.url);
                setOpen(false);
              }}
            >
              <p.icon className="h-4 w-4" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem
            value="Toggle theme"
            onSelect={() => {
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
              setOpen(false);
            }}
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            Toggle theme
          </CommandItem>
          <CommandItem
            value="Collapse sidebar"
            onSelect={() => {
              toggleSidebar();
              setOpen(false);
            }}
          >
            <PanelLeft className="h-4 w-4" />
            Toggle sidebar
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const hasSweptRef = useRef(false);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !hasSweptRef.current) {
        hasSweptRef.current = true;
        await assignOrphanTasks(session.user.id);
      }
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        hasSweptRef.current = false;
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!session) {
    return null;
  }

  const meta = routeMeta.find((m) => m.pattern.test(location.pathname));

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="relative flex-1 flex flex-col">
          {/* Atmosphere layer — gives the glass cards something to blur */}
          <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="aurora-field" />
            <div className="grain absolute inset-0" />
          </div>
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border/60 bg-background/60 px-6 backdrop-blur-xl">
            <SidebarTrigger />
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {meta && (
                <h1 className="truncate font-display text-2xl font-bold tracking-tight">
                  {meta.crumb && (
                    <span className="text-muted-foreground">{meta.crumb}</span>
                  )}
                  {meta.crumb && <ChevronRight className="mx-1 inline h-4 w-4 text-muted-foreground/50" />}
                  <span className={meta.crumb ? "text-primary" : undefined}>{meta.title}</span>
                </h1>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search"
                onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              >
                <Search className="h-[18px] w-[18px]" />
              </Button>
              <span className="mr-1 hidden font-mono text-[10px] tracking-wider text-muted-foreground/50 sm:inline">
                v{APP_VERSION}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Toggle theme"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
              </Button>
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
              </Button>
              <div className="mx-1 h-6 w-px bg-border" />
              <Button variant="ghost" size="icon" aria-label="Account">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-2 text-[11px] font-bold text-primary-foreground">
                  {session.user.email?.charAt(0).toUpperCase() || "U"}
                </span>
              </Button>
            </div>
          </header>
          <main className="relative z-10 flex-1 p-6">
            <div className="mx-auto w-full max-w-[1400px]">
              <Outlet />
            </div>
          </main>
        </div>
        <CommandMenu />
      </div>
    </SidebarProvider>
  );
}
