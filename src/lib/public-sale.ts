import type { PublicTicketTier } from "./eventgate-api";
export type PublicSaleState =
  "OPEN" | "UPCOMING" | "SOLD_OUT" | "PAUSED" | "CLOSED";
export function tierSaleState(
  tier: PublicTicketTier,
  eventStart: string,
  now = Date.now(),
): PublicSaleState {
  if (now >= Date.parse(eventStart) || now >= Date.parse(tier.salesEndAt))
    return "CLOSED";
  if (tier.salesPaused) return "PAUSED";
  if (now < Date.parse(tier.salesStartAt)) return "UPCOMING";
  return tier.availableQuantity > 0 ? "OPEN" : "SOLD_OUT";
}
export function eventSaleSummary(
  event: { startAt: string; ticketTiers: PublicTicketTier[] },
  now = Date.now(),
) {
  const tiers = event.ticketTiers.map((tier) => ({
    tier,
    state: tierSaleState(tier, event.startAt, now),
  }));
  const open = tiers.filter(({ state }) => state === "OPEN");
  const upcoming = tiers.filter(
    ({ state, tier }) => state === "UPCOMING" && tier.availableQuantity > 0,
  );
  if (open.length)
    return {
      state: "OPEN",
      label: "On sale",
      pricePaisa: Math.min(...open.map(({ tier }) => tier.pricePaisa)),
      futurePrice: false,
    } as const;
  if (upcoming.length)
    return {
      state: "UPCOMING",
      label: "Coming soon",
      pricePaisa: Math.min(...upcoming.map(({ tier }) => tier.pricePaisa)),
      futurePrice: true,
    } as const;
  const state = tiers.some(
    ({ state, tier }) =>
      state === "SOLD_OUT" ||
      (state === "UPCOMING" && tier.availableQuantity === 0),
  )
    ? "SOLD_OUT"
    : tiers.some(({ state }) => state === "PAUSED")
      ? "PAUSED"
      : "CLOSED";
  return {
    state,
    label:
      state === "SOLD_OUT"
        ? "Sold out"
        : state === "PAUSED"
          ? "Sales paused"
          : "Sales closed",
    pricePaisa: null,
    futurePrice: false,
  } as const;
}
