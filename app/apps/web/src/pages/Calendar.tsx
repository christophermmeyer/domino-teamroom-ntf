import { useMemo, useState } from "react";
import { Link } from "react-router";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Flag, Plus } from "lucide-react";
import { canWrite, type CalendarItem } from "@teamroom/shared";
import { useCalendar } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Button, Card, ErrorNote, LinkButton, PageHeader, Spinner } from "@/components/ui";
import { cn } from "@/lib/format";

const itemDate = (i: CalendarItem) => (i.type === "meeting" ? parseISO(i.startsAt) : parseISO(`${i.occursOn}T00:00:00`));

export function CalendarPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(new Date());
  const gridStart = startOfWeek(month, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const { data, isLoading, error } = useCalendar(gridStart.toISOString(), gridEnd.toISOString());
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart.getTime(), gridEnd.getTime()]);

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarItem[]>();
    for (const i of data ?? []) {
      const k = format(itemDate(i), "yyyy-MM-dd");
      m.set(k, [...(m.get(k) ?? []), i]);
    }
    for (const list of m.values()) list.sort((a, b) => itemDate(a).getTime() - itemDate(b).getTime());
    return m;
  }, [data]);

  const selectedItems = byDay.get(format(selected, "yyyy-MM-dd")) ?? [];

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Meetings by start time, plus milestones on their date."
        actions={canWrite(user?.role) && (
          <LinkButton to="/documents/new?kind=meeting">
            <Plus className="h-4 w-4" /> Schedule meeting
          </LinkButton>
        )}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setMonth(subMonths(month, 1))} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{format(month, "MMMM yyyy")}</h2>
              <Button variant="secondary" size="sm" onClick={() => { setMonth(startOfMonth(new Date())); setSelected(new Date()); }}>
                Today
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-100 text-center text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:border-slate-800">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          {isLoading && <Spinner />}
          <ErrorNote error={error} />
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const items = byDay.get(format(d, "yyyy-MM-dd")) ?? [];
              const inMonth = isSameMonth(d, month);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => setSelected(d)}
                  className={cn(
                    "flex min-h-24 flex-col items-stretch border-t border-r border-slate-100 p-1.5 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60",
                    !inMonth && "bg-slate-50/60 text-slate-400 dark:bg-slate-950/40",
                    isSameDay(d, selected) && "ring-2 ring-brand-500 ring-inset",
                  )}
                >
                  <span className={cn("mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium", isToday(d) ? "bg-brand-600 text-white" : "text-slate-700 dark:text-slate-300")}>{format(d, "d")}</span>
                  <div className="space-y-0.5">
                    {items.slice(0, 3).map((i) => (
                      <div key={`${i.type}-${i.id}`} className={cn("truncate rounded px-1 py-0.5 text-[11px] font-medium", i.type === "meeting" ? "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200" : "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200")}>
                        {i.type === "meeting" ? `${format(parseISO(i.startsAt), "HH:mm")} ${i.title}` : i.title}
                      </div>
                    ))}
                    {items.length > 3 && <div className="px-1 text-[11px] text-slate-500">+{items.length - 3} more</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="h-fit">
          <div className="border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{format(selected, "EEEE d MMMM")}</h2>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {selectedItems.map((i) => (
              <li key={`${i.type}-${i.id}`} className="px-5 py-3">
                {i.type === "meeting" ? (
                  <Link to={`/documents/${i.id}`} className="block">
                    <p className="text-sm font-medium text-slate-900 hover:text-brand-700 dark:text-white">{i.title}</p>
                    <p className="text-xs text-slate-500">
                      {format(parseISO(i.startsAt), "HH:mm")} – {format(parseISO(i.endsAt), "HH:mm")}
                      {i.location ? ` · ${i.location}` : ""} · {i.author.displayName}
                    </p>
                  </Link>
                ) : (
                  <Link to="/milestones" className="block">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900 hover:text-brand-700 dark:text-white">
                      <Flag className="h-3.5 w-3.5 text-fuchsia-500" /> {i.title}
                    </p>
                    <p className="text-xs text-slate-500">Milestone · {i.author.displayName}</p>
                  </Link>
                )}
              </li>
            ))}
            {selectedItems.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-500">Nothing on this day.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
