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

const asSingleValue = (value: string | string[] | undefined) =>
  typeof value === "string" ? value.trim() : undefined;

const asPage = (value: string | undefined) => {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

const asSort = (value: string | undefined): EventDiscoveryQuery["sort"] =>
  value === "latest" || value === "newest" || value === "title"
    ? value
    : "soonest";

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const rawQuery = await searchParams;
  const query: EventDiscoveryQuery = {
    page: asPage(asSingleValue(rawQuery.page)),
    limit: 12,
    search: asSingleValue(rawQuery.search),
    category: asSingleValue(rawQuery.category),
    city: asSingleValue(rawQuery.city),
    sort: asSort(asSingleValue(rawQuery.sort)),
  };
  const result = await getPublicEvents(query);

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

        <form className={[styles["event-filters"]].join(" ")} action="/events">
          <label className={[styles["filter-search"]].join(" ")}>
            <span className="sr-only">Search events</span>
            <Search size={18} aria-hidden="true" />
            <input
              name="search"
              type="search"
              defaultValue={query.search}
              placeholder="Search title, city, or category"
            />
          </label>
          <label>
            <span>City</span>
            <input
              name="city"
              defaultValue={query.city}
              placeholder="Any city"
            />
          </label>
          <label>
            <span>Category</span>
            <input
              name="category"
              defaultValue={query.category}
              placeholder="Any category"
            />
          </label>
          <label>
            <span>Sort</span>
            <select name="sort" defaultValue={query.sort}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="button button-primary" type="submit">
            Apply filters
          </button>
        </form>

        {result.status === "unavailable" ? (
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
          </>
        )}
      </main>
    </>
  );
}
