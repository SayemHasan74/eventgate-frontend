import { forwardPrivate } from "@/lib/server/private-gateway";
async function forward(
  request: Request,
  context: { params: Promise<{ slug: string; tierId: string }> },
) {
  const { slug: eventId, tierId } = await context.params;
  return forwardPrivate(
    request,
    `events/${eventId}/ticket-tiers/${tierId}/waitlist`,
  );
}
export const GET = forward;
export const PUT = forward;
export const DELETE = forward;
