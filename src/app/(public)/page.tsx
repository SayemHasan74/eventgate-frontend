import { Suspense } from "react";
import { currentSession, sessionIdentity } from "@/lib/server/browser-session";
import { SessionError } from "@/lib/server/session-store";
import { SessionUnavailable } from "@/components/session-unavailable";
import { workspacePath } from "@/lib/navigation";
import { redirect } from "next/navigation";
import Form from "next/form";
import { EventCard } from "@/components/event-card";
import { Recommendations } from "@/components/recommendations";
import { EmptyState } from "@/components/empty-state";
import { OrganizerLink } from "@/components/organizer-link";
import { PublicRetry } from "@/components/public-retry";
import { getUpcomingPublicEvents, getPublicFacets } from "@/lib/eventgate-api";
import styles from "./home.module.css";
import Link from "next/link";
import { ArrowRight, Check, MoveUpRight, Ticket } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Find your people",
    text: "Browse published events by city, category, or date - then review sales windows and the latest displayed availability.",
  },
  {
    number: "02",
    title: "Hold your place",
    text: "Reserve a ticket for 15 minutes, pay through SSLCommerz, and keep every order in one clear ledger.",
  },
  {
    number: "03",
    title: "Walk straight in",
    text: "Every paid ticket gets one private QR pass. One scan admits it. A second scan never does.",
  },
];

const promises = [
  "Private draft previews",
  "Saved inventory and sales controls",
  "Attendance and order reports",
  "Cancellation and refund progress",
];

async function HomeRedirect() {
  let destination: string | null = null;
  try {
    const session = await currentSession();
    if (session)
      destination = workspacePath((await sessionIdentity(session)).role);
  } catch (error) {
    if (!(error instanceof SessionError && error.status === 401))
      return <SessionUnavailable />;
  }
  if (destination) redirect(destination);
  return null;
}

async function HomeCities() {
  const facets = await getPublicFacets();
  return (
    <datalist id="home-cities">
      {facets.status === "ready" &&
        facets.cities.map((city) => <option key={city} value={city} />)}
    </datalist>
  );
}

async function HomeProgramme() {
  const [events, facets] = await Promise.all([
    getUpcomingPublicEvents(),
    getPublicFacets(),
  ]);
  const upcoming = events.status === "ready" ? events.events : [];
  return (
    <section
      className={`wrap ${styles.discovery}`}
      aria-labelledby="upcoming-title"
    >
      <div className={styles.discoveryHeading}>
        <div>
          <p className="eyebrow">
            <span /> From the programme
          </p>
          <h2 id="upcoming-title">Coming up.</h2>
        </div>
        <Link href="/events" className="text-link">
          Browse all events →
        </Link>
      </div>
      <p>
        Availability updated recently. Listings are cached; stock is checked
        again before reservation.
      </p>
      {events.status === "unavailable" ? (
        <EmptyState
          title="The programme could not load."
          description="You can still search or explore how EventGate works. Retry when the events service is available."
          action={<PublicRetry />}
        />
      ) : upcoming.length ? (
        <div className={styles.homeEvents}>
          {upcoming.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No upcoming published events yet."
          description="Check the event catalogue for the full programme."
          action={
            <Link href="/events" className="button">
              Browse events
            </Link>
          }
        />
      )}
      {facets.status === "ready" && facets.categories.length > 0 && (
        <nav className={styles.categories} aria-label="Event categories">
          {facets.categories.map((category) => (
            <Link
              key={category}
              href={`/events?category=${encodeURIComponent(category)}`}
            >
              {category}
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Suspense fallback={null}>
        <HomeRedirect />
      </Suspense>
      <div className={[styles["ticker"]].join(" ")} aria-hidden="true">
        <div>
          ADMIT ONE <em>✺</em> PAYMENTS VERIFIED <em>✺</em> EVERY QR WORKS ONCE{" "}
          <em>✺</em> EVENTGATE <em>✺</em> ADMIT ONE <em>✺</em> PAYMENTS VERIFIED{" "}
          <em>✺</em> EVERY QR WORKS ONCE <em>✺</em>
        </div>
      </div>

      <main id="main-content">
        <section className={[styles["hero"], "wrap"].join(" ")}>
          <div className={styles.heroCopy}>
            <p className="eyebrow">
              <span /> Ticketing without the guesswork
            </p>
            <h1>
              <span>Make plans.</span>
              <b>Make it in.</b>
            </h1>
            <p className={[styles["hero-lede"]].join(" ")}>
              EventGate is the calm, clear way to discover an event, secure your
              spot, and get through the gate.
            </p>
            <Form action="/events" className={styles.homeSearch}>
              <label>
                What are you looking for?
                <input
                  name="search"
                  type="search"
                  maxLength={120}
                  placeholder="Event, topic or category"
                />
              </label>
              <label>
                City
                <input
                  name="city"
                  list="home-cities"
                  maxLength={100}
                  placeholder="Any city"
                />
                <Suspense fallback={null}>
                  <HomeCities />
                </Suspense>
              </label>
              <button className="button button-primary" type="submit">
                Find events <ArrowRight size={17} />
              </button>
            </Form>
            <OrganizerLink className="text-link">
              I organize events <MoveUpRight size={16} />
            </OrganizerLink>
            <div className={[styles["hero-proof"]].join(" ")}>
              <span className={[styles["proof-dots"]].join(" ")}>
                <i />
                <i />
                <i />
              </span>
              <p>
                <strong>No paper trail.</strong> Just one ticket, one QR, one
                easy entry.
              </p>
            </div>
          </div>

          <div
            className={[styles["hero-ticket-wrap"]].join(" ")}
            aria-label="An EventGate ticket example"
          >
            <article className={[styles["hero-ticket"]].join(" ")}>
              <div className={[styles["ticket-main"]].join(" ")}>
                <div className={[styles["ticket-topline"]].join(" ")}>
                  <span>
                    ADMIT <b>ONE</b>
                  </span>
                  <span>PASS NO. 0001</span>
                </div>
                <p className={[styles["ticket-kicker"]].join(" ")}>
                  Your next plan is waiting
                </p>
                <h2>
                  <span>SHOW</span>
                  <span>UP.</span>
                </h2>
                <div className={[styles["ticket-meta"]].join(" ")}>
                  <div>
                    <small>ONE PLACE</small>
                    <strong>
                      Everything
                      <br />
                      you booked
                    </strong>
                  </div>
                  <div>
                    <small>ONE PASS</small>
                    <strong>
                      Private QR
                      <br />
                      admission
                    </strong>
                  </div>
                </div>
                <div className={[styles["ticket-route"]].join(" ")}>
                  <span>FIND</span>
                  <i />
                  <span>RESERVE</span>
                  <i />
                  <span>ENTER</span>
                </div>
              </div>
              <aside className={[styles["ticket-stub"]].join(" ")}>
                <span className={[styles["stub-label"]].join(" ")}>
                  Gate ready
                </span>
                <div
                  className={[styles["qr-art"]].join(" ")}
                  aria-hidden="true"
                >
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <span className={[styles["stub-code"]].join(" ")}>
                  EG / 01 / GO
                </span>
              </aside>
            </article>
            <p className={[styles["ticket-caption"]].join(" ")}>
              <Ticket size={16} /> Built for the moment the doors open.
            </p>
          </div>
        </section>

        <Recommendations />
        <Suspense
          fallback={
            <section className="wrap" aria-busy="true">
              <p>Loading upcoming events…</p>
            </section>
          }
        >
          <HomeProgramme />
        </Suspense>

        <section
          className={[styles["how-section"], "wrap"].join(" ")}
          id="how-it-works"
          aria-labelledby="how-title"
        >
          <div className={[styles["section-intro"]].join(" ")}>
            <p className="eyebrow">
              <span /> A better route to the room
            </p>
            <h2 id="how-title">
              From “maybe” to <b>“I’m in.”</b>
            </h2>
            <p>
              Every part has a job. Browse with confidence, buy without
              ambiguity, and enter without a queue of questions.
            </p>
          </div>
          <div className={[styles["steps-grid"]].join(" ")}>
            {steps.map((step) => (
              <article
                className={[styles["step-card"]].join(" ")}
                key={step.number}
              >
                <p>{step.number}</p>
                <h3>{step.title}</h3>
                <span>{step.text}</span>
                <i aria-hidden="true" />
              </article>
            ))}
          </div>
        </section>

        <section className={[styles["promise-band"]].join(" ")} id="organizers">
          <div className={["wrap", styles["promise-inner"]].join(" ")}>
            <div>
              <p className={["eyebrow", styles["eyebrow-light"]].join(" ")}>
                <span /> For organizers
              </p>
              <h2>
                Bring your event
                <br />
                to the <b>room.</b>
              </h2>
            </div>
            <div>
              <ul>
                {promises.map((promise) => (
                  <li key={promise}>
                    <Check size={17} /> {promise}
                  </li>
                ))}
              </ul>
              <OrganizerLink className="button button-primary">
                Organizer access and tools <ArrowRight size={17} />
              </OrganizerLink>
            </div>
          </div>
        </section>

        <section
          className={[styles["closing"], "wrap"].join(" ")}
          id="get-started"
        >
          <p className="eyebrow">
            <span /> Your next event starts here
          </p>
          <h2>
            See you at the <b>gate.</b>
          </h2>
          <Link className="button button-primary" href="/events">
            Find your next event <ArrowRight size={17} />
          </Link>
        </section>
      </main>
    </>
  );
}
