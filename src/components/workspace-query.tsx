import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import type { z } from "zod";
import {
  currentSession,
  authenticatedFetch,
} from "@/lib/server/browser-session";
import { parseEnvelope } from "@/lib/api-error";
import { privateKey } from "@/lib/query-keys";

// A fresh cache belongs to this render only. Never share private data globally.
export async function WorkspaceQuery<T>({
  children,
  path,
  domain,
  resource = "me",
  schema,
}: {
  children: React.ReactNode;
  path: string;
  domain: string;
  resource?: string;
  schema: z.ZodType<T>;
}) {
  const session = await currentSession();
  if (!session) return children;
  const client = new QueryClient();
  try {
    const response = await authenticatedFetch(session, path);
    const data = parseEnvelope(response, await response.json(), schema).data;
    client.setQueryData(
      privateKey(domain, session.record.user.id, resource, {}),
      data,
    );
  } catch {
    /* Client queries expose retryable failures; the shared layout enforces authentication. */
  }
  return (
    <HydrationBoundary state={dehydrate(client)}>{children}</HydrationBoundary>
  );
}
