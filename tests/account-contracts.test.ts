import { test } from "node:test";
import assert from "node:assert/strict";
import { overviewSchema } from "../src/lib/account-api";
import { orderListFilterSchema } from "../src/lib/filter-schemas";
import { accountProfileFormSchema } from "../src/lib/form-schemas";
import { readError } from "../src/lib/read-error";
import { ApiError } from "../src/lib/api-error";
test("overview accepts sparse status counts and bounds every preview list", () => {
  const overview = {
    ordersByStatus: { PAID: 2 },
    activeTickets: 2,
    refundRequests: 0,
    activeHoldsCount: 0,
    serverTime: "2026-10-12T10:00:00Z",
    upcomingTickets: [],
    recentOrders: [],
    activeHolds: [],
    refundAttention: [],
  };
  assert.equal(overviewSchema.safeParse(overview).success, true);
  assert.equal(
    overviewSchema.safeParse({ ...overview, activeHoldsCount: -1 }).success,
    false,
  );
  assert.equal(
    overviewSchema.safeParse({ ...overview, recentOrders: Array(6).fill({}) })
      .success,
    false,
  );
});
test("order filters preserve search and validate inclusive date range", () => {
  assert.equal(
    orderListFilterSchema.safeParse({
      search: "concert",
      status: "PAID",
      startDate: "2026-10-01",
      endDate: "2026-10-12",
      page: "2",
    }).success,
    true,
  );
  assert.equal(
    orderListFilterSchema.safeParse({
      startDate: "2026-10-12",
      endDate: "2026-10-01",
    }).success,
    false,
  );
  assert.equal(
    orderListFilterSchema.safeParse({ startDate: "bad" }).success,
    false,
  );
});
test("profile name validation and read error categories are explicit", () => {
  const profile = {
    displayName: "Attendee",
    phone: "01700000000",
    address: "Road 12",
    city: "Dhaka",
    postalCode: "1200",
    country: "Bangladesh",
  };
  assert.equal(accountProfileFormSchema.safeParse(profile).success, true);
  assert.equal(
    accountProfileFormSchema.safeParse({
      ...profile,
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      country: "",
    }).success,
    true,
  );
  assert.equal(
    accountProfileFormSchema.safeParse({ ...profile, displayName: " " })
      .success,
    false,
  );
  assert.equal(readError(new ApiError("x", 401)).title, "Sign-in required");
  assert.equal(readError(new ApiError("x", 404)).retry, false);
  assert.equal(readError(new ApiError("x", 422)).title, "Correct the request");
  assert.equal(
    readError(new ApiError("x", 409)).title,
    "Action conflicts with current state",
  );
  assert.equal(readError(new ApiError("x", 503)).retry, true);
});
