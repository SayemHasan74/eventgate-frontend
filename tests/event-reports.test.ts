import { test } from "node:test";
import assert from "node:assert/strict";
import { eventReportFilterSchema } from "../src/lib/filter-schemas";
import {
  reportParams,
  eventOrdersExportUrl,
  salesReportSchema,
} from "../src/lib/event-report-api";
import { isPrivateRouteAllowed } from "../src/lib/server/private-routes";
const id = "123e4567-e89b-42d3-a456-426614174000";
test("report date bounds are Dhaka dates and filters survive export", () => {
  const values = eventReportFilterSchema.parse({
    startDate: "2026-10-12",
    endDate: "2026-10-12",
    status: "REFUNDED",
    tierId: id,
  });
  const params = reportParams(values);
  assert.equal(params.get("startAfter"), "2026-10-11T18:00:00.000Z");
  assert.equal(params.get("startBefore"), "2026-10-12T18:00:00.000Z");
  assert.equal(params.get("status"), "REFUNDED");
  assert.equal(params.get("tierId"), id);
  assert.ok(eventOrdersExportUrl(id, params).includes("orders/export?"));
  assert.equal(
    eventReportFilterSchema.safeParse({
      startDate: "2026-10-13",
      endDate: "2026-10-12",
    }).success,
    false,
  );
});
test("report allowlist permits only exact report reads", () => {
  for (const panel of ["sales", "inventory", "attendance", "orders/export"]) {
    const path = `organizer/events/${id}/reports/${panel}`;
    assert.equal(isPrivateRouteAllowed("GET", path), true);
    assert.equal(isPrivateRouteAllowed("POST", path), false);
  }
  assert.equal(
    isPrivateRouteAllowed(
      "GET",
      `organizer/events/${id}/reports/orders/export/other`,
    ),
    false,
  );
});
test("financial report boundary rejects corrupt or missing authoritative totals", () => {
  assert.equal(
    salesReportSchema.safeParse({ grossTicketSalesPaisa: 10.5 }).success,
    false,
  );
  assert.equal(salesReportSchema.safeParse({}).success, false);
});
