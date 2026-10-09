import type { Metadata } from "next";
import { CalendarDays, MapPin, Search, Ticket } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicEvents, type EventDiscoveryQuery, type PublicEvent } from "@/lib/eventgate-api";

export const metadata: Metadata = {
  title: "Browse events",
  description: "Discover published events and live ticket availability on EventGate.",
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
  value === "latest" || value === "newest" || value === "title" ? value : "soonest";

const formatDate = (isoDate: string) =>
  new Intl.DateTimeFormat("en-BD", { day: "numeric", month: "short", year: "numeric" }).format(new Date(isoDate));

const formatTime = (isoDate: string) =>
  new Intl.DateTimeFormat("en-BD", { hour: "numeric", minute: "2-digit" }).format(new Date(isoDate));

const formatMoney = (paisa: number) => `৳${new Intl.NumberFormat("en-BD").format(paisa / 100)}`;

function EventCard({ event }: Readonly<{ event: PublicEvent }>) {
  const totalAvailable = event.ticketTiers.reduce((total, tier) => total + tier.availableQuantity, 0);
  const lowestPrice = event.ticketTiers.reduce<number | undefined>(
    (lowest, tier) => lowest === undefined || tier.pricePaisa < lowest ? tier.pricePaisa : lowest,
    undefined,
  );

  return (
    <article className="event-card">
      <div className="event-date-block"><strong>{new Date(event.startAt).getDate()}</strong><span>{new Intl.DateTimeFormat("en-BD", { month: "short" }).format(new Date(event.startAt))}</span></div>
      <div className="event-card-main">
        <div className="event-card-labels"><span>{event.category}</span><span>{totalAvailable} left</span></div>
        <h2>{event.title}</h2>
        <p className="event-description">{event.description}</p>
        <dl className="event-facts">
          <div><dt><CalendarDays size={15} /> When</dt><dd>{formatDate(event.startAt)} · {formatTime(event.startAt)}</dd></div>
          <div><dt><MapPin size={15} /> Where</dt><dd>{event.venue}, {event.city}</dd></div>
        </dl>
      </div>
      <aside className="event-ticket-stub">
        <span>From</span>
        <strong>{lowestPrice === undefined ? "Unavailable" : formatMoney(lowestPrice)}</strong>
        <small>{event.ticketTiers.length} ticket {event.ticketTiers.length === 1 ? "tier" : "tiers"}</small>
        <Ticket size={25} aria-hidden="true" />
      </aside>
    </article>
  );
}

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
    <div className="site-shell">
      <SiteHeader />
      <main id="main-content" className="events-page wrap">
        <header className="events-heading">
          <p className="eyebrow"><span /> Published and ready</p>
          <h1>Find your<br /><b>next room.</b></h1>
          <p>Every listing is live from EventGate. Search the programme, then narrow it by what matters to you.</p>
        </header>

        <form className="event-filters" action="/events">
          <label className="filter-search">
            <span className="sr-only">Search events</span>
            <Search size={18} aria-hidden="true" />
            <input name="search" type="search" defaultValue={query.search} placeholder="Search title, city, or category" />
          </label>
          <label>
            <span>City</span>
            <input name="city" defaultValue={query.city} placeholder="Any city" />
          </label>
          <label>
            <span>Category</span>
            <input name="category" defaultValue={query.category} placeholder="Any category" />
          </label>
          <label>
            <span>Sort</span>
            <select name="sort" defaultValue={query.sort}>
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button className="button button-primary" type="submit">Apply filters</button>
        </form>

        {result.status === "unavailable" ? (
          <EmptyState title="The listings are taking a breath." description="EventGate could not reach the events service just now. Please try again in a moment." />
        ) : result.events.length === 0 ? (
          <EmptyState title="No events match this search." description="Try a broader search, another city, or clear a filter to see every published event." />
        ) : (
          <>
            <div className="event-results-bar"><p><b>{result.meta.total}</b> published {result.meta.total === 1 ? "event" : "events"}</p><span>Page {result.meta.page} of {result.meta.totalPages}</span></div>
            <section className="event-list" aria-label="Published events">
              {result.events.map((event) => <EventCard event={event} key={event.id} />)}
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
