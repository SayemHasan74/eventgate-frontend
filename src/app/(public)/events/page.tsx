import Form from "next/form";
import Link from "next/link";
import { discoveryFilterSchema, nonEmptyParams } from "@/lib/filter-schemas";
import { dhakaDayBounds, dhakaWeekend } from "@/lib/format";
import { DebouncedSearchInput } from "@/components/url-filters";
import styles from "./events.module.css";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { EventCard } from "@/components/event-card";

import { EmptyState } from "@/components/empty-state";
import { getPublicEvents, type EventDiscoveryQuery } from "@/lib/eventgate-api";

export const metadata: Metadata = {
  title: "Browse events",
  description:
    "Discover published events and live ticket availability on EventGate.",
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

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const rawQuery = await searchParams;
  const draft = nonEmptyParams(rawQuery);
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
  const result = parsed.success ? await getPublicEvents(query) : null;
  const href = (page: number, overrides: Record<string, string> = {}) => {
    const params = new URLSearchParams(
      Object.entries(filters).map(([key, value]) => [key, String(value)]),
    );
    params.set("page", String(page));
    for (const [key, value] of Object.entries(overrides))
      params.set(key, value);
    return "/events?" + params;
  };
  const weekend = dhakaWeekend();
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
            Every listing is live from EventGate. Search the programme, then
            narrow it by what matters to you.
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
              placeholder="Any city"
            />
            {fieldError("city")}
          </label>
          <label>
            <span>Category</span>
            <input
              key={String(draft.category ?? "")}
              {...field("category")}
              maxLength={80}
              placeholder="Any category"
            />
            {fieldError("category")}
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

        <p>
          <Link href={href(1, weekend)}>
            Bangladesh weekend: Friday–Saturday
          </Link>{" "}
          · <Link href="/events">Clear filters</Link>
        </p>
        {!parsed.success ? (
          <p role="alert">
            {parsed.error.issues
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join(" ")}
          </p>
        ) : !result || result.status === "unavailable" ? (
          <EmptyState
            title="The listings are taking a breath."
            description="EventGate could not reach the events service just now. Please try again in a moment."
          />
        ) : result.events.length === 0 ? (
          <EmptyState
            title="No events match this search."
            description="Try a broader search, another city, or clear a filter to see every published event."
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
