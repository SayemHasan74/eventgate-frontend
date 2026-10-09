"use client";

import { RotateCcw } from "lucide-react";

export default function EventsError({ reset }: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <main className="events-page wrap">
      <section className="empty-state">
        <RotateCcw aria-hidden="true" size={28} />
        <h2>Couldn’t load events.</h2>
        <p>The event programme hit an unexpected problem. Please try again.</p>
        <button className="button button-primary" type="button" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
