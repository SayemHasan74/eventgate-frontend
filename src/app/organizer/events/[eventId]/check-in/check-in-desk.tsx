"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ReadFailure } from "@/components/read-failure";
import { Pagination } from "@/components/ui/interactive";
import { useUrlFilters } from "@/components/url-filters";
import { checkInHistoryFilterSchema } from "@/lib/filter-schemas";
import {
  checkInTicket,
  getCheckInHistory,
  getManagedEvent,
  type CheckInResult,
} from "@/lib/organizer-api";
import { CameraSession, cameraError } from "@/lib/camera-session";
import { ScanGate } from "@/lib/scan-gate";
import { privateKey, invalidateMutation } from "@/lib/query-keys";
import { ApiError } from "@/lib/api-error";
import { formatEventRange, formatEventDate } from "@/lib/format";
import styles from "./check-in.module.css";

const subscribe = (callback: () => void) => {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
};
const visible = () => document.visibilityState === "visible";
type DeskResult =
  | CheckInResult
  | {
      resultCode:
        "INVALID_INPUT" | "NETWORK_UNAVAILABLE" | "ACCESS_UNAVAILABLE";
    };
const resultText: Record<DeskResult["resultCode"], [string, string]> = {
  ACCEPTED: ["Entry accepted", "The server admitted this pass once."],
  ALREADY_CHECKED_IN: [
    "Already checked in",
    "This pass was admitted earlier. Do not admit another guest with it.",
  ],
  INVALID_TICKET: [
    "Invalid ticket",
    "The server could not find a valid EventGate pass for this token.",
  ],
  WRONG_EVENT: [
    "Wrong event",
    "This QR belongs to another event. No foreign attendee information is shown.",
  ],
  WINDOW_CLOSED: [
    "Admission window closed",
    "The server rejected entry outside the published check-in window.",
  ],
  ADMISSION_BLOCKED: [
    "Pass blocked / invalid",
    "This pass is voided, refunded, or blocked by its payment/refund state. No admission occurred.",
  ],
  INVALID_INPUT: [
    "Not an EventGate ticket token",
    "URLs, oversized QR content and malformed tokens are rejected without opening or submitting them.",
  ],
  NETWORK_UNAVAILABLE: [
    "Outcome not confirmed",
    "The request may have reached the server. Review history before retrying; no offline admission is allowed.",
  ],
  ACCESS_UNAVAILABLE: [
    "Access unavailable",
    "The desk or session is no longer available to this operator. No admission is being claimed.",
  ],
};

export function CheckInDesk() {
  const { session, isReady } = useAuth();
  const { eventId } = useParams<{ eventId: string }>();
  if (!isReady) return <p>Opening your session…</p>;
  if (!session || !["ORGANIZER", "ADMIN"].includes(session.user.role))
    return (
      <section className={styles.gate}>
        <h1>Organizer access required.</h1>
        <Link className="button" href="/account">
          My account
        </Link>
      </section>
    );
  return (
    <AuthorizedDesk
      key={eventId + ":" + session.user.id + ":" + session.user.role}
      eventId={eventId}
      userId={session.user.id}
    />
  );
}
function AuthorizedDesk({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) {
  const client = useQueryClient();
  const isVisible = useSyncExternalStore(subscribe, visible, () => false);
  const [active, setActive] = useState(false);
  const [camera] = useState(() => new CameraSession());
  const cameraState = useSyncExternalStore(
    camera.subscribe,
    camera.snapshot,
    () => "stopped" as const,
  );
  const [cameraNotice, setCameraNotice] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<DeskResult | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const gate = useRef(new ScanGate());
  const live = useRef(true);
  const operation = useRef(0);
  const filters = useUrlFilters(checkInHistoryFilterSchema);
  const { page, search = "" } = filters.values;
  const eventQuery = useQuery({
    queryKey: privateKey("organizer-events", userId, eventId, {}),
    queryFn: () => getManagedEvent(eventId),
    retry: false,
    refetchInterval: active && isVisible ? 5000 : false,
    refetchIntervalInBackground: false,
  });
  const history = useQuery({
    queryKey: privateKey("check-ins", userId, eventId, { page, search }),
    queryFn: () =>
      getCheckInHistory(
        eventId,
        new URLSearchParams({
          page: String(page),
          limit: "25",
          ...(search ? { search } : {}),
        }),
      ),
    enabled:
      active &&
      isVisible &&
      filters.valid &&
      !!eventQuery.data &&
      !eventQuery.isError,
    retry: false,
    refetchInterval: active && isVisible ? 5000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: active,
  });
  const windowOpen =
    eventQuery.data?.checkInWindow.isOpen === true && !eventQuery.isError;
  const stopCamera = useCallback(() => {
    camera.stop();
  }, [camera]);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      camera.stop();
    };
  }, [camera]);
  useEffect(() => {
    const pause = () => {
      if (document.visibilityState === "hidden") {
        stopCamera();
        setCameraNotice(
          "Camera stopped while this tab was hidden. Start it explicitly when you return.",
        );
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, [stopCamera]);
  useEffect(() => {
    // Synchronize the preview state with a server-closed admission window.
    if (!windowOpen) stopCamera();
  }, [windowOpen, stopCamera]);

  const scan = async (raw: string) => {
    if (!active || !isVisible || !windowOpen) return;
    const value = raw.trim();
    const claim = gate.current.claim(value);
    if (["busy", "duplicate", "held"].includes(claim)) return;
    stopCamera();
    if (claim === "invalid") {
      setResult({ resultCode: "INVALID_INPUT" });
      setToken("");
      return;
    }
    const version = ++operation.current;
    setPending(true);
    setToken("");
    try {
      const response = await checkInTicket(eventId, value);
      if (!live.current || version !== operation.current) return;
      setResult(response);
      if (["ACCEPTED", "ALREADY_CHECKED_IN"].includes(response.resultCode))
        await invalidateMutation(client, userId, "checkIn");
    } catch (error) {
      if (!live.current || version !== operation.current) return;
      setResult({
        resultCode:
          error instanceof ApiError && [401, 403, 404].includes(error.status)
            ? "ACCESS_UNAVAILABLE"
            : "NETWORK_UNAVAILABLE",
      });
      // Read history after an uncertain mutation; never automatically resubmit a scan.
      await client.invalidateQueries({ queryKey: ["check-ins", userId] });
    } finally {
      gate.current.finish();
      if (live.current && version === operation.current) setPending(false);
    }
  };
  const startCamera = async () => {
    if (
      !active ||
      !isVisible ||
      !windowOpen ||
      pending ||
      result ||
      !video.current ||
      cameraState !== "stopped"
    )
      return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraNotice(
        "Camera access requires HTTPS and a supported browser. Use manual token input.",
      );
      return;
    }
    setCameraNotice("");
    try {
      const started = await camera.start(video.current, deviceId, (text) => {
        void scan(text);
      });
      if (!live.current) return;
      if (started) {
        const cameras = await navigator.mediaDevices.enumerateDevices();
        if (live.current)
          setDevices(cameras.filter((device) => device.kind === "videoinput"));
      }
    } catch (error) {
      if (live.current) {
        stopCamera();
        setCameraNotice(cameraError(error));
      }
    }
  };
  const continueScanning = () => {
    if (!gate.current.reset()) return;
    setResult(null);
    setToken("");
    setCameraNotice(
      "Ready for the next guest. Start the camera or enter a token.",
    );
  };
  if (eventQuery.isPending)
    return <p className={styles.loading}>Opening event desk…</p>;
  if (eventQuery.isError)
    return (
      <ReadFailure
        error={eventQuery.error}
        retry={() => void eventQuery.refetch()}
        fetching={eventQuery.isFetching}
        next={`/organizer/events/${eventId}/check-in`}
      />
    );
  const event = eventQuery.data;
  const count = history.isError ? undefined : history.data?.checkedInCount;
  return (
    <div className={styles.desk}>
      <header>
        <p className="eyebrow">
          <span />
          Authoritative door desk
        </p>
        <h1>{event.title}</h1>
        <p>
          Window:{" "}
          {formatEventRange(
            event.checkInWindow.opensAt,
            event.checkInWindow.closesAt,
          )}{" "}
          (Bangladesh time). The server makes every admission decision.
        </p>
      </header>
      <div className={styles.controls}>
        <button
          className="button button-primary"
          type="button"
          disabled={pending}
          onClick={() => {
            if (active) {
              stopCamera();
              setActive(false);
            } else setActive(true);
          }}
        >
          {active ? "Stop desk" : "Open desk"}
        </button>
        <p role="status">
          {active
            ? isVisible
              ? "Desk active: history and counts refresh every five seconds."
              : "Backgrounded: polling and camera paused."
            : "Desk stopped: no scanning or automatic history polling."}
        </p>
      </div>
      <div className={styles.grid}>
        <section className={styles.scan}>
          <h2>
            Camera or manual <b>scan.</b>
          </h2>
          {!windowOpen && (
            <p role="status">
              Admission is closed. Read history, but do not admit guests. There
              is no override.
            </p>
          )}
          <video
            className={styles.video}
            ref={video}
            autoPlay
            muted
            playsInline
            aria-label="Private camera QR preview"
          />
          <div className={styles.controls}>
            <button
              className="button"
              type="button"
              disabled={
                !active ||
                !isVisible ||
                !windowOpen ||
                pending ||
                !!result ||
                cameraState !== "stopped"
              }
              onClick={() => void startCamera()}
            >
              Start camera
            </button>
            <button className="button" type="button" onClick={stopCamera}>
              Stop camera
            </button>
            <label>
              Camera
              <select
                value={deviceId}
                disabled={cameraState !== "stopped" || pending}
                onChange={(event) => setDeviceId(event.target.value)}
              >
                <option value="">Prefer rear camera</option>
                {devices.map((device, index) => (
                  <option value={device.deviceId} key={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p role="status">
            {!windowOpen
              ? "Camera stopped: admission closed."
              : cameraState === "starting"
                ? "Waiting for camera permission / preview…"
                : cameraState === "running"
                  ? "Point at one EventGate QR. Scanning stops on the first result."
                  : "Camera off."}
          </p>
          {cameraNotice && <p role="status">{cameraNotice}</p>}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void scan(token);
            }}
          >
            <label>
              Opaque ticket token
              <input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                type="password"
                autoComplete="off"
                spellCheck={false}
                maxLength={128}
                placeholder="Paste the private QR token"
                disabled={!active || pending || !!result}
              />
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={
                !active || !isVisible || !windowOpen || pending || !!result
              }
            >
              {pending ? "Server validating…" : "Validate manual token"}
            </button>
          </form>
          <p>
            Never paste a website address. Tokens are not logged or stored.
            Camera failures do not disable manual input.
          </p>
        </section>
        <aside className={styles.total}>
          <span>Confirmed check-ins</span>
          <strong>{count === undefined ? "Unavailable" : count}</strong>
          <small>
            {history.isFetching
              ? "Refreshing server count…"
              : "No estimated or offline admissions"}
          </small>
        </aside>
      </div>
      {(pending || result) && (
        <section
          className={styles.result}
          data-code={result?.resultCode}
          role="status"
          aria-live="polite"
        >
          <h2>
            {pending
              ? "Validating with the server…"
              : result
                ? resultText[result.resultCode][0]
                : ""}
          </h2>
          {!pending && result && (
            <>
              <p>{resultText[result.resultCode][1]}</p>
              {"ticket" in result && (
                <div>
                  <strong>{result.ticket.attendee.displayName}</strong>
                  <p>
                    {result.ticket.ticketTier.name} · Pass #
                    {result.ticket.sequence}
                  </p>
                  {result.ticket.checkedInAt && (
                    <p>
                      Admitted at {formatEventDate(result.ticket.checkedInAt)}{" "}
                      (Bangladesh time).
                    </p>
                  )}
                </div>
              )}
              <button
                className="button"
                type="button"
                onClick={continueScanning}
              >
                Dismiss / continue with next guest
              </button>
            </>
          )}
        </section>
      )}
      <section className={styles.history}>
        <h2>
          Door <b>history.</b>
        </h2>
        <form
          className={styles.controls}
          onSubmit={(event) => {
            event.preventDefault();
            filters.update(
              "search",
              String(new FormData(event.currentTarget).get("search") ?? ""),
            );
          }}
        >
          <label>
            Guest name, tier or pass number
            <input
              name="search"
              key={search}
              defaultValue={search}
              maxLength={120}
              type="search"
            />
          </label>
          <button className="button" type="submit">
            Search history
          </button>
        </form>
        {!filters.valid ? (
          <p role="alert">{filters.error}</p>
        ) : !active && !history.data ? (
          <p>Open the desk to load history and metrics.</p>
        ) : history.isError ? (
          <ReadFailure
            error={history.error}
            retry={() => void history.refetch()}
            fetching={history.isFetching}
            next={`/organizer/events/${eventId}/check-in`}
          />
        ) : history.isPending ? (
          <p>Loading confirmed entries…</p>
        ) : page > Math.max(1, history.data.meta.totalPages) ? (
          <button
            className="button"
            type="button"
            onClick={() => filters.setPage(1)}
          >
            Reset unavailable page
          </button>
        ) : (
          <>
            <p>
              {history.data.total} matching entries
              {!active ? " · Updates paused" : ""}
            </p>
            <ul>
              {history.data.records.map((record) => (
                <li key={record.id}>
                  <div>
                    <strong>{record.attendee.displayName}</strong>
                    <span>
                      {record.ticketTier.name} · Pass #{record.sequence}
                    </span>
                  </div>
                  <time>{formatEventDate(record.checkedInAt)}</time>
                </li>
              ))}
            </ul>
            {!history.data.records.length && (
              <p>No matching confirmed entries.</p>
            )}
            <Pagination
              page={page}
              totalPages={history.data.meta.totalPages}
              onPageChange={filters.setPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
