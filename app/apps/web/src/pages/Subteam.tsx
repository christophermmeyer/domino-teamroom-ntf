import { Link, useParams } from "react-router";
import { useSubteam } from "@/lib/queries";
import { Avatar, Card, ErrorNote, Pill, Spinner } from "@/components/ui";
import { DocumentCard } from "@/components/DocumentCard";

export function SubteamPage() {
  const { id } = useParams();
  const { data: s, isLoading, error } = useSubteam(id);
  if (isLoading) return <Spinner />;
  if (error || !s) return <ErrorNote error={error ?? "Not found"} />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <nav className="text-xs text-slate-500">
        <Link to="/members" className="hover:underline">Members & subteams</Link> <span className="mx-1">/</span> <span className="text-slate-700 dark:text-slate-300">{s.name}</span>
      </nav>
      <Card className="p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{s.name}</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">{s.description}</p>
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Members</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {s.members.map((m) => (
              <li key={m.id}>
                <Link to={`/members/${m.id}`} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5 hover:border-brand-300 dark:border-slate-800">
                  <Avatar user={m} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{m.displayName}</span>
                    <span className="block truncate text-xs text-slate-500">{m.jobTitle}</span>
                  </span>
                  {s.leader?.id === m.id && <Pill tone="warning">Leader</Pill>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Card>
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Documents for this subteam</h2>
        <div className="space-y-3">
          {s.recentDocuments.map((d) => (
            <DocumentCard key={d.id} doc={d} compact />
          ))}
          {s.recentDocuments.length === 0 && <p className="text-sm text-slate-500">No documents yet.</p>}
        </div>
      </section>
    </div>
  );
}
