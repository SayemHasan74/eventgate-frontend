import { test } from "node:test";
import assert from "node:assert/strict";
import { getSavedMembership } from "../src/lib/saved-events-api";

test("event cards share a bounded saved-state request and keep attendee queues separate", async () => {
  const previous = globalThis.fetch;
  const seen: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input), "https://eventgate.test");
    seen.push(url.pathname);
    const ids = url.searchParams.get("eventIds")!.split(",");
    return Response.json({
      success: true,
      data: ids.map((eventId) => ({
        eventId,
        saved: null,
        canSave: true,
        serverTime: new Date().toISOString(),
      })),
    });
  };
  try {
    const ids = Array.from(
      { length: 12 },
      (_, i) => `123e4567-e89b-42d3-a456-${String(i).padStart(12, "0")}`,
    );
    const rows = await Promise.all(
      ids.map((id) => getSavedMembership(id, "attendee-a")),
    );
    assert.equal(seen.length, 1);
    assert.deepEqual(
      rows.map((row) => row.eventId),
      ids,
    );
    seen.length = 0;
    await Promise.all([
      getSavedMembership(ids[0], "attendee-a"),
      getSavedMembership(ids[1], "attendee-b"),
    ]);
    assert.equal(seen.length, 2);
  } finally {
    globalThis.fetch = previous;
  }
});

test("old backend route validation falls back during rolling deploys without retrying server failures", async () => {
  const previous = globalThis.fetch;
  const id = "123e4567-e89b-42d3-a456-426614174000";
  const paths: string[] = [];
  let fail = false;
  globalThis.fetch = async (input) => {
    const path = new URL(String(input), "https://eventgate.test").pathname;
    paths.push(path);
    if (path.endsWith("memberships"))
      return Response.json(
        {
          success: false,
          errors: [
            {
              field: "params.eventId",
              code: "INVALID_VALUE",
              message: "Invalid UUID",
            },
          ],
        },
        { status: fail ? 503 : 400 },
      );
    return Response.json({
      success: true,
      data: {
        eventId: id,
        saved: null,
        canSave: true,
        serverTime: new Date().toISOString(),
      },
    });
  };
  try {
    assert.equal((await getSavedMembership(id, "attendee-a")).eventId, id);
    assert.equal(paths.length, 2);
    fail = true;
    paths.length = 0;
    await assert.rejects(getSavedMembership(id, "attendee-a"));
    assert.equal(paths.length, 1);
  } finally {
    globalThis.fetch = previous;
  }
});
