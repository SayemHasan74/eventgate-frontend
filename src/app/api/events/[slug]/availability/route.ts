import { upstream } from "@/lib/server/upstream";
import { publicAvailabilitySchema } from "@/lib/public-availability";
import { parseEnvelope, ApiError } from "@/lib/api-error";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const { slug } = await params;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200)
      return Response.json(
        { success: false, message: "Invalid event address." },
        { status: 400, headers },
      );
    const response = await upstream(
      `events/${slug}/availability`,
      { cache: "no-store" },
      true,
    );
    const data = parseEnvelope(
      response,
      await response.json(),
      publicAvailabilitySchema,
    ).data;
    return Response.json({ success: true, data }, { headers });
  } catch (error) {
    if (error instanceof ApiError && [400, 404, 429].includes(error.status))
      return Response.json(
        {
          success: false,
          message:
            error.status === 404
              ? "This published event is no longer available."
              : error.message,
        },
        { status: error.status, headers },
      );
    return Response.json(
      {
        success: false,
        message:
          "Current availability could not be loaded. Retry before reserving tickets.",
      },
      { status: 503, headers },
    );
  }
}
