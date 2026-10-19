import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aiFiltersSchema,
  aiSearchHref,
  eventAnswerSchema,
} from "../src/lib/ai-api";

test("AI search navigation is constructed locally with encoded, validated filters", () => {
  const href = aiSearchHref({
    city: "Dhaka & Sylhet",
    search: "https://evil.test/?admin=true",
    maxPricePaisa: 100000,
  });
  const url = new URL(href, "https://eventgate.test");
  assert.equal(url.origin, "https://eventgate.test");
  assert.equal(url.pathname, "/events");
  assert.equal(url.searchParams.get("city"), "Dhaka & Sylhet");
  assert.equal(url.searchParams.get("maxPricePaisa"), "100000");
});
test("AI filter boundaries reject unknown commands and invalid dates or money", () => {
  for (const input of [
    { href: "//evil.test" },
    { maxPricePaisa: -1 },
    { maxPricePaisa: 0.5 },
    { startDate: "2026-02-30" },
    { executeSql: "DROP TABLE Event" },
  ])
    assert.equal(aiFiltersSchema.safeParse(input).success, false);
});
test("Event assistant sources cannot navigate outside published event pages", () => {
  const answer = {
    answered: true,
    message: "Published facts",
    cached: false,
    sources: [
      {
        id: "refunds",
        label: "Refund policy",
        text: "Policy",
        href: "/events/tech-meetup#policy-heading",
      },
    ],
  };
  assert.equal(eventAnswerSchema.safeParse(answer).success, true);
  for (const href of [
    "https://evil.test",
    "//evil.test",
    "/events/../admin",
    "/events/tech?redirect=https://evil.test",
    "javascript:alert(1)",
  ])
    assert.equal(
      eventAnswerSchema.safeParse({
        ...answer,
        sources: [{ ...answer.sources[0], href }],
      }).success,
      false,
    );
});
