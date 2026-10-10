export type Order = {
  id: string;
  eventId: string;
  ticketTierId: string;
  eventNameSnapshot: string;
  ticketTierNameSnapshot: string;
  unitPricePaisaSnapshot: number;
  quantity: number;
  totalAmountPaisaSnapshot: number;
  currency: string;
  status: "PENDING_PAYMENT" | "PAID" | "CANCELLED" | "REFUNDED";
  reservationExpiresAt: string | null;
  reservationReleasedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type OrderList = { orders: Order[]; meta: { page: number; limit: number; total: number; totalPages: number } };

type ApiResponse<T> = { success: true; message: string; data: T };
type ApiError = { message?: string; errors?: Array<{ message?: string }> };

export class OrderApiError extends Error {}

async function orderRequest<T>(path: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(path ? `/api/orders/${path}` : "/api/orders", {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
  });
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<T> | ApiError;
  if (!response.ok || !("success" in payload) || !payload.success || !("data" in payload)) {
    const error = payload as ApiError;
    throw new OrderApiError(error.errors?.[0]?.message ?? error.message ?? "Your ticket reservation could not be completed.");
  }
  return payload.data;
}

export const reserveTickets = (accessToken: string, ticketTierId: string, quantity: number) =>
  orderRequest<Order>("", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ ticketTierId, quantity }),
  });

export const getOrder = (accessToken: string, orderId: string) => orderRequest<Order>(orderId, accessToken);

export async function getOrders(accessToken: string) {
  const response = await fetch("/api/orders", { headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = (await response.json().catch(() => ({}))) as ApiResponse<Order[]> & { meta?: OrderList["meta"] } | ApiError;
  if (!response.ok || !("success" in payload) || !payload.success || !("data" in payload)) {
    const error = payload as ApiError;
    throw new OrderApiError(error.errors?.[0]?.message ?? error.message ?? "Your orders could not be loaded.");
  }
  return { orders: payload.data, meta: payload.meta ?? { page: 1, limit: 20, total: payload.data.length, totalPages: 1 } };
}
