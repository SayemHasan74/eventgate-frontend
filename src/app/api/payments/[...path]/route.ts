import { forwardPrivate } from "@/lib/server/private-gateway";
async function forward(
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await context.params;
  return forwardPrivate(
    request,
    "payments" + (path.length ? "/" + path.join("/") : ""),
  );
}
export const POST = forward;
