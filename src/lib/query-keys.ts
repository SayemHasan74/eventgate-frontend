import type { QueryClient } from "@tanstack/react-query";
export const mutationDomains = {
  profile: ["users", "identity", "checkout"],
  event: [
    "organizer-events",
    "organizer-reports",
    "discovery",
    "readiness",
    "admin-events",
    "admin-operations",
    "admin-stats",
    "admin-audit",
    "admin-audit-logs",
  ],
  tier: ["organizer-events", "organizer-reports", "discovery", "readiness"],
  order: [
    "orders",
    "payments",
    "overview",
    "tickets",
    "organizer-orders",
    "organizer-event-orders",
    "organizer-reports",
  ],
  payment: [
    "orders",
    "payments",
    "overview",
    "tickets",
    "refunds",
    "organizer-orders",
    "organizer-event-orders",
    "organizer-reports",
    "admin-payments",
    "admin-stats",
  ],
  refund: [
    "refunds",
    "orders",
    "tickets",
    "overview",
    "organizer-reports",
    "admin-refunds",
    "admin-stats",
    "admin-operations",
    "admin-audit",
    "admin-audit-logs",
  ],
  checkIn: ["check-ins", "organizer-events", "organizer-reports", "tickets"],
  adminUser: [
    "admin-users",
    "admin-stats",
    "admin-audit",
    "admin-audit-logs",
    "identity",
    "users",
  ],
  admin: [
    "admin-events",
    "admin-payments",
    "admin-refunds",
    "admin-stats",
    "admin-operations",
    "admin-audit",
    "admin-audit-logs",
  ],
} as const;
export const invalidateMutation = (
  client: QueryClient,
  userId: string,
  mutation: keyof typeof mutationDomains,
) => invalidatePrivate(client, userId, mutationDomains[mutation]);
export const privateKey = (
  domain: string,
  userId: string | undefined,
  resourceId = "list",
  filters: Readonly<Record<string, unknown>> = {},
) => [domain, userId, resourceId, filters] as const;
// Only confirmed mutations invalidate authoritative reads; never optimistically change money/inventory/admission.
export function invalidatePrivate(
  client: QueryClient,
  userId: string,
  domains: readonly string[],
) {
  return Promise.all(
    domains.map((domain) =>
      client.invalidateQueries({ queryKey: [domain, userId] }),
    ),
  );
}
