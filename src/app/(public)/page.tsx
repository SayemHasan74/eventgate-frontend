import styles from "./home.module.css";
import Link from "next/link";
import { ArrowRight, Check, MoveUpRight, Ticket } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Find your people",
    text: "Browse published events by city, category, or date - then see the exact tickets still available.",
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
  "Live ticket availability",
  "Verified payment flow",
  "One-scan QR admission",
  "Clear refund status",
];

export default function Home() {
  return (
    <>
      <div className={[styles["ticker"]].join(" ")} aria-hidden="true">
        <div>
          ADMIT ONE <em>✺</em> PAYMENTS VERIFIED <em>✺</em> EVERY QR WORKS ONCE{" "}
          <em>✺</em> EVENTGATE <em>✺</em> ADMIT ONE <em>✺</em> PAYMENTS VERIFIED{" "}
          <em>✺</em> EVERY QR WORKS ONCE <em>✺</em>
        </div>
      </div>

      <main id="main-content">
        <section className={[styles["hero"], "wrap"].join(" ")}>
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> Ticketing without the guesswork
            </p>
            <h1>
              Make plans.
              <br />
              <b>Make it in.</b>
            </h1>
            <p className={[styles["hero-lede"]].join(" ")}>
              EventGate is the calm, clear way to discover an event, secure your
              spot, and get through the gate.
            </p>
            <div className={[styles["hero-actions"]].join(" ")}>
              <Link className="button button-primary" href="#how-it-works">
                Explore EventGate <ArrowRight size={17} />
              </Link>
              <Link className="text-link" href="#organizers">
                I organize events <MoveUpRight size={16} />
              </Link>
            </div>
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
                  SHOW
                  <br />
                  UP.
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
                <span /> What stays simple
              </p>
              <h2>
                A ticket should
                <br />
                feel like a <b>yes.</b>
              </h2>
            </div>
            <ul>
              {promises.map((promise) => (
                <li key={promise}>
                  <Check size={17} /> {promise}
                </li>
              ))}
            </ul>
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
          <Link className="button button-primary" href="#how-it-works">
            See how it works <ArrowRight size={17} />
          </Link>
        </section>
      </main>
    </>
  );
}
