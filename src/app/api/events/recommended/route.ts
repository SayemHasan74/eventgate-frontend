import { forwardPrivate } from "@/lib/server/private-gateway";
export const GET = (request: Request) =>
  forwardPrivate(request, "events/recommended");
