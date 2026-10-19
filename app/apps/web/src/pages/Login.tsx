import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/lib/auth";
import { useDemoUsers } from "@/lib/queries";
import { Avatar, Button, ErrorNote, Field, Input } from "@/components/ui";

const DEMO_PASSWORD = "teamroom";

export function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const { data: demoUsers } = useDemoUsers();
  const [email, setEmail] = useState("maya.chen@atlas.example");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={(location.state as { from?: string } | null)?.from ?? "/"} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 via-slate-50 to-slate-100 px-4 py-10 dark:from-slate-950 dark:via-slate-950 dark:to-brand-950">
      <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col justify-center">
          <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white shadow-md">TR</span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">TeamRoom</h1>
          <p className="mt-3 max-w-md text-slate-600 dark:text-slate-400">
            Discussions, action items, meetings, references, milestones and status reports for one team, in one room. A modern take on the Domino TeamRoom template.
          </p>
          <div className="mt-8 rounded-xl border border-slate-200 bg-white/70 p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <p className="font-medium text-slate-800 dark:text-slate-200">Demo accounts</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Password for everyone: <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{DEMO_PASSWORD}</code>
            </p>
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {(demoUsers ?? []).map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(u.email);
                      setPassword(DEMO_PASSWORD);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Avatar user={u} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">{u.displayName}</span>
                      <span className="block truncate text-xs text-slate-500 capitalize">
                        {u.role} · {u.jobTitle}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col justify-center gap-4 rounded-2xl border border-slate-200 bg-white p-7 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Sign in</h2>
          <Field label="Email">
            <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <ErrorNote error={error} />
          <Button type="submit" disabled={busy} className="mt-2 w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-xs text-slate-500">Local demo session. No external identity provider.</p>
        </form>
      </div>
    </div>
  );
}
