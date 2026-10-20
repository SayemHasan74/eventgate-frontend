"use client";
import { InventoryDots } from "@/components/event-ticket";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import {
  Button,
  FieldError,
  LinkButton,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import {
  ConfirmationDialog,
  ErrorState,
  Pagination,
} from "@/components/ui/interactive";
import { EmptyState } from "@/components/empty-state";
import { useUrlFilters } from "@/components/url-filters";
import { listFilterSchema } from "@/lib/filter-schemas";
import {
  getManagedEvent,
  getManagedTiers,
  updateTicketTier,
  deleteTicketTier,
  type ManagedTier,
} from "@/lib/organizer-api";
import { invalidateMutation, privateKey } from "@/lib/query-keys";
import { formatMoney, formatEventRange } from "@/lib/format";
import { TierEditor } from "./tier-editor";
import styles from "./tier-manager.module.css";
type Action = "delete" | "close" | "pause" | "resume";
function TierCard({
  tier,
  eventId,
  onEdit,
  onDeleted,
}: {
  tier: ManagedTier;
  eventId: string;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const { session } = useAuth();
  const client = useQueryClient();
  const [action, setAction] = useState<Action | null>(null);
  const mutation = useMutation({
    mutationFn: async (action: Action) => {
      if (action === "delete") await deleteTicketTier(eventId, tier.id);
      else
        await updateTicketTier(
          eventId,
          tier.id,
          action === "close"
            ? { closeSales: true }
            : { salesPaused: action === "pause" },
        );
    },
    onSuccess: async (_, action) => {
      await invalidateMutation(client, session!.user.id, "tier", eventId);
      toast.success(
        action === "delete"
          ? "Tier deleted; history remains protected."
          : "Sales controls saved.",
      );
      if (action === "delete") onDeleted();
    },
  });
  const explanation =
    action === "delete"
      ? "Only draft tiers without any order history can be deleted."
      : action === "close"
        ? "Sales end will be set to the backend’s current time. Existing held reservations are not cancelled; late payment stock reacquisition must pass the new sales rules."
        : action === "pause"
          ? "New purchases and late payment stock reacquisition will be blocked. Existing valid held reservations are not cancelled."
          : "Sales will follow the saved window again. The backend will confirm that its end is still in the future.";
  return (
    <article className={styles.tier}>
      <div className={styles.tierLabel}>
        <StatusBadge status={tier.salesPaused ? "PAUSED" : tier.saleState} />
        <h2>{tier.name}</h2>
        <strong>{formatMoney(tier.pricePaisa)}</strong>
      </div>
      <div className={styles.tierBody}>
        <InventoryDots
          capacity={tier.capacity}
          sold={tier.soldQuantity}
          reserved={tier.reservedQuantity}
        />
        <dl className={styles.stock}>
          {[
            ["Capacity", tier.capacity],
            ["Reserved", tier.reservedQuantity],
            ["Sold", tier.soldQuantity],
            ["Available", tier.availableQuantity],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p>Sales: {formatEventRange(tier.salesStartAt, tier.salesEndAt)}</p>
        {tier.restrictionCodes.includes("TIER_HISTORY_LOCKED") && (
          <p>
            Order history locks name, price, and sales start. Capacity cannot be
            reduced.
          </p>
        )}
        {tier.restrictionCodes.includes("PUBLISHED_TIER_FIELDS_LOCKED") && (
          <p>
            Published tier: name, price, and sales start are fixed. Only
            capacity increases and sales controls are permitted.
          </p>
        )}
        {!tier.canEdit && <p>Historical inventory is read-only.</p>}
        <div className={styles.actions}>
          {tier.canEdit && (
            <Button disabled={mutation.isPending} onClick={onEdit}>
              Edit tier
            </Button>
          )}
          {tier.canCloseSales && (
            <Button
              disabled={mutation.isPending}
              onClick={() => setAction("close")}
            >
              Close sales now
            </Button>
          )}
          {tier.canPauseSales && (
            <Button
              disabled={mutation.isPending}
              onClick={() => setAction("pause")}
            >
              Pause sales
            </Button>
          )}
          {tier.canResumeSales && (
            <Button
              disabled={mutation.isPending}
              onClick={() => setAction("resume")}
            >
              Resume sales
            </Button>
          )}
          {tier.canDelete && (
            <Button
              variant="danger"
              disabled={mutation.isPending}
              onClick={() => setAction("delete")}
            >
              Delete tier
            </Button>
          )}
        </div>
        {mutation.isError && <FieldError>{mutation.error.message}</FieldError>}
      </div>
      <ConfirmationDialog
        open={!!action}
        title={`${action === "delete" ? "Delete" : action === "close" ? "Close sales for" : action === "pause" ? "Pause" : "Resume"} ${tier.name}?`}
        description={explanation}
        onDismiss={() => setAction(null)}
        onConfirm={async () => {
          if (action) await mutation.mutateAsync(action);
        }}
      />
    </article>
  );
}
export function TierForm() {
  const { session } = useAuth();
  const { eventId } = useParams<{ eventId: string }>();
  const client = useQueryClient();
  const filters = useUrlFilters(listFilterSchema);
  const page = filters.values.page;
  const [editor, setEditor] = useState<ManagedTier | "new" | null>(null);
  const event = useQuery({
    queryKey: privateKey("organizer-events", session?.user.id, eventId, {}),
    queryFn: () => getManagedEvent(eventId),
    enabled: !!session,
  });
  const tiers = useQuery({
    queryKey: privateKey("organizer-tiers", session?.user.id, eventId, {
      page,
    }),
    queryFn: ({ signal }) =>
      getManagedTiers(
        eventId,
        new URLSearchParams({ page: String(page), limit: "20" }),
        signal,
      ),
    enabled: !!session && filters.valid,
  });
  if (event.isPending) return <Skeleton />;
  if (event.isError)
    return (
      <ErrorState
        message={event.error.message}
        retry={() => void event.refetch()}
      />
    );
  const saved = event.data;
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <StatusBadge status={saved.status} />
          <h1>Ticket inventory</h1>
          <p>{saved.title}</p>
          <p>{formatEventRange(saved.startAt, saved.endAt)}</p>
        </div>
        <div className={styles.actions}>
          {saved.status === "DRAFT" && saved.capabilities.canManageTiers && (
            <Button variant="primary" onClick={() => setEditor("new")}>
              Add ticket tier
            </Button>
          )}
          <Button
            disabled={tiers.isFetching}
            onClick={() => void Promise.all([tiers.refetch(), event.refetch()])}
          >
            Refresh saved inventory
          </Button>
        </div>
      </header>
      <p>
        {saved.status === "DRAFT"
          ? "Build and correct saved tiers before publication. Order history locks destructive edits."
          : saved.status === "PUBLISHED"
            ? "No new tiers or deletion after publication. Increase stock or adjust sales safely; pause a future sales window instead of giving it an invalid end time."
            : "This event’s inventory is retained as read-only history."}
      </p>
      {!filters.valid ? (
        <FieldError>{filters.error}</FieldError>
      ) : tiers.isPending ? (
        <Skeleton />
      ) : tiers.isError ? (
        <ErrorState
          message={tiers.error.message}
          retry={() => void tiers.refetch()}
        />
      ) : (
        <>
          <p>{tiers.data.meta.total} saved tiers</p>
          {tiers.data.data.length ? (
            <div className={styles.list}>
              {tiers.data.data.map((tier) => (
                <TierCard
                  key={tier.id}
                  tier={tier}
                  eventId={eventId}
                  onEdit={() => setEditor(tier)}
                  onDeleted={() => {
                    filters.setPage(1);
                    void client.invalidateQueries({
                      queryKey: ["organizer-tiers", session?.user.id],
                    });
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No ticket tiers on this page."
              description={
                saved.status === "DRAFT"
                  ? "Create saved inventory before publishing."
                  : "No saved inventory matches this page."
              }
            />
          )}
          <Pagination
            page={page}
            totalPages={tiers.data.meta.totalPages}
            onPageChange={filters.setPage}
          />
        </>
      )}
      <div className={styles.actions}>
        <LinkButton href={`/organizer/events/${eventId}`}>
          Event overview
        </LinkButton>
        {saved.status === "DRAFT" && (
          <LinkButton href={`/organizer/events/${eventId}/publish`}>
            Review publication
          </LinkButton>
        )}
      </div>
      {editor && (
        <TierEditor
          key={editor === "new" ? "new" : editor.id}
          event={saved}
          tier={editor === "new" ? undefined : editor}
          onDismiss={() => setEditor(null)}
        />
      )}
    </section>
  );
}
