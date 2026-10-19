import { Link, useParams } from "react-router";
import { Building2, Mail, MapPin, Phone } from "lucide-react";
import { useMember } from "@/lib/queries";
import { Avatar, Card, ErrorNote, Pill, Spinner } from "@/components/ui";
import { DocumentCard } from "@/components/DocumentCard";

export function MemberPage() {
  const { id } = useParams();
  const { data: m, isLoading, error } = useMember(id);
  if (isLoading) return <Spinner />;
  if (error || !m) return <ErrorNote error={error ?? "Not found"} />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <nav className="text-xs text-slate-500">
        <Link to="/members" className="hover:underline">Members</Link> <span className="mx-1">/</span> <span className="text-slate-700 dark:text-slate-300">{m.displayName}</span>
      </nav>
      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar user={m} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{m.displayName}</h1>
            <p className="text-slate-600 dark:text-slate-400">{m.jobTitle}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Pill tone="info" className="capitalize">
                {m.role}
              </Pill>
              {m.subteams.map((s) => (
                <Link key={s.id} to={`/subteams/${s.id}`}>
                  <Pill>{s.name}</Pill>
                </Link>
              ))}
            </div>
            {m.bio && <p className="mt-4 max-w-xl text-sm text-slate-700 dark:text-slate-300">{m.bio}</p>}
            <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" /> <a href={`mailto:${m.email}`} className="hover:underline">{m.email}</a>
              </div>
              {m.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" /> {m.phone}
                </div>
              )}
              {m.department && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" /> {m.department}
                </div>
              )}
              {m.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" /> {m.location}
                </div>
              )}
            </dl>
          </div>
        </div>
      </Card>
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Recent documents</h2>
        <div className="space-y-3">
          {m.recentDocuments.map((d) => (
            <DocumentCard key={d.id} doc={d} compact />
          ))}
          {m.recentDocuments.length === 0 && <p className="text-sm text-slate-500">No documents yet.</p>}
        </div>
      </section>
    </div>
  );
}
