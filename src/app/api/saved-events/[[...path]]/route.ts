import { forwardPrivate } from "@/lib/server/private-gateway";
async function forward(
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await context.params;
  return forwardPrivate(
    request,
    "saved-events" + (path.length ? "/" + path.join("/") : ""),
  );
}
export const GET = forward;
export const PUT = forward;
export const DELETE = forward;
