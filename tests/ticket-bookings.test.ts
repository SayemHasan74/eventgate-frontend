import { test } from "node:test";
import assert from "node:assert/strict";
import { ticketBookingSchema } from "../src/lib/ticket-api";
const id = "00000000-0000-4000-8000-000000000001";
const group = {
  orderId: id,
  eventId: id,
  eventNameSnapshot: "Event",
  tierName: "General",
  quantity: 2,
  passCount: 2,
  statusCounts: { ACTIVE: 1, CHECKED_IN: 1 },
  event: {
    title: "Event",
    slug: "event",
    venue: "Hall",
    city: "Dhaka",
    startAt: "2026-10-15T12:00:00Z",
    endAt: "2026-10-15T14:00:00Z",
    imageUrl: null,
  },
  tickets: [
    { id, sequence: 1, status: "ACTIVE", effectiveAdmissionState: "ACTIVE" },
    {
      id: "00000000-0000-4000-8000-000000000002",
      sequence: 2,
      status: "CHECKED_IN",
      effectiveAdmissionState: "CHECKED_IN",
    },
  ],
};
test("booking groups retain complete pass counts and reject split responses", () => {
  assert.equal(ticketBookingSchema.safeParse(group).success, true);
  assert.equal(
    ticketBookingSchema.safeParse({
      ...group,
      tickets: group.tickets.slice(0, 1),
    }).success,
    false,
  );
  assert.equal(
    ticketBookingSchema.safeParse({ ...group, statusCounts: { ACTIVE: 5 } })
      .success,
    false,
  );
});
