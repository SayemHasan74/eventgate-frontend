"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth-provider";
import { privateKey } from "@/lib/query-keys";
import { getAccountOverview } from "@/lib/account-api";
import { getRecommendations } from "@/lib/recommendations-api";
import { EventCard } from "./event-card";
import { EventPreferencesPanel } from "./event-preferences";
import { ReadFailure } from "./read-failure";
import { Skeleton } from "./ui";
import styles from "./recommendations.module.css";
export function Recommendations({
  deferUntilOverview = false,
}: {
  deferUntilOverview?: boolean;
}) {
  const { session, isReady } = useAuth();
  const attendee = isReady && session?.user.role === "ATTENDEE";
  const overview = useQuery({
    queryKey: privateKey("overview", session?.user.id, "me", {}),
    queryFn: getAccountOverview,
    enabled: deferUntilOverview && !!attendee,
    retry: false,
  });
  const active = attendee && (!deferUntilOverview || overview.isSuccess);
  const section = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  useEffect(() => {
    if (!active || !section.current) return;
    if (window.location.hash === "#recommended-events") {
      const frame = requestAnimationFrame(() => {
        section.current?.scrollIntoView({ block: "start" });
        setNearViewport(true);
      });
      return () => cancelAnimationFrame(frame);
    }
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setNearViewport(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(section.current);
    return () => observer.disconnect();
  }, [active]);
  const query = useQuery({
    queryKey: privateKey("recommendations", session?.user.id),
    queryFn: getRecommendations,
    enabled: !!active && nearViewport,
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });
  if (!attendee) return null;
  return (
    <div
      id="recommended-events"
      ref={section}
      className={`${styles.section} wrap`}
    >
      <div className={styles.header}>
        <div>
          <p className="eyebrow">Your next outing</p>
          <h2>{query.data?.heading ?? "Your events"}</h2>
        </div>
        <Link className="text-link" href="/events">
          Browse every event →
        </Link>
      </div>
      {query.data?.explanation && <p role="status">{query.data.explanation}</p>}
      {nearViewport && <EventPreferencesPanel compact />}
      {query.isError ? (
        <ReadFailure
          error={query.error}
          retry={() => void query.refetch()}
          fetching={query.isFetching}
          next="/account"
        />
      ) : !query.data ? (
        <Skeleton />
      ) : query.data.events.length ? (
        <div className={styles.grid}>
          {query.data.events.map((row) => (
            <EventCard
              key={row.event.id}
              event={row.event}
              reason={row.reason}
              now={Date.parse(query.data.serverTime)}
            />
          ))}
        </div>
      ) : (
        <p>
          No new upcoming events to suggest. Events you already have a valid
          booking for are excluded.
        </p>
      )}
      {query.data && (
        <p className={styles.note}>
          Availability shown at{" "}
          {new Date(query.data.serverTime).toLocaleTimeString()}. Stock is
          checked again when you select tickets. Suggestions never reserve
          tickets.
        </p>
      )}
    </div>
  );
}
