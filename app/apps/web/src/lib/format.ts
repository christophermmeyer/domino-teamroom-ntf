import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import type { DocumentKind, Settings, ThreadKind } from "@teamroom/shared";

export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export function relative(iso: string) {
  return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });
}

export function dateTime(iso: string) {
  return format(parseISO(iso), "EEE d MMM, HH:mm");
}

export function dateOnly(d: string) {
  const dt = d.length === 10 ? parseISO(`${d}T00:00:00`) : parseISO(d);
  if (isToday(dt)) return "Today";
  if (isTomorrow(dt)) return "Tomorrow";
  if (isYesterday(dt)) return "Yesterday";
  return format(dt, "EEE d MMM");
}

export function timeRange(startIso: string, endIso: string) {
  const s = parseISO(startIso);
  const e = parseISO(endIso);
  const sameDay = format(s, "yyyy-MM-dd") === format(e, "yyyy-MM-dd");
  return sameDay ? `${format(s, "EEE d MMM, HH:mm")} – ${format(e, "HH:mm")}` : `${format(s, "d MMM HH:mm")} – ${format(e, "d MMM HH:mm")}`;
}

export function isOverdue(dueOn: string | null, status: string | null) {
  return !!dueOn && status === "open" && dueOn < new Date().toISOString().slice(0, 10);
}

export function kindLabel(kind: DocumentKind, settings?: Settings): string {
  if (settings && kind in settings.labels) return settings.labels[kind as ThreadKind];
  const fallback: Record<string, string> = {
    discussion: "Discussion",
    action: "Action Item",
    meeting: "Meeting",
    reference: "Reference",
    announcement: "Announcement",
    status_team: "Team status",
    status_subteam: "Subteam status",
    status_individual: "Individual status",
  };
  return fallback[kind] ?? kind;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");
}

export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}
