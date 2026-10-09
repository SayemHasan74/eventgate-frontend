import Link from "next/link";
import { ArrowRight, Check, MoveUpRight, Ticket } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

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
    <div className="site-shell">
      <SiteHeader />

      <div className="ticker" aria-hidden="true">
        <div>ADMIT ONE <em>✺</em> PAYMENTS VERIFIED <em>✺</em> EVERY QR WORKS ONCE <em>✺</em> EVENTGATE <em>✺</em> ADMIT ONE <em>✺</em> PAYMENTS VERIFIED <em>✺</em> EVERY QR WORKS ONCE <em>✺</em></div>
      </div>

      <main id="main-content">
      <section className="hero wrap">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Ticketing without the guesswork</p>
          <h1>Make plans.<br /><b>Make it in.</b></h1>
          <p className="hero-lede">EventGate is the calm, clear way to discover an event, secure your spot, and get through the gate.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="#how-it-works">Explore EventGate <ArrowRight size={17} /></Link>
            <Link className="text-link" href="#organizers">I organize events <MoveUpRight size={16} /></Link>
          </div>
          <div className="hero-proof">
            <span className="proof-dots"><i /><i /><i /></span>
            <p><strong>No paper trail.</strong> Just one ticket, one QR, one easy entry.</p>
          </div>
        </div>

        <div className="hero-ticket-wrap" aria-label="An EventGate ticket example">
          <article className="hero-ticket">
            <div className="ticket-main">
              <div className="ticket-topline"><span>ADMIT <b>ONE</b></span><span>PASS NO. 0001</span></div>
              <p className="ticket-kicker">Your next plan is waiting</p>
              <h2>SHOW<br />UP.</h2>
              <div className="ticket-meta">
                <div><small>ONE PLACE</small><strong>Everything<br />you booked</strong></div>
                <div><small>ONE PASS</small><strong>Private QR<br />admission</strong></div>
              </div>
              <div className="ticket-route"><span>FIND</span><i /><span>RESERVE</span><i /><span>ENTER</span></div>
            </div>
            <aside className="ticket-stub">
              <span className="stub-label">Gate ready</span>
              <div className="qr-art" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
              <span className="stub-code">EG / 01 / GO</span>
            </aside>
          </article>
          <p className="ticket-caption"><Ticket size={16} /> Built for the moment the doors open.</p>
        </div>
      </section>

      <section className="how-section wrap" id="how-it-works" aria-labelledby="how-title">
        <div className="section-intro">
          <p className="eyebrow"><span /> A better route to the room</p>
          <h2 id="how-title">From “maybe” to <b>“I’m in.”</b></h2>
          <p>Every part has a job. Browse with confidence, buy without ambiguity, and enter without a queue of questions.</p>
        </div>
        <div className="steps-grid">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <p>{step.number}</p>
              <h3>{step.title}</h3>
              <span>{step.text}</span>
              <i aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section className="promise-band" id="organizers">
        <div className="wrap promise-inner">
          <div>
            <p className="eyebrow eyebrow-light"><span /> What stays simple</p>
            <h2>A ticket should<br />feel like a <b>yes.</b></h2>
          </div>
          <ul>
            {promises.map((promise) => <li key={promise}><Check size={17} /> {promise}</li>)}
          </ul>
        </div>
      </section>

      <section className="closing wrap" id="get-started">
        <p className="eyebrow"><span /> Your next event starts here</p>
        <h2>See you at the <b>gate.</b></h2>
        <Link className="button button-primary" href="#how-it-works">See how it works <ArrowRight size={17} /></Link>
      </section>
      </main>

      <SiteFooter />
    </div>
  );
}
