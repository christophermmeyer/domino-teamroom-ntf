import { useState } from "react";
import { Link } from "react-router";
import { Mail, MapPin } from "lucide-react";
import { useMembers, useSubteams } from "@/lib/queries";
import { Avatar, AvatarStack, Card, ErrorNote, PageHeader, Pill, Spinner, Tabs } from "@/components/ui";

const roleTone = { owner: "danger", facilitator: "warning", member: "info", reader: "neutral" } as const;

export function MembersPage() {
  const [tab, setTab] = useState<"members" | "subteams">("members");
  const members = useMembers();
  const subteams = useSubteams();

  return (
    <div>
      <PageHeader title="Members & subteams" description="Who is in the room, what they do, and how the team is organised." />
      <div className="mb-5">
        <Tabs value={tab} onChange={setTab} options={[{ value: "members", label: "Members", count: members.data?.length }, { value: "subteams", label: "Subteams", count: subteams.data?.length }]} />
      </div>

      {tab === "members" && (
        <>
          {members.isLoading && <Spinner />}
          <ErrorNote error={members.error} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {members.data?.map((m) => (
              <Link key={m.id} to={`/members/${m.id}`}>
                <Card className="h-full p-5 transition hover:border-brand-300 hover:shadow dark:hover:border-brand-700">
                  <div className="flex items-start gap-3">
                    <Avatar user={m} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900 dark:text-white">{m.displayName}</p>
                      <p className="truncate text-sm text-slate-500">{m.jobTitle}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Pill tone={roleTone[m.role ?? "member"]} className="capitalize">
                          {m.role}
                        </Pill>
                        {m.subteams.map((s) => (
                          <Pill key={s.id}>{s.name}</Pill>
                        ))}
                      </div>
                    </div>
                  </div>
                  <dl className="mt-4 space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5" /> {m.email}
                    </div>
                    {m.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {m.location}
                      </div>
                    )}
                  </dl>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {tab === "subteams" && (
        <>
          {subteams.isLoading && <Spinner />}
          <ErrorNote error={subteams.error} />
          <div className="grid gap-4 sm:grid-cols-2">
            {subteams.data?.map((s) => (
              <Link key={s.id} to={`/subteams/${s.id}`}>
                <Card className="h-full p-5 transition hover:border-brand-300 hover:shadow dark:hover:border-brand-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{s.name}</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{s.description}</p>
                    </div>
                    <Pill>{s.documentCount} docs</Pill>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <AvatarStack users={s.members} max={6} />
                    {s.leader && (
                      <span className="text-xs text-slate-500">
                        Led by <span className="font-medium text-slate-700 dark:text-slate-300">{s.leader.displayName}</span>
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
