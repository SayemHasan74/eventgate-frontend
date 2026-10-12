import styles from "./events.module.css";
export default function EventsLoading() {
  return (
    <main
      className={[styles["events-page"], "wrap"].join(" ")}
      aria-label="Loading events"
    >
      <div className="events-skeleton-title" />
      <div className="events-skeleton-filter" />
      <div className={[styles["event-list"]].join(" ")}>
        {[1, 2, 3].map((item) => (
          <div className="event-skeleton-card" key={item} />
        ))}
      </div>
    </main>
  );
}
