import type { QueryClient } from "@tanstack/react-query";
export const mutationDomains = {
  waitlist: [
    "waitlists",
    "waitlist-membership",
    "notifications",
    "saved-events",
  ],
  save: [
    "saved-events",
    "saved-membership",
    "notifications",
    "recommendations",
  ],
  eventPreference: ["event-preferences", "recommendations"],
  notification: ["notifications", "notification-preferences"],
  profile: ["users", "identity", "checkout", "notification-preferences"],
  event: [
    "recommendations",
    "organizer-events",
    "organizer-overview",
    "organizer-tiers",
    "organizer-reports",
    "discovery",
    "check-in-status",
    "readiness",
    "admin-events",
    "admin-operations",
    "admin-stats",
    "admin-audit",
    "admin-audit-logs",
  ],
  tier: [
    "recommendations",
    "organizer-events",
    "organizer-overview",
    "organizer-tiers",
    "organizer-reports",
    "discovery",
    "check-in-status",
    "readiness",
  ],
  order: [
    "recommendations",
    "waitlists",
    "waitlist-membership",
    "organizer-overview",
    "orders",
    "payments",
    "overview",
    "tickets",
    "organizer-orders",
    "organizer-event-orders",
    "organizer-reports",
  ],
  payment: [
    "recommendations",
    "waitlists",
    "waitlist-membership",
    "organizer-overview",
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
    "recommendations",
    "organizer-overview",
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
  checkIn: [
    "check-ins",
    "check-in-status",
    "organizer-overview",
    "organizer-events",
    "organizer-reports",
    "tickets",
  ],
  adminUser: [
    "recommendations",
    "admin-events",
    "admin-users",
    "admin-stats",
    "admin-audit",
    "admin-audit-logs",
    "identity",
    "users",
  ],
  admin: [
    "recommendations",
    "admin-jobs",
    "admin-maintenance",
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
  resourceId?: string,
) => invalidatePrivate(client, userId, mutationDomains[mutation], resourceId);
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
  resourceId?: string,
) {
  // Mark stale synchronously, but never hold a confirmed mutation open while
  // active lists/reports refetch. Queries retain and expose their own errors.
  for (const domain of new Set(domains))
    void client
      .invalidateQueries(
        {
          queryKey: [domain, userId],
          ...(resourceId &&
          [
            "organizer-events",
            "organizer-tiers",
            "organizer-reports",
            "check-in-status",
            "readiness",
            "admin-events",
            "saved-membership",
          ].includes(domain)
            ? {
                predicate: (query) =>
                  query.queryKey[2] === resourceId ||
                  query.queryKey[2] === "list",
              }
            : {}),
        },
        { cancelRefetch: false },
      )
      .catch(() => undefined);
  return Promise.resolve();
}
