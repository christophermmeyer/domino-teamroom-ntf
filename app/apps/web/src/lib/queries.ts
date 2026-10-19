import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CalendarItem, DocumentDetail, DocumentSummary, HomeData, MemberDetail, Milestone, SearchResults, Settings, SubteamDetail, Thread, UserSummary } from "@teamroom/shared";
import { api } from "./api";

export const useSettings = () => useQuery({ queryKey: ["settings"], queryFn: () => api.get<Settings>("/api/settings"), staleTime: 60_000 });
export const useHome = () => useQuery({ queryKey: ["home"], queryFn: () => api.get<HomeData>("/api/home") });

export function useDocuments(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
  return useQuery({ queryKey: ["documents", qs], queryFn: () => api.get<DocumentSummary[]>(`/api/documents${qs ? `?${qs}` : ""}`) });
}
export const useThread = (id: string | undefined) => useQuery({ queryKey: ["thread", id], queryFn: () => api.get<Thread>(`/api/documents/${id}`), enabled: !!id });
export const useAnnouncements = () => useQuery({ queryKey: ["announcements"], queryFn: () => api.get<DocumentDetail[]>("/api/announcements") });
export const useStatusReports = (type?: string) => useQuery({ queryKey: ["status", type], queryFn: () => api.get<DocumentDetail[]>(`/api/status-reports${type ? `?type=${type}` : ""}`) });
export const useMilestones = () => useQuery({ queryKey: ["milestones"], queryFn: () => api.get<Milestone[]>("/api/milestones") });
export const useCalendar = (from: string, to: string) => useQuery({ queryKey: ["calendar", from, to], queryFn: () => api.get<CalendarItem[]>(`/api/calendar?from=${from}&to=${to}`) });
export const useMembers = () => useQuery({ queryKey: ["members"], queryFn: () => api.get<MemberDetail[]>("/api/members") });
export const useMember = (id: string | undefined) => useQuery({ queryKey: ["member", id], queryFn: () => api.get<MemberDetail & { recentDocuments: DocumentSummary[] }>(`/api/members/${id}`), enabled: !!id });
export const useSubteams = () => useQuery({ queryKey: ["subteams"], queryFn: () => api.get<SubteamDetail[]>("/api/subteams") });
export const useSubteam = (id: string | undefined) => useQuery({ queryKey: ["subteam", id], queryFn: () => api.get<SubteamDetail & { recentDocuments: DocumentSummary[] }>(`/api/subteams/${id}`), enabled: !!id });
export const useSearch = (q: string) => useQuery({ queryKey: ["search", q], queryFn: () => api.get<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`), enabled: q.trim().length >= 2 });
export const useDemoUsers = () => useQuery({ queryKey: ["demo-users"], queryFn: () => api.get<UserSummary[]>("/api/auth/demo-users") });

/** Any write invalidates everything; the room is small and this keeps every list honest. */
export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function useApiMutation<TIn, TOut>(fn: (input: TIn) => Promise<TOut>, onSuccess?: (out: TOut) => void) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (out) => {
      await invalidate();
      onSuccess?.(out);
    },
  });
}
