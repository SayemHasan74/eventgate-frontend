"use client";

import { Minus, Plus, Ticket } from "lucide-react";
import { useState } from "react";

import type { PublicTicketTier } from "@/lib/eventgate-api";

import styles from "./ticket-selector.module.css";

type TicketSelectorProps = Readonly<{
  tiers: PublicTicketTier[];
  now: number;
}>;

const isOnSale = (tier: PublicTicketTier, now: number) =>
  tier.availableQuantity > 0 && new Date(tier.salesStartAt).getTime() <= now && new Date(tier.salesEndAt).getTime() >= now;

const price = (paisa: number) => `৳${new Intl.NumberFormat("en-BD").format(paisa / 100)}`;

export function TicketSelector({ tiers, now }: TicketSelectorProps) {
  const sellableTiers = tiers.filter((tier) => isOnSale(tier, now));
  const [selectedTierId, setSelectedTierId] = useState(sellableTiers[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const selectedTier = sellableTiers.find((tier) => tier.id === selectedTierId);
  const quantityLimit = selectedTier ? Math.min(selectedTier.availableQuantity, 10) : 0;
  const total = selectedTier ? selectedTier.pricePaisa * quantity : 0;

  const unavailableReason = sellableTiers.length > 0
    ? null
    : tiers.some((tier) => new Date(tier.salesStartAt).getTime() > now)
      ? "Ticket sales have not opened yet."
      : "There are no tickets available for online reservation.";

  const chooseTier = (id: string) => {
    setSelectedTierId(id);
    setQuantity(1);
  };

  return (
    <div className={styles.selector}>
      <section aria-labelledby="tiers-heading">
        <p className="eyebrow"><span /> Step 1 of 2</p>
        <h2 id="tiers-heading">Pick a <b>ticket.</b></h2>
        <p className={styles.intro}>One reservation holds one ticket tier. You can reserve up to 10 tickets at a time.</p>

        <div className={styles.options} role="radiogroup" aria-label="Ticket tier">
          {tiers.map((tier) => {
            const available = isOnSale(tier, now);
            const selected = tier.id === selectedTierId;
            return (
              <button
                aria-checked={selected}
                className={styles.option}
                data-selected={selected}
                disabled={!available}
                key={tier.id}
                onClick={() => chooseTier(tier.id)}
                role="radio"
                type="button"
              >
                <span className={styles.radio} aria-hidden="true" />
                <span><strong>{tier.name}</strong><small>{available ? `${tier.availableQuantity} left` : tier.availableQuantity === 0 ? "Sold out" : "Sales closed"}</small></span>
                <b>{price(tier.pricePaisa)}</b>
              </button>
            );
          })}
        </div>
      </section>

      <aside className={styles.summary} aria-live="polite">
        <div className={styles.summaryHeading}><Ticket size={20} aria-hidden="true" /><span>Your reservation</span></div>
        {selectedTier ? (
          <>
            <div className={styles.summaryTier}><span>{selectedTier.name}</span><strong>{price(selectedTier.pricePaisa)} each</strong></div>
            <div className={styles.quantityRow}>
              <span>Quantity</span>
              <div>
                <button aria-label="Remove one ticket" disabled={quantity <= 1} onClick={() => setQuantity((value) => value - 1)} type="button"><Minus size={15} /></button>
                <output>{quantity}</output>
                <button aria-label="Add one ticket" disabled={quantity >= quantityLimit} onClick={() => setQuantity((value) => value + 1)} type="button"><Plus size={15} /></button>
              </div>
            </div>
            <div className={styles.total}><span>Total</span><strong>{price(total)}</strong></div>
            <p>Sign in is required before EventGate reserves tickets and starts the payment timer.</p>
          </>
        ) : <p className={styles.noAvailability}>{unavailableReason}</p>}
      </aside>
    </div>
  );
}
