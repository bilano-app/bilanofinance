import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const getEmail = () => (typeof window !== "undefined" ? localStorage.getItem("bilano_email") || "" : "");

async function apiGet(url: string) {
  const res = await fetch(url, { headers: { "x-user-email": getEmail() } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || "Gagal memuat data.");
  }
  return res.json();
}

async function apiSend(url: string, method: string, body?: any) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", "x-user-email": getEmail() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || "Terjadi kesalahan, coba lagi.");
  }
  return res.json();
}

export function useIncomeProfile() {
  const email = getEmail();
  return useQuery({
    queryKey: ["income-profile", email],
    queryFn: () => apiGet("/api/income-strategy/profile"),
    enabled: !!email,
  });
}

export function useGenerateQuestions() {
  return useMutation({
    mutationFn: (status: string) => apiSend("/api/income-strategy/questions", "POST", { status }),
  });
}

export function useSaveIncomeProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => apiSend("/api/income-strategy/profile", "POST", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["income-profile"] }),
  });
}

export function useGenerateRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiSend("/api/income-strategy/recommendations", "POST", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["income-profile"] }),
  });
}

export function useIncomeAttempts() {
  const email = getEmail();
  return useQuery({
    queryKey: ["income-attempts", email],
    queryFn: () => apiGet("/api/income-strategy/attempts"),
    enabled: !!email,
  });
}

export function useCreateAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recommendation: any) => apiSend("/api/income-strategy/attempts", "POST", { recommendation }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["income-attempts"] }),
  });
}

export function useUpdateMaterials(attemptId: number | string) {
  return useMutation({
    mutationFn: (materials: any[]) => apiSend(`/api/income-strategy/attempts/${attemptId}/materials`, "PATCH", { materials }),
  });
}

export function useCheckFeasibility(attemptId: number | string) {
  return useMutation({
    mutationFn: (payload?: any) => apiSend(`/api/income-strategy/attempts/${attemptId}/feasibility`, "POST", payload || {}),
  });
}

export function useCapitalStrategy(attemptId: number | string) {
  return useMutation({
    mutationFn: (context?: string) => apiSend(`/api/income-strategy/attempts/${attemptId}/capital-strategy`, "POST", { context }),
  });
}

export function useUpdateAttemptState(attemptId: number | string) {
  return useMutation({
    mutationFn: (state: string) => apiSend(`/api/income-strategy/attempts/${attemptId}/state`, "PATCH", { state }),
  });
}

export function useSellingChat(attemptId: number | string) {
  return useMutation({
    mutationFn: (message?: string) => apiSend(`/api/income-strategy/attempts/${attemptId}/selling-chat`, "POST", { message }),
  });
}

export function useAddRevenue(attemptId: number | string) {
  return useMutation({
    mutationFn: (payload: { amount: number; note?: string }) => apiSend(`/api/income-strategy/attempts/${attemptId}/revenue`, "POST", payload),
  });
}

export function useEvaluateAttempt(attemptId: number | string) {
  return useMutation({
    mutationFn: () => apiSend(`/api/income-strategy/attempts/${attemptId}/evaluate`, "POST", {}),
  });
}

export function useDeleteAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attemptId: number | string) => apiSend(`/api/income-strategy/attempts/${attemptId}`, "DELETE"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["income-attempts"] }),
  });
}
