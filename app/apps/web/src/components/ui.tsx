import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Link } from "react-router";
import type { DocumentKind, UserSummary } from "@teamroom/shared";
import { cn, initials, kindLabel } from "@/lib/format";
import { useSettings } from "@/lib/queries";

export function Card({ className, children, as: Tag = "div" }: { className?: string; children: ReactNode; as?: "div" | "section" | "article" }) {
  return <Tag className={cn("rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900", className)}>{children}</Tag>;
}

export function CardHeader({ title, action, icon }: { title: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
        {icon && <span className="text-slate-400">{icon}</span>}
        {title}
      </h2>
      {action}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" };
export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-9.5 px-4 text-sm",
        variant === "primary" && "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
        variant === "secondary" && "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className,
      )}
      {...props}
    />
  );
}

export function LinkButton({ to, children, variant = "primary", className }: { to: string; children: ReactNode; variant?: "primary" | "secondary"; className?: string }) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex h-9.5 items-center gap-1.5 rounded-lg px-4 text-sm font-medium shadow-sm transition",
        variant === "primary" ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
        className,
      )}
    >
      {children}
    </Link>
  );
}

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, className)} {...props} />;
}
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, "min-h-24", className)} {...props} />;
}
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClass, className)} {...props} />;
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-slate-600 uppercase dark:text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Avatar({ user, size = "md", className }: { user: Pick<UserSummary, "displayName" | "avatarColor">; size?: "xs" | "sm" | "md" | "lg" | "xl"; className?: string }) {
  const dim = { xs: "h-5 w-5 text-[9px]", sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm", xl: "h-20 w-20 text-xl" }[size];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white dark:ring-slate-900", dim, className)} style={{ backgroundColor: user.avatarColor }} title={user.displayName}>
      {initials(user.displayName)}
    </span>
  );
}

export function AvatarStack({ users, max = 4 }: { users: UserSummary[]; max?: number }) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <span className="inline-flex items-center -space-x-1.5">
      {shown.map((u) => (
        <Avatar key={u.id} user={u} size="sm" />
      ))}
      {rest > 0 && <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-medium text-slate-600 ring-2 ring-white dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-900">+{rest}</span>}
    </span>
  );
}

const kindStyles: Record<string, string> = {
  discussion: "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-900/40 dark:text-brand-200 dark:ring-brand-800",
  action: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800",
  meeting: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:ring-violet-800",
  reference: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800",
  announcement: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-800",
  status_team: "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-200 dark:ring-cyan-800",
  status_subteam: "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-200 dark:ring-cyan-800",
  status_individual: "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-200 dark:ring-cyan-800",
  milestone: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-200 dark:ring-fuchsia-800",
};

export function KindBadge({ kind, label }: { kind: DocumentKind | "milestone"; label?: string }) {
  const { data: settings } = useSettings();
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ring-1 ring-inset", kindStyles[kind] ?? kindStyles.discussion)}>
      {label ?? (kind === "milestone" ? "Milestone" : kindLabel(kind, settings))}
    </span>
  );
}

export function Pill({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info"; className?: string }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    danger: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
    info: "bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function TagChip({ name, active, onClick, count, plain }: { name: string; active?: boolean; onClick?: () => void; count?: number; plain?: boolean }) {
  const cls = cn(
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition",
    active ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-600",
  );
  const body = (
    <>
      {plain ? name : `#${name}`}
      {count !== undefined && <span className={cn("text-[10px]", active ? "text-white/80" : "text-slate-400")}>{count}</span>}
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    );
  }
  return (
    <Link to={`/documents?tag=${encodeURIComponent(name)}`} className={cls}>
      {body}
    </Link>
  );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-slate-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label}
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error instanceof Error ? error.message : String(error)}</div>;
}

export function HtmlContent({ html, className }: { html: string; className?: string }) {
  // HTML is sanitized server-side with an allow list before it is stored.
  return <div className={cn("prose-doc", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition",
            value === o.value ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 text-xs text-slate-400">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
