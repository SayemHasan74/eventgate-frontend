import Form from "next/form";
import Link from "next/link";
import { discoveryFilterSchema, nonEmptyParams } from "@/lib/filter-schemas";
import {
  formatMoney,
  dhakaDayBounds,
  dhakaWeekend,
  utcToDhakaLocal,
} from "@/lib/format";
import { DebouncedSearchInput } from "@/components/url-filters";
import styles from "./events.module.css";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { EventCard } from "@/components/event-card";

import { PublicRetry } from "@/components/public-retry";
import { EmptyState } from "@/components/empty-state";
import {
  getPublicEvents,
  getPublicFacets,
  type EventDiscoveryQuery,
} from "@/lib/eventgate-api";

export const metadata: Metadata = {
  title: "Browse events",
  description:
    "Discover published events by city, category, date and current sales windows.",
};

type EventsPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

const sortOptions = [
  { value: "soonest", label: "Soonest first" },
  { value: "latest", label: "Latest first" },
  { value: "newest", label: "Recently added" },
  { value: "title", label: "Title A-Z" },
] as const;

const filterLabels: Record<string, string> = {
  search: "Search",
  maxPricePaisa: "Maximum tier price",
  city: "City",
  category: "Category",
  startDate: "From",
  endDate: "Through",
  sort: "Sort",
};

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const rawQuery = await searchParams;
  const draft = nonEmptyParams(rawQuery);
  if ("budgetBdt" in rawQuery) {
    const budget = rawQuery.budgetBdt;
    delete draft.budgetBdt;
    delete draft.maxPricePaisa;
    if (typeof budget === "string" && budget.trim()) {
      draft.maxPricePaisa = /^\d+(\.\d{1,2})?$/.test(budget.trim())
        ? String(Math.round(Number(budget) * 100))
        : "invalid";
    }
  }
  const parsed = discoveryFilterSchema.safeParse(draft);
  const field = (name: string) => {
    const errors = parsed.success
      ? []
      : parsed.error.issues.filter((issue) => issue.path[0] === name);
    return {
      name,
      defaultValue: typeof draft[name] === "string" ? draft[name] : "",
      "aria-invalid": errors.length > 0,
      "aria-describedby": errors.length ? `filter-${name}-error` : undefined,
    };
  };
  const fieldError = (name: string) => {
    const errors = parsed.success
      ? []
      : parsed.error.issues.filter((issue) => issue.path[0] === name);
    return errors.length ? (
      <small id={`filter-${name}-error`} role="alert">
        {errors.map((issue) => issue.message).join(" ")}
      </small>
    ) : null;
  };
  const filters = parsed.success
    ? parsed.data
    : discoveryFilterSchema.parse({});
  const query: EventDiscoveryQuery = {
    page: filters.page,
    limit: 12,
    search: filters.search,
    maxPricePaisa: filters.maxPricePaisa,
    city: filters.city,
    category: filters.category,
    sort: filters.sort,
    startAfter: filters.startDate
      ? dhakaDayBounds(filters.startDate).start
      : undefined,
    startBefore: filters.endDate
      ? dhakaDayBounds(filters.endDate).end
      : undefined,
  };
  const [result, facets] = await Promise.all([
    parsed.success ? getPublicEvents(query) : Promise.resolve(null),
    getPublicFacets(),
  ]);
  const cities = facets.status === "ready" ? facets.cities : [];
  const categories = facets.status === "ready" ? facets.categories : [];
  const href = (
    page: number,
    overrides: Record<string, string | undefined> = {},
  ) => {
    const params = new URLSearchParams(
      Object.entries(filters).map(([key, value]) => [key, String(value)]),
    );
    params.set("page", String(page));
    for (const [key, value] of Object.entries(overrides))
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    return "/events?" + params;
  };
  const weekend = dhakaWeekend();
  const today = utcToDhakaLocal(new Date().toISOString()).slice(0, 10);
  const chips = Object.entries(filters).filter(
    ([key, value]) =>
      key !== "page" &&
      value !== undefined &&
      !(key === "sort" && value === "soonest"),
  );
  return (
    <>
      <main
        id="main-content"
        className={[styles["events-page"], "wrap"].join(" ")}
      >
        <header className={[styles["events-heading"]].join(" ")}>
          <p className="eyebrow">
            <span /> Published and ready
          </p>
          <h1>
            Find your
            <br />
            <b>next room.</b>
          </h1>
          <p>
            Browse actual published events. Search the programme, then narrow it
            by what matters to you.
          </p>
        </header>

        <Form
          scroll={false}
          className={[styles["event-filters"]].join(" ")}
          action="/events"
        >
          <input type="hidden" name="page" value="1" />
          <label className={[styles["filter-search"]].join(" ")}>
            <span className="sr-only">Search events</span>
            <Search size={18} aria-hidden="true" />
            <DebouncedSearchInput
              {...field("search")}
              maxLength={120}
              type="search"
              placeholder="Search title, city, or category"
            />
            {fieldError("search")}
          </label>
          <label>
            <span>City</span>
            <input
              key={String(draft.city ?? "")}
              {...field("city")}
              maxLength={100}
              list="discovery-cities"
              placeholder="Any city"
            />
            <datalist id="discovery-cities">
              {cities.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
            {fieldError("city")}
          </label>
          <label>
            <span>Category</span>
            <input
              key={String(draft.category ?? "")}
              {...field("category")}
              maxLength={80}
              list="discovery-categories"
              placeholder="Any category"
            />
            <datalist id="discovery-categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            {fieldError("category")}
          </label>
          <label>
            <span>Maximum tier price (BDT)</span>
            <input
              key={String(draft.maxPricePaisa ?? "")}
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              name="budgetBdt"
              defaultValue={
                filters.maxPricePaisa !== undefined
                  ? filters.maxPricePaisa / 100
                  : ""
              }
            />
            {fieldError("maxPricePaisa")}
          </label>
          <label>
            <span>Sort</span>
            <select
              key={query.sort}
              {...field("sort")}
              defaultValue={
                typeof draft.sort === "string" ? draft.sort : query.sort
              }
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldError("sort")}
          </label>
          <label>
            <span>From (Bangladesh date)</span>
            <input
              key={String(draft.startDate ?? "")}
              {...field("startDate")}
              type="date"
            />
            {fieldError("startDate")}
          </label>
          <label>
            <span>Through (Bangladesh date)</span>
            <input
              key={String(draft.endDate ?? "")}
              {...field("endDate")}
              type="date"
            />
            {fieldError("endDate")}
          </label>
          <button className="button button-primary" type="submit">
            Apply filters
          </button>
        </Form>

        <nav className={styles.shortcuts} aria-label="Date shortcuts">
          <Link href={href(1, { startDate: today, endDate: today })}>
            Today (Bangladesh)
          </Link>
          <Link href={href(1, weekend)}>
            Bangladesh weekend: Friday–Saturday
          </Link>{" "}
          <span>Or choose a custom range above.</span>
          <Link href="/events">Clear all</Link>
        </nav>
        {chips.length > 0 && (
          <nav className={styles.chips} aria-label="Active filters">
            {chips.map(([key, value]) => (
              <Link
                key={key}
                href={href(1, { [key]: undefined })}
                aria-label={`Remove ${filterLabels[key] ?? key} filter: ${value}`}
              >
                {filterLabels[key] ?? key}:{" "}
                {key === "sort"
                  ? (sortOptions.find((option) => option.value === value)
                      ?.label ?? String(value))
                  : key === "maxPricePaisa"
                    ? formatMoney(Number(value))
                    : String(value)}{" "}
                ×
              </Link>
            ))}
          </nav>
        )}
        <p className={styles.availability}>
          Availability updated recently. Listings may be cached for up to 60
          seconds; reservation checks use fresh stock.
        </p>
        {facets.status === "unavailable" && (
          <p role="status">
            City/category suggestions are unavailable. You can still enter
            filters directly.
          </p>
        )}
        {!parsed.success ? (
          <p role="alert">
            {parsed.error.issues
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join(" ")}
          </p>
        ) : !result || result.status === "unavailable" ? (
          <EmptyState
            title="The listings are taking a breath."
            description="The events service could not be reached. Your filters and navigation still work."
            action={<PublicRetry />}
          />
        ) : result.meta.page > Math.max(1, result.meta.totalPages) ? (
          <EmptyState
            title="That result page is no longer available."
            description="The matching programme has changed. Return to page one with your current filters."
            action={
              <Link className="button" href={href(1)}>
                Reset to page one
              </Link>
            }
          />
        ) : result.events.length === 0 ? (
          <EmptyState
            title="No events match this search."
            description="Try a broader search, another city, or clear a filter to see every published event."
            action={
              <Link href="/events" className="button">
                Clear all filters
              </Link>
            }
          />
        ) : (
          <>
            <div className={[styles["event-results-bar"]].join(" ")}>
              <p>
                <b>{result.meta.total}</b> published{" "}
                {result.meta.total === 1 ? "event" : "events"}
              </p>
              <span>
                Page {result.meta.page} of {result.meta.totalPages}
              </span>
            </div>
            <section
              className={[styles["event-list"]].join(" ")}
              aria-label="Published events"
            >
              {result.events.map((event) => (
                <EventCard event={event} key={event.id} />
              ))}
            </section>
            <nav aria-label="Event pages">
              {result.meta.page > 1 && (
                <Link className="button" href={href(result.meta.page - 1)}>
                  Previous
                </Link>
              )}
              {result.meta.page < result.meta.totalPages && (
                <Link className="button" href={href(result.meta.page + 1)}>
                  Next
                </Link>
              )}
            </nav>
          </>
        )}
      </main>
    </>
  );
}
