import { Link } from "react-router";
import { Activity, Bell, CalendarDays, CheckSquare, FileText, Flag, MessageSquare, Plus, Users } from "lucide-react";
import { canWrite } from "@teamroom/shared";
import { useHome, useSettings } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Avatar, Card, CardHeader, EmptyState, ErrorNote, KindBadge, LinkButton, Pill, Spinner } from "@/components/ui";
import { DocumentCard } from "@/components/DocumentCard";
import { dateOnly, dateTime, relative } from "@/lib/format";

export function HomePage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useHome();
  const { data: settings } = useSettings();

  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorNote error={error ?? "No data"} />;

  const stats = [
    { label: "Active documents", value: data.stats.documents, icon: FileText, to: "/documents" },
    { label: "Comments", value: data.stats.comments, icon: MessageSquare, to: "/documents" },
    { label: "Open action items", value: data.stats.openActions, icon: CheckSquare, to: "/documents?view=due" },
    { label: "Members", value: data.stats.members, icon: Users, to: "/members" },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-brand-50/60 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-brand-950/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider text-brand-600 uppercase dark:text-brand-300">TeamRoom</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{settings?.name ?? "TeamRoom"}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{settings?.purpose}</p>
            {(settings?.leader || settings?.facilitator) && (
              <p className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                {settings.leader && (
                  <span className="inline-flex items-center gap-1.5">
                    <Avatar user={settings.leader} size="xs" /> Leader: <span className="font-medium text-slate-700 dark:text-slate-200">{settings.leader.displayName}</span>
                  </span>
                )}
                {settings.facilitator && (
                  <span className="inline-flex items-center gap-1.5">
                    <Avatar user={settings.facilitator} size="xs" /> Facilitator: <span className="font-medium text-slate-700 dark:text-slate-200">{settings.facilitator.displayName}</span>
                  </span>
                )}
              </p>
            )}
          </div>
          {canWrite(user?.role) && (
            <LinkButton to="/documents/new">
              <Plus className="h-4 w-4" /> New document
            </LinkButton>
          )}
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <Link key={s.label} to={s.to} className="rounded-xl border border-slate-200/80 bg-white/80 p-3.5 transition hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900/60">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums dark:text-white">{s.value}</dd>
            </Link>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card as="section">
            <CardHeader title="Announcements" icon={<Bell className="h-4 w-4" />} action={<Link to="/announcements" className="text-xs font-medium text-brand-600 hover:underline">View all</Link>} />
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.announcements.map((a) => (
                <li key={a.id} className="px-5 py-3.5">
                  <div className="flex items-start gap-3">
                    <Avatar user={a.author} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{a.subject}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{a.abstract}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {a.author.displayName} · {relative(a.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
              {data.announcements.length === 0 && <li className="px-5 py-6 text-sm text-slate-500">No announcements yet.</li>}
            </ul>
          </Card>

          <Card as="section">
            <CardHeader title="Recent activity" icon={<Activity className="h-4 w-4" />} action={<Link to="/documents" className="text-xs font-medium text-brand-600 hover:underline">All documents</Link>} />
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.activity.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar user={a.author} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-medium text-slate-900 dark:text-white">{a.author.displayName}</span> {a.verb}{" "}
                      <Link to={`/documents/${a.threadRootId}`} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
                        {a.subject}
                      </Link>
                    </p>
                  </div>
                  <KindBadge kind={a.kind} />
                  <span className="hidden w-20 shrink-0 text-right text-xs text-slate-500 sm:block">{relative(a.at)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card as="section">
            <CardHeader title="Open action items" icon={<CheckSquare className="h-4 w-4" />} action={<Link to="/documents?view=due" className="text-xs font-medium text-brand-600 hover:underline">By due date</Link>} />
            <div className="space-y-2 p-3">
              {data.openActions.map((d) => (
                <DocumentCard key={d.id} doc={d} compact />
              ))}
              {data.openActions.length === 0 && <EmptyState title="Nothing open" />}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card as="section">
            <CardHeader title="Coming up" icon={<CalendarDays className="h-4 w-4" />} action={<Link to="/calendar" className="text-xs font-medium text-brand-600 hover:underline">Calendar</Link>} />
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.upcoming.map((u) => (
                <li key={`${u.type}-${u.id}`} className="px-5 py-3">
                  {u.type === "meeting" ? (
                    <Link to={`/documents/${u.id}`} className="block">
                      <p className="text-sm font-medium text-slate-900 hover:text-brand-700 dark:text-white">{u.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {dateTime(u.startsAt)}
                        {u.location ? ` · ${u.location}` : ""}
                      </p>
                    </Link>
                  ) : (
                    <Link to="/milestones" className="block">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900 hover:text-brand-700 dark:text-white">
                        <Flag className="h-3.5 w-3.5 text-fuchsia-500" /> {u.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">Milestone · {dateOnly(u.occursOn)}</p>
                    </Link>
                  )}
                </li>
              ))}
              {data.upcoming.length === 0 && <li className="px-5 py-6 text-sm text-slate-500">Nothing scheduled.</li>}
            </ul>
          </Card>

          <Card as="section">
            <CardHeader title="Latest status" icon={<FileText className="h-4 w-4" />} action={<Link to="/status" className="text-xs font-medium text-brand-600 hover:underline">All reports</Link>} />
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.statusReports.map((s) => (
                <li key={s.id} className="px-5 py-3">
                  <Link to="/status" className="block">
                    <p className="text-sm font-medium text-slate-900 hover:text-brand-700 dark:text-white">{s.subject}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{s.abstract}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {s.author.displayName} · {s.reportOn && dateOnly(s.reportOn)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {settings?.showMembers !== false && (
            <Card as="section">
              <CardHeader title="Team" icon={<Users className="h-4 w-4" />} action={<Link to="/members" className="text-xs font-medium text-brand-600 hover:underline">Members</Link>} />
              <div className="flex flex-wrap gap-2 px-5 py-4">
                {data.members.map((m) => (
                  <Link key={m.id} to={`/members/${m.id}`} title={m.displayName}>
                    <Avatar user={m} size="md" />
                  </Link>
                ))}
              </div>
              {settings?.showSubteams !== false && (
                <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                  {data.subteams.map((s) => (
                    <Link key={s.id} to={`/subteams/${s.id}`}>
                      <Pill tone="info">{s.name}</Pill>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
