import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ComponentType } from "react";
import { KanbanSquare, FileSignature, Library,
  Bell, BookOpen, Briefcase, CalendarClock, ClipboardList, FileText, Inbox, LayoutDashboard, LogOut, Menu,
  MessageSquareQuote, Receipt, Settings, Timer, Users, Wallet, X, ScrollText, Send, BarChart3, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/session";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: ComponentType<{ className?: string }>; manager?: boolean };

const staffNav: { group: string; items: Item[] }[] = [
  { group: "Practice", items: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/clients", label: "Clients", icon: Users },
    { to: "/engagements", label: "Engagements", icon: Briefcase },
    { to: "/tasks", label: "Tasks", icon: ClipboardList },
    { to: "/queries", label: "Queries", icon: MessageSquareQuote },
    { to: "/audit-papers", label: "Audit working papers", icon: ScrollText },
    { to: "/mrl", label: "Representation letters", icon: FileSignature },
    { to: "/library", label: "Study material", icon: Library },
  ]},
  { group: "Compliance", items: [
    { to: "/compliance-board", label: "Compliance board", icon: KanbanSquare },
    { to: "/compliance", label: "Statute calendar", icon: CalendarClock },
    { to: "/reminders", label: "Reminders", icon: Bell },
    { to: "/documents", label: "Document register", icon: BookOpen },
    { to: "/portal-inbox", label: "Client requests", icon: Inbox },
    { to: "/messages", label: "Messages & digest", icon: Send },
  ]},
  { group: "Finance", items: [
    { to: "/invoices", label: "Invoices", icon: Receipt, manager: true },
    { to: "/receivables", label: "Receivables", icon: Wallet, manager: true },
    { to: "/timesheets", label: "Timesheets", icon: Timer },
    { to: "/insights", label: "Insight reports", icon: BarChart3, manager: true },
  ]},
  { group: "Firm", items: [{ to: "/settings", label: "Team & settings", icon: Settings }] },
];

const clientNav: { group: string; items: Item[] }[] = [
  { group: "My account", items: [{ to: "/portal", label: "Overview", icon: FileText }] },
];

export function AppShell() {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const base: { group: string; items: Item[] }[] = me.isStaff ? staffNav : me.isSuperAdmin ? [] : clientNav;
  const nav: { group: string; items: Item[] }[] = me.isSuperAdmin ? [...base, { group: "Platform", items: [{ to: "/platform", label: "Platform control", icon: ShieldCheck }] }] : base;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <div className="font-display text-xl font-semibold text-sidebar-accent-foreground">
              FirmHub<span className="text-sidebar-primary">.</span>
            </div>
            <div className="truncate text-xs text-sidebar-foreground/60">{me.firm_name}</div>
          </div>
          <button className="md:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {nav.map((g) => (
            <div key={g.group} className="mb-4">
              <div className="px-2 pb-1.5 text-[11px] uppercase tracking-widest text-sidebar-foreground/45">{g.group}</div>
              {g.items.filter((i) => !i.manager || me.isManager).map((i) => (
                <Link
                  key={i.to}
                  to={i.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-2 border-sidebar-primary" }}
                >
                  <i.icon className="size-4" />
                  {i.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border px-4 py-4">
          <div className="truncate text-sm text-sidebar-accent-foreground">{me.full_name}</div>
          <div className="text-xs capitalize text-sidebar-foreground/60">{me.roles.join(", ").replace("_", " ")}</div>
          <button onClick={signOut} className="mt-3 flex items-center gap-2 text-sm text-sidebar-foreground/80 hover:text-sidebar-primary">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-foreground/40 md:hidden" onClick={() => setOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 md:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <span className="font-display font-semibold">FirmHub</span>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
