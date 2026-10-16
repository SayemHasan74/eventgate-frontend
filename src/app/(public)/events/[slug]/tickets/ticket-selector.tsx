"use client";
import { getFreshAvailability } from "@/lib/public-availability";
import { tierSaleState } from "@/lib/public-sale";
import { formatMoney } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateMutation } from "@/lib/query-keys";

import { ArrowRight, LoaderCircle, Minus, Plus, Ticket } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearBookingIntent,
  readBookingIntent,
  saveBookingIntent,
} from "@/lib/booking-intent";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import type { PublicTicketTier } from "@/lib/eventgate-api";
import { OrderApiError, reserveTickets } from "@/lib/order-api";
import { existingOperationKey } from "@/lib/operation-keys";

import styles from "./ticket-selector.module.css";
import reservationStyles from "./reservation.module.css";

type TicketSelectorProps = Readonly<{
  tiers: PublicTicketTier[];
  now: number;
  slug: string;
  eventStart: string;
  eventId: string;
  initialTierId?: string;
}>;

const price = formatMoney;

export function TicketSelector({
  tiers: initialTiers,
  now: initialNow,
  slug,
  eventStart,
  eventId,
  initialTierId,
}: TicketSelectorProps) {
  const [tiers, setTiers] = useState(initialTiers);
  const [now, setNow] = useState(initialNow);
  const [notice, setNotice] = useState(
    initialTierId
      ? "Your selected tier is ready. Choose the new tickets you want to buy; previous purchases are unchanged."
      : "",
  );
  const isOnSale = (tier: PublicTicketTier, now: number) =>
    tierSaleState(tier, eventStart, now) === "OPEN";
  const sellableTiers = tiers.filter((tier) => isOnSale(tier, now));
  const [selectedTierId, setSelectedTierId] = useState(
    initialTierId ?? sellableTiers[0]?.id ?? "",
  );
  const [quantity, setQuantity] = useState(1);
  const [isReserving, setIsReserving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [availabilityReady, setAvailabilityReady] = useState(false);
  const [canRecover, setCanRecover] = useState(false);
  const selection = useRef({
    tierId: initialTierId ?? sellableTiers[0]?.id ?? "",
    quantity: 1,
  });
  const busy = useRef(false);
  const request = useRef(0);
  const restored = useRef(false);
  const invalidateReads = useCallback(() => {
    request.current++;
  }, []);
  const queryClient = useQueryClient();
  const { isReady, session } = useAuth();
  const currentUserId = session?.user.id;
  const pathname = usePathname();
  const router = useRouter();
  const selectedTier = sellableTiers.find((tier) => tier.id === selectedTierId);
  const quantityLimit = selectedTier
    ? Math.min(selectedTier.availableQuantity, 10)
    : 0;
  const total = selectedTier ? selectedTier.pricePaisa * quantity : 0;
  const wrongRole = session && session.user.role !== "ATTENDEE";

  const recoverReservation = async () => {
    if (!session || wrongRole || busy.current) return;
    busy.current = true;
    setIsReserving(true);
    request.current++;
    try {
      const order = await reserveTickets(
        selectedTierId,
        quantity,
        session.user.id,
      );
      clearBookingIntent();
      setCanRecover(false);
      void invalidateMutation(queryClient, session.user.id, "order");
      router.push(`/orders/${order.id}`);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The previous reservation could not be recovered. Retry the same operation.",
      );
      setCanRecover(
        !!existingOperationKey(
          "order",
          session.user.id,
          `${selectedTierId}:${quantity}`,
        ),
      );
    } finally {
      busy.current = false;
      setIsReserving(false);
      setIsRefreshing(false);
    }
  };

  const refresh = useCallback(() => {
    if (busy.current) return Promise.resolve();
    const version = ++request.current;
    return getFreshAvailability(slug)
      .then((fresh) => {
        if (version !== request.current) return;
        if (!restored.current) {
          restored.current = true;
          const intent = initialTierId
            ? null
            : readBookingIntent(eventId, slug);
          if (intent) {
            selection.current = {
              tierId: intent.tierId,
              quantity: intent.quantity,
            };
            setSelectedTierId(intent.tierId);
            setQuantity(intent.quantity);
            setNotice(
              "Your ticket selection was restored. Review current availability before reserving.",
            );
          }
        }
        const recoverable =
          !!currentUserId &&
          !!existingOperationKey(
            "order",
            currentUserId,
            `${selection.current.tierId}:${selection.current.quantity}`,
          );
        setCanRecover(recoverable);
        setTiers(fresh.ticketTiers);
        setNow(Date.parse(fresh.serverTime));
        setAvailabilityReady(true);
        const tier = fresh.ticketTiers.find(
          (item) => item.id === selection.current.tierId,
        );
        if (recoverable) {
          setNotice(
            "A previous reservation request may have reached the server. Recover the same request before changing the tier or quantity.",
          );
        } else if (!tier?.canPurchase) {
          setNotice(
            "Your selected tier is not currently on sale. Choose an available tier; nothing was reserved.",
          );
        } else if (
          selection.current.quantity > Math.min(10, tier.availableQuantity)
        ) {
          const limit = Math.min(10, tier.availableQuantity);
          selection.current.quantity = limit;
          setQuantity(limit);
          setNotice(
            `Availability changed. Quantity was reduced to ${limit}. Review before reserving.`,
          );
        }
      })
      .catch((error) => {
        if (version !== request.current) return;
        setAvailabilityReady(false);
        setNotice(
          error instanceof Error
            ? error.message
            : "Availability could not be checked. Retry before reserving.",
        );
      })
      .finally(() => {
        if (version === request.current) setIsRefreshing(false);
      });
  }, [slug, eventId, initialTierId, currentUserId]);

  useEffect(() => {
    void refresh();
    const visible = () => {
      if (document.visibilityState === "visible") {
        setIsRefreshing(true);
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      invalidateReads();
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh, invalidateReads]);

  const unavailableReason =
    sellableTiers.length > 0
      ? null
      : tiers.some((tier) => new Date(tier.salesStartAt).getTime() > now)
        ? "Ticket sales have not opened yet."
        : "There are no tickets available for online reservation.";

  const chooseTier = (id: string) => {
    setNotice("");
    setSelectedTierId(id);
    setQuantity(1);
    selection.current = { tierId: id, quantity: 1 };
    setCanRecover(
      !!session && !!existingOperationKey("order", session.user.id, `${id}:1`),
    );
  };
  const changeQuantity = (value: number) => {
    selection.current.quantity = value;
    setQuantity(value);
    setCanRecover(
      !!session &&
        !!existingOperationKey(
          "order",
          session.user.id,
          `${selectedTierId}:${value}`,
        ),
    );
  };

  const reserve = async () => {
    if (
      !selectedTier ||
      busy.current ||
      isRefreshing ||
      !availabilityReady ||
      wrongRole
    )
      return;
    if (canRecover) {
      await recoverReservation();
      return;
    }
    if (!session) {
      if (
        !saveBookingIntent({
          eventId,
          slug,
          tierId: selectedTier.id,
          quantity,
        })
      ) {
        toast.info(
          "Browser storage is unavailable. Please select your tickets again after signing in.",
        );
      }
      router.push(`/auth/sign-in?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setIsReserving(true);
    busy.current = true;
    request.current++;
    saveBookingIntent({
      eventId,
      slug,
      tierId: selectedTier.id,
      quantity,
    });
    try {
      setNotice("");
      const fresh = await getFreshAvailability(slug);
      setTiers(fresh.ticketTiers);
      setNow(Date.parse(fresh.serverTime));
      const liveTier = fresh.ticketTiers.find(
        (tier) => tier.id === selectedTier.id,
      );
      if (!liveTier?.canPurchase) {
        setNotice(
          "This tier is no longer on sale. Review the updated availability; no reservation was created.",
        );
        return;
      }
      const limit = Math.min(10, liveTier.availableQuantity);
      if (quantity > limit) {
        changeQuantity(limit);
        setNotice(
          `Only ${limit} tickets are currently available. Review the updated quantity and reserve again.`,
        );
        return;
      }
      if (liveTier.pricePaisa !== selectedTier.pricePaisa) {
        setNotice(
          "The displayed price changed. Review the updated total before reserving again.",
        );
        return;
      }
      const order = await reserveTickets(
        selectedTier.id,
        quantity,
        session.user.id,
      );
      clearBookingIntent();
      void invalidateMutation(queryClient, session.user.id, "order");
      toast.success("Tickets reserved for 15 minutes.");
      router.push(`/orders/${order.id}`);
    } catch (error) {
      setCanRecover(
        !!existingOperationKey(
          "order",
          session.user.id,
          `${selectedTierId}:${quantity}`,
        ),
      );
      setNotice(
        error instanceof Error
          ? error.message
          : "Reservation failed. Please retry.",
      );
      toast.error(
        error instanceof OrderApiError
          ? error.message
          : "Could not reserve tickets. Please try again.",
      );
    } finally {
      setIsReserving(false);
      busy.current = false;
    }
  };

  return (
    <div className={styles.selector}>
      {notice && (
        <p className={styles.notice} role="alert">
          {notice}
        </p>
      )}
      {canRecover && session?.user.role === "ATTENDEE" && (
        <div className={styles.notice}>
          <p>
            A previous reservation request may have reached the server. Recover
            it with the same request key before starting another booking.
          </p>
          <button
            type="button"
            className="button"
            disabled={isReserving || !!wrongRole}
            onClick={() => void recoverReservation()}
          >
            Recover previous reservation
          </button>
        </div>
      )}
      <section aria-labelledby="tiers-heading">
        <p className="eyebrow">
          <span /> Step 1 of 2
        </p>
        <h2 id="tiers-heading">
          Pick a <b>ticket.</b>
        </h2>
        <p className={styles.intro}>
          One reservation holds one ticket tier. You can reserve up to 10
          tickets at a time.
        </p>
        {wrongRole && (
          <p className={styles.notice} role="status">
            Purchasing requires an attendee account. Sign out of your{" "}
            {session.user.role.toLowerCase()} account before signing in as an
            attendee.
          </p>
        )}
        <p role="status">
          {isRefreshing
            ? "Checking current availability…"
            : availabilityReady
              ? "Availability checked. We check again before reservation."
              : "Current availability is unavailable. Please retry."}
        </p>
        <button
          type="button"
          className="text-link"
          disabled={isRefreshing || isReserving}
          onClick={() => {
            setIsRefreshing(true);
            void refresh();
          }}
        >
          Refresh availability
        </button>

        <div
          className={styles.options}
          role="radiogroup"
          aria-label="Ticket tier"
        >
          {tiers.map((tier) => {
            const available = isOnSale(tier, now);
            const selected = tier.id === selectedTierId;
            return (
              <label
                className={styles.option}
                data-selected={selected}
                data-disabled={!available || isReserving}
                key={tier.id}
              >
                <input
                  className={styles.radio}
                  type="radio"
                  name="ticket-tier"
                  value={tier.id}
                  checked={selected}
                  disabled={
                    !available || isReserving || isRefreshing || canRecover
                  }
                  onChange={() => chooseTier(tier.id)}
                />
                <span>
                  <strong>{tier.name}</strong>
                  <small>
                    {available
                      ? `${tier.availableQuantity} left`
                      : {
                          UPCOMING: "Coming soon",
                          PAUSED: "Sales paused",
                          SOLD_OUT: "Sold out",
                          CLOSED: "Sales closed",
                          OPEN: "On sale",
                        }[tierSaleState(tier, eventStart, now)]}
                  </small>
                </span>
                <b>{price(tier.pricePaisa)}</b>
              </label>
            );
          })}
        </div>
      </section>

      <aside className={styles.summary} aria-live="polite">
        <div className={styles.summaryHeading}>
          <Ticket size={20} aria-hidden="true" />
          <span>Your reservation</span>
        </div>
        {selectedTier ? (
          <>
            <div className={styles.summaryTier}>
              <span>{selectedTier.name}</span>
              <strong>{price(selectedTier.pricePaisa)} each</strong>
            </div>
            <div className={styles.quantityRow}>
              <span>Quantity</span>
              <div>
                <button
                  aria-label="Remove one ticket"
                  disabled={
                    quantity <= 1 || isReserving || isRefreshing || canRecover
                  }
                  onClick={() => changeQuantity(quantity - 1)}
                  type="button"
                >
                  <Minus size={15} />
                </button>
                <output>{quantity}</output>
                <button
                  aria-label="Add one ticket"
                  disabled={
                    quantity >= quantityLimit ||
                    isReserving ||
                    isRefreshing ||
                    canRecover
                  }
                  onClick={() => changeQuantity(quantity + 1)}
                  type="button"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
            <div className={styles.total}>
              <span>Total</span>
              <strong>{price(total)}</strong>
            </div>
            <p>
              Sign in is required before EventGate reserves tickets and starts
              the payment timer.
            </p>
            <button
              className={`button button-primary ${reservationStyles.reserveButton}`}
              disabled={
                !isReady ||
                isReserving ||
                isRefreshing ||
                !availabilityReady ||
                !!wrongRole
              }
              onClick={() => void reserve()}
              type="button"
            >
              {isReserving ? (
                <LoaderCircle className={reservationStyles.spinner} size={17} />
              ) : (
                <ArrowRight size={17} />
              )}
              {!isReady
                ? "Checking account"
                : wrongRole
                  ? "Attendee account required"
                  : session
                    ? isReserving
                      ? "Reserving tickets"
                      : "Reserve tickets"
                    : "Sign in to reserve"}
            </button>
          </>
        ) : (
          <p className={styles.noAvailability}>{unavailableReason}</p>
        )}
      </aside>
      <button
        className="text-link"
        type="button"
        disabled={isReserving}
        onClick={() => {
          clearBookingIntent();
          router.push(`/events/${slug}`);
        }}
      >
        Cancel selection and return to event
      </button>
    </div>
  );
}
