import type { QueryClient } from "@tanstack/react-query";
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
