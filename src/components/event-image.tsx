"use client";
import { useState } from "react";
import styles from "./event-image.module.css";
function ImagePreview({
  src,
  title,
  publicView,
}: {
  src: string;
  title: string;
  publicView: boolean;
}) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  return (
    <div className={styles.preview}>
      {state !== "ready" && (
        <p role="status">
          {state === "failed"
            ? publicView
              ? "Cover image unavailable."
              : "Image could not load. Check the HTTPS address or try another image."
            : "Loading event image…"}
        </p>
      )}
      {state !== "failed" && (
        // Arbitrary organizer HTTPS images render in the browser, never through a server-side image proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={title}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onLoad={() => setState("ready")}
          onError={() => setState("failed")}
          className={state === "ready" ? styles.visible : styles.loading}
        />
      )}
    </div>
  );
}
export function EventImage({
  src,
  title,
  publicView = false,
}: {
  src: string | null;
  title: string;
  publicView?: boolean;
}) {
  if (!src || !src.startsWith("https://"))
    return (
      <div className={styles.preview}>
        <p>
          {publicView
            ? `EventGate · ${title}`
            : "No event image selected. An image is optional."}
        </p>
      </div>
    );
  return (
    <ImagePreview key={src} src={src} title={title} publicView={publicView} />
  );
}
