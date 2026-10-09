export default function EventsLoading() {
  return (
    <main className="events-page wrap" aria-label="Loading events">
      <div className="events-skeleton-title" />
      <div className="events-skeleton-filter" />
      <div className="event-list">
        {[1, 2, 3].map((item) => <div className="event-skeleton-card" key={item} />)}
      </div>
    </main>
  );
}
