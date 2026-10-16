import { test } from "node:test";
import assert from "node:assert/strict";
import { backDestination, workspacePath } from "../src/lib/navigation";
test("Back retains a real previous list and its filters", () => {
  assert.equal(
    backDestination("/orders?status=PAID&page=2", "/orders/booking", "/orders"),
    "/orders?status=PAID&page=2",
  );
  assert.equal(
    backDestination(
      "/events/event/tickets?tierId=tier",
      "/orders/booking",
      "/orders",
    ),
    "/events/event/tickets?tierId=tier",
  );
});
test("Back cannot loop through the same booking, sign-in, payment or redirecting homepage", () => {
  for (const path of [
    undefined,
    "/",
    "/orders/booking#receipt",
    "/orders/booking?view=receipt",
    "/auth/sign-in?next=/orders/booking",
    "/payment/success?orderId=booking",
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
    "javascript:alert(1)",
  ])
    assert.equal(
      backDestination(path, "/orders/booking", "/orders"),
      "/orders",
    );
});
test("Signed-in home destinations follow the authenticated role", () => {
  assert.equal(workspacePath("ATTENDEE"), "/account");
  assert.equal(workspacePath("ORGANIZER"), "/organizer");
  assert.equal(workspacePath("ADMIN"), "/admin");
});
