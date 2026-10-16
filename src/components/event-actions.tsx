"use client";
import { useState } from "react";
import { CalendarPlus, Share2 } from "lucide-react";
import type { PublicEvent } from "@/lib/eventgate-api";

const escapeText = (text: string) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
const timestamp = (value: string) =>
  new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
// RFC 5545 folds at 75 UTF-8 octets, without splitting a Unicode character.
function fold(line: string) {
  const encoder = new TextEncoder();
  let result = "",
    width = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (width + size > 75) {
      result += "\r\n ";
      width = 1;
    }
    result += character;
    width += size;
  }
  return result;
}
export function EventActions({
  event,
  url,
}: {
  event: PublicEvent;
  url: string;
}) {
  const [message, setMessage] = useState("");
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text: event.title, url });
        setMessage("Event shared.");
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("Event link copied.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setMessage("Event link copied.");
      } catch {
        setMessage(`Copy this event link: ${url}`);
      }
    }
  };
  const calendar = () => {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//EventGate//Events//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${event.id}@${new URL(url).hostname}`,
      `DTSTAMP:${timestamp(new Date().toISOString())}`,
      `DTSTART:${timestamp(event.startAt)}`,
      `DTEND:${timestamp(event.endAt)}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(`${event.description}\n${url}`)}`,
      `LOCATION:${escapeText(`${event.venue}, ${event.address}, ${event.city}`)}`,
      `URL:${url}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    const objectUrl = URL.createObjectURL(
      new Blob([lines.map(fold).join("\r\n") + "\r\n"], {
        type: "text/calendar;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${event.slug}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    setMessage("Calendar file downloaded. Open it in your calendar app.");
  };
  return (
    <div>
      <div className="event-action-buttons">
        <button type="button" className="button" onClick={share}>
          <Share2 size={16} /> Share event
        </button>
        <button type="button" className="button" onClick={calendar}>
          <CalendarPlus size={16} /> Add to calendar
        </button>
      </div>
      <p role="status">{message}</p>
    </div>
  );
}
