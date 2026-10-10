export type GroupStat = { status?: string; role?: string; _count: { _all: number }; _sum?: { totalAmountPaisaSnapshot?: number | null; amountPaisa?: number | null } };
export type PlatformStats = { users: GroupStat[]; events: GroupStat[]; orders: GroupStat[]; payments: GroupStat[]; refunds: GroupStat[] };
export type Operations = { events: Array<{ id: string; title: string; status: string; startAt: string; organizer: { displayName: string; email: string } }>; payments: Array<{ id: string; orderId: string; amountPaisa: number; currency: string; status: string; initiatedAt: string; completedAt: string | null }>; refunds: Array<{ id: string; orderId: string; amountPaisa: number; currency: string; reason: string; status: string; requestedAt: string; completedAt: string | null }> };
export type AuditLog = { id: string; action: string; entityType: string; entityId: string; createdAt: string; actor: { id: string; displayName: string; email: string } | null };
type ApiResponse<T> = { success: true; data: T; meta?: { total?: number } };
type ApiError = { message?: string; errors?: Array<{ message?: string }> };
export class AdminReportApiError extends Error {}

async function get<T>(accessToken: string, path: string) {
  const response = await fetch(`/api/admin/${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T> | ApiError;
  if (!response.ok || !("success" in payload) || !payload.success || !("data" in payload)) {
    const error = payload as ApiError;
    throw new AdminReportApiError(error.errors?.[0]?.message ?? error.message ?? "Platform reporting could not be loaded.");
  }
  return payload as ApiResponse<T>;
}

export const getPlatformStats = (accessToken: string) => get<PlatformStats>(accessToken, "reports/statistics").then((result) => result.data);
export const getOperations = (accessToken: string) => get<Operations>(accessToken, "reports/operations").then((result) => result.data);
export const getAuditLogs = async (accessToken: string) => { const result = await get<AuditLog[]>(accessToken, "reports/audit-logs?limit=12"); return { logs: result.data, total: result.meta?.total ?? result.data.length }; };
