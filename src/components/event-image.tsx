"use client";
import { useState } from "react";
import styles from "./event-image.module.css";
function ImagePreview({ src, title }: { src: string; title: string }) {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  return (
    <div className={styles.preview}>
      {state !== "ready" && (
        <p role="status">
          {state === "failed"
            ? "Image could not load. Check the HTTPS address or try another image."
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
}: {
  src: string | null;
  title: string;
}) {
  if (!src || !src.startsWith("https://"))
    return (
      <div className={styles.preview}>
        <p>No event image selected. An image is optional.</p>
      </div>
    );
  return <ImagePreview key={src} src={src} title={title} />;
}
