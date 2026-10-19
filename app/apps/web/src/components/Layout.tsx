import { useState, type FormEvent } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { Archive, Bell, CalendarDays, FileText, Flag, Home, LogOut, Menu, Moon, Search, Settings as SettingsIcon, Sun, Users, X, type LucideIcon } from "lucide-react";
import { canManage } from "@teamroom/shared";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useSettings } from "@/lib/queries";
import { cn } from "@/lib/format";
import { Avatar } from "./ui";

const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/documents", label: "All Documents", icon: FileText },
  { to: "/announcements", label: "Announcements", icon: Bell },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/milestones", label: "Milestones", icon: Flag },
  { to: "/status", label: "Status Reports", icon: FileText },
  { to: "/members", label: "Members & Subteams", icon: Users },
  { to: "/inactive", label: "Inactive Documents", icon: Archive },
];

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { data: settings } = useSettings();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      setOpen(false);
    }
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white shadow-sm">TR</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{settings?.name ?? "TeamRoom"}</p>
          <p className="text-[11px] tracking-wide text-slate-500 uppercase">TeamRoom</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
              )
            }
          >
            <n.icon className="h-4.5 w-4.5" />
            {n.label}
          </NavLink>
        ))}
        {canManage(user?.role) && (
          <NavLink
            to="/settings"
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
              )
            }
          >
            <SettingsIcon className="h-4.5 w-4.5" />
            Setup
          </NavLink>
        )}
      </nav>
      {user && (
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <Avatar user={user} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{user.displayName}</p>
              <p className="truncate text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
            <button onClick={() => void logout()} title="Sign out" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl dark:bg-slate-900">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-3 rounded-md p-1.5 text-slate-500">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/80">
          <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-slate-600 lg:hidden dark:text-slate-300" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <form onSubmit={submitSearch} className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search documents, people, milestones…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-900"
            />
          </form>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={toggle} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
