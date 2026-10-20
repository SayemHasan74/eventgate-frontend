"use client";
import { useState } from "react";
import { eventImageSources } from "@/lib/event-image";
import styles from "./event-image.module.css";
function ImagePreview({
  src,
  title,
  publicView,
  priority,
  sizes,
}: {
  src: string;
  title: string;
  publicView: boolean;
  priority: boolean;
  sizes: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.preview}>
      {failed && (
        <p role="status">
          {publicView
            ? "Cover image unavailable."
            : "Image could not load. Check the HTTPS address or try another image."}
        </p>
      )}
      {!failed && (
        // Arbitrary organizer HTTPS images render in the browser, never through a server-side image proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          {...eventImageSources(src)}
          sizes={sizes}
          alt={title}
          referrerPolicy="no-referrer"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onError={() => setFailed(true)}
          className={styles.visible}
        />
      )}
    </div>
  );
}
export function EventImage({
  src,
  title,
  publicView = false,
  priority = false,
  sizes = "100vw",
}: {
  src: string | null;
  title: string;
  publicView?: boolean;
  priority?: boolean;
  sizes?: string;
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
    <ImagePreview
      key={src}
      src={src}
      title={title}
      publicView={publicView}
      priority={priority}
      sizes={sizes}
    />
  );
}
