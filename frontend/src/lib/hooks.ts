import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import type {
  Site,
  Labourer,
  AttendanceDay,
  AttendanceStatus,
  Bill,
  Advance,
  DailyReport,
  Dashboard,
  SiteSummary,
  Payroll,
  User,
} from "@/src/lib/types";

// ----- Dashboard / Sites -----
export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<Dashboard>("/dashboard") });
}

export function useSites() {
  return useQuery({ queryKey: ["sites"], queryFn: () => api.get<Site[]>("/sites") });
}

export function useSite(id: string) {
  return useQuery({ queryKey: ["site", id], queryFn: () => api.get<Site>(`/sites/${id}`), enabled: !!id });
}

export function useSiteSummary(id: string, month?: string) {
  return useQuery({
    queryKey: ["site-summary", id, month ?? "current"],
    queryFn: () => api.get<SiteSummary>(`/sites/${id}/summary${month ? `?month=${month}` : ""}`),
    enabled: !!id,
  });
}

export function useCreateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; company_name?: string; location?: string }) =>
      api.post<Site>("/sites", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}

export function useUpdateSite(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; company_name?: string; location?: string }) =>
      api.put<Site>(`/sites/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["sites"] });
      qc.invalidateQueries({ queryKey: ["site", id] });
    },
  });
}

export function useDeleteSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/sites/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["sites"] });
    },
  });
}

// ----- Labourers -----
export function useLabourers(siteId: string) {
  return useQuery({
    queryKey: ["labourers", siteId],
    queryFn: () => api.get<Labourer[]>(`/sites/${siteId}/labourers`),
    enabled: !!siteId,
  });
}

export function useAddLabourer(siteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; daily_wage: number; phone?: string }) =>
      api.post<Labourer>(`/sites/${siteId}/labourers`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["labourers", siteId] });
      qc.invalidateQueries({ queryKey: ["site-summary", siteId] });
    },
  });
}

export function useUpdateLabourer(siteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Labourer> }) =>
      api.put<Labourer>(`/labourers/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["labourers", siteId] }),
  });
}

export function useDeleteLabourer(siteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/labourers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["labourers", siteId] });
      qc.invalidateQueries({ queryKey: ["site-summary", siteId] });
    },
  });
}

// ----- Attendance -----
export function useAttendance(siteId: string, date: string) {
  return useQuery({
    queryKey: ["attendance", siteId, date],
    queryFn: () => api.get<AttendanceDay>(`/sites/${siteId}/attendance?date=${date}`),
    enabled: !!siteId && !!date,
  });
}

export function useSaveAttendance(siteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { date: string; records: { labourer_id: string; status: AttendanceStatus }[]; note?: string }) =>
      api.post<{ ok: boolean; present_count: number; wage_total: number }>(`/sites/${siteId}/attendance`, body),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["attendance", siteId, vars.date] });
      qc.invalidateQueries({ queryKey: ["site-summary", siteId] });
      qc.invalidateQueries({ queryKey: ["reports", siteId] });
      qc.invalidateQueries({ queryKey: ["payroll", siteId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReports(siteId: string) {
  return useQuery({
    queryKey: ["reports", siteId],
    queryFn: () => api.get<DailyReport[]>(`/sites/${siteId}/reports`),
    enabled: !!siteId,
  });
}

// ----- Advances -----
export function useAdvances(siteId: string, month?: string) {
  return useQuery({
    queryKey: ["advances", siteId, month ?? "all"],
    queryFn: () => api.get<Advance[]>(`/sites/${siteId}/advances${month ? `?month=${month}` : ""}`),
    enabled: !!siteId,
  });
}

export function useAddAdvance(siteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { labourer_id: string; amount: number; date: string; note?: string }) =>
      api.post<Advance>(`/sites/${siteId}/advances`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advances", siteId] });
      qc.invalidateQueries({ queryKey: ["site-summary", siteId] });
      qc.invalidateQueries({ queryKey: ["payroll", siteId] });
    },
  });
}

export function useDeleteAdvance(siteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/advances/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advances", siteId] });
      qc.invalidateQueries({ queryKey: ["site-summary", siteId] });
      qc.invalidateQueries({ queryKey: ["payroll", siteId] });
    },
  });
}

// ----- Bills -----
export function useAllBills() {
  return useQuery({
    queryKey: ["all-bills"],
    queryFn: () => api.get<(Bill & { site_name?: string })[]>("/bills"),
  });
}

export function useBills(siteId: string) {
  return useQuery({
    queryKey: ["bills", siteId],
    queryFn: () => api.get<Bill[]>(`/sites/${siteId}/bills`),
    enabled: !!siteId,
  });
}

export function useAddBill(siteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      bill_no: string;
      amount: number;
      gst: boolean;
      payment_received: number;
      date: string;
      note?: string;
    }) => api.post<Bill>(`/sites/${siteId}/bills`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills", siteId] });
      qc.invalidateQueries({ queryKey: ["all-bills"] });
      qc.invalidateQueries({ queryKey: ["site-summary", siteId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateBill(siteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Bill> }) => api.put<Bill>(`/bills/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills", siteId] });
      qc.invalidateQueries({ queryKey: ["all-bills"] });
      qc.invalidateQueries({ queryKey: ["site-summary", siteId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteBill(siteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/bills/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills", siteId] });
      qc.invalidateQueries({ queryKey: ["all-bills"] });
      qc.invalidateQueries({ queryKey: ["site-summary", siteId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ----- Payroll -----
export function usePayroll(siteId: string, month?: string) {
  return useQuery({
    queryKey: ["payroll", siteId, month ?? "current"],
    queryFn: () => api.get<Payroll>(`/sites/${siteId}/payroll${month ? `?month=${month}` : ""}`),
    enabled: !!siteId,
  });
}

// ----- Supervisors (owner) -----
export function useSupervisors() {
  return useQuery({ queryKey: ["supervisors"], queryFn: () => api.get<User[]>("/auth/supervisors") });
}

export function useAddSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; phone: string; password: string; site_ids: string[] }) =>
      api.post<User>("/auth/supervisors", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supervisors"] }),
  });
}

export function useUpdateSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.put<User>(`/auth/supervisors/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supervisors"] }),
  });
}

export function useDeleteSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/auth/supervisors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supervisors"] }),
  });
}
