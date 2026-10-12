import { forwardPrivate } from "@/lib/server/private-gateway";
import { privateJson } from "@/lib/server/session-response";
async function forward(
  request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await context.params;
  const target = path.join("/");
  const id = "[0-9a-fA-F-]{36}";
  const routes = {
    GET: new RegExp("^(refund-requests|admin/refunds)(/" + id + ")?$"),
    POST: new RegExp(
      "^(orders/" + id + "/refund-requests|admin/refunds/" + id + "/retry)$",
    ),
    PATCH: new RegExp("^admin/refunds/" + id + "$"),
  };
  const allowed = routes[request.method as keyof typeof routes];
  if (!allowed?.test(target))
    return privateJson({ success: false, message: "Not found" }, 404);
  return forwardPrivate(request, target);
}
export const GET = forward;
export const POST = forward;
export const PATCH = forward;
