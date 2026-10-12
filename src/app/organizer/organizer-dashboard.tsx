"use client";
import { privateKey } from "@/lib/query-keys";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  CirclePlus,
  FilePenLine,
  LayoutDashboard,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FilterBar, Input, Select } from "@/components/ui";
import { Pagination, ErrorState } from "@/components/ui/interactive";

import { useAuth } from "@/components/auth-provider";
import { getManagedEvents, OrganizerApiError } from "@/lib/organizer-api";

import styles from "./organizer.module.css";

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(new Date(date));

export function OrganizerDashboard({
  catalogue = false,
}: {
  catalogue?: boolean;
}) {
  const { isReady, session } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [status, setStatus] = useState("");
  const allowed =
    session?.user.role === "ORGANIZER" || session?.user.role === "ADMIN";
  const eventsQuery = useQuery({
    queryKey: privateKey("organizer-events", session?.user.id, "list", {
      page,
      search,
      status,
      catalogue,
    }),
    queryFn: () =>
      getManagedEvents(
        new URLSearchParams({
          page: String(page),
          limit: catalogue ? "20" : "5",
          ...(search ? { search } : {}),
          ...(status ? { status } : {}),
        }),
      ),
    enabled: isReady && Boolean(session) && allowed,
    retry: false,
  });

  if (!isReady) return <div className={styles.loading}>Opening workspace…</div>;
  if (!session)
    return (
      <section className={styles.gate}>
        <LayoutDashboard size={29} aria-hidden="true" />
        <h1>Sign in to access organizer tools.</h1>
        <p>
          Organizers manage their published events from a separate workspace.
        </p>
        <Link
          className="button button-primary"
          href="/auth/sign-in?next=/organizer"
        >
          Sign in <ArrowRight size={16} />
        </Link>
      </section>
    );
  if (!allowed)
    return (
      <section className={styles.gate}>
        <LayoutDashboard size={29} aria-hidden="true" />
        <h1>Organizer access required.</h1>
        <p>
          Your current account is an attendee account. An administrator must
          assign an organizer role before you can manage events.
        </p>
        <Link className="button button-primary" href="/account">
          My account <ArrowRight size={16} />
        </Link>
      </section>
    );

  const events = eventsQuery.data?.data ?? [];
  const drafts = events.filter((event) => event.status === "DRAFT").length;
  const published = events.filter(
    (event) => event.status === "PUBLISHED",
  ).length;
  return (
    <div className={styles.dashboard}>
      <header className={styles.hero}>
        <div>
          <p className="eyebrow">
            <span /> Organizer workspace
          </p>
          <h1>{catalogue ? "Your event catalogue" : "Organizer overview"}</h1>
          <p>
            Manage event fundamentals here. Ticket tiers, publishing, check-in,
            and reporting follow as dedicated tools.
          </p>
        </div>
        <Link className="button button-primary" href="/organizer/events/new">
          <CirclePlus size={17} /> Create event
        </Link>
      </header>
      {!catalogue && (
        <section className={styles.stats} aria-label="Event statistics">
          <div>
            <span>All events</span>
            <strong>{eventsQuery.data?.meta.total ?? "—"}</strong>
          </div>
          <div>
            <span>Published in recent events</span>
            <strong>{published}</strong>
          </div>
          <div>
            <span>Drafts in recent events</span>
            <strong>{drafts}</strong>
          </div>
        </section>
      )}
      {catalogue && (
        <FilterBar>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(searchDraft.trim());
              setPage(1);
            }}
          >
            <label>
              Search events
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
            </label>
            <button className="button" type="submit">
              Search
            </button>
          </form>
          <label>
            Status
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All states</option>
              {["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </label>
        </FilterBar>
      )}
      <section
        className={styles.events}
        aria-labelledby="managed-events-heading"
      >
        <div className={styles.eventsHeading}>
          <div>
            <p className="eyebrow">
              <span /> Your programme
            </p>
            <h2 id="managed-events-heading">
              Managed <b>events.</b>
            </h2>
          </div>
        </div>
        {eventsQuery.isLoading ? (
          <p className={styles.muted}>Loading your events…</p>
        ) : eventsQuery.isError ? (
          <ErrorState
            message={
              eventsQuery.error instanceof OrganizerApiError
                ? eventsQuery.error.message
                : "Your events could not be loaded."
            }
            retry={() => void eventsQuery.refetch()}
          />
        ) : events.length === 0 ? (
          <div className={styles.empty}>
            <CalendarDays size={26} aria-hidden="true" />
            <h3>Your programme is clear.</h3>
            <p>
              Create a draft event, then add ticket tiers before you publish it.
            </p>
            <Link
              className="button button-primary"
              href="/organizer/events/new"
            >
              Create event <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className={styles.eventList}>
            {events.map((event) => (
              <Link
                className={styles.eventCard}
                href={`/organizer/events/${event.id}`}
                key={event.id}
              >
                <div>
                  <span className={styles.status}>{event.status}</span>
                  <h3>{event.title}</h3>
                  <p>
                    <CalendarDays size={14} /> {formatDate(event.startAt)} <i />{" "}
                    <MapPin size={14} /> {event.city}
                  </p>
                </div>
                <FilePenLine size={19} aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </section>
      {catalogue && eventsQuery.data && (
        <Pagination
          page={page}
          totalPages={eventsQuery.data.meta.totalPages}
          onPageChange={setPage}
        />
      )}
      {!catalogue && (
        <Link className="text-link" href="/organizer/events">
          Open the event catalogue
        </Link>
      )}
    </div>
  );
}
