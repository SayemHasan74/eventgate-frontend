import { test } from "node:test";
import assert from "node:assert/strict";
import { isPrivateRouteAllowed } from "../src/lib/server/private-routes";
import {
  adminRecordLink,
  adminPaymentSchema,
  adminDateParams,
} from "../src/lib/admin-workflow-api";
import {
  userMutationSchema,
  refundReviewSchema,
} from "../src/lib/form-schemas";
const id = "123e4567-e89b-42d3-a456-426614174000";
test("admin recovery uses exact routes and does not expose a success override", () => {
  for (const path of [
    `admin/payments/${id}/reconcile`,
    `admin/refunds/${id}/reconcile`,
    `admin/reports/jobs/${id}/retry`,
  ])
    assert.equal(isPrivateRouteAllowed("POST", path), true);
  assert.equal(
    isPrivateRouteAllowed("POST", `admin/payments/${id}/force-success`),
    false,
  );
  assert.equal(
    isPrivateRouteAllowed("POST", "admin/reports/jobs/execute"),
    false,
  );
});
test("record links and date filters are safe local navigation", () => {
  assert.equal(adminRecordLink("REFUND", id), `/admin/refunds/${id}`);
  assert.equal(adminRecordLink("USER", "https://evil.test"), null);
  assert.equal(adminRecordLink("TOKEN", id), null);
  assert.equal(
    adminDateParams({ startDate: "2026-10-13" }).get("startAfter"),
    "2026-10-12T18:00:00.000Z",
  );
});
test("sensitive user and refund actions require reasons before submission", () => {
  assert.equal(
    userMutationSchema.safeParse({ path: "role", role: "ORGANIZER" }).success,
    false,
  );
  assert.equal(
    userMutationSchema.safeParse({
      path: "role",
      role: "ADMIN",
      reason: "Not permitted",
    }).success,
    false,
  );
  assert.equal(
    refundReviewSchema.safeParse({ decision: "approve", reviewerNote: "" })
      .success,
    false,
  );
  assert.equal(
    adminPaymentSchema.safeParse({ status: "SUCCEEDED" }).success,
    false,
  );
});
