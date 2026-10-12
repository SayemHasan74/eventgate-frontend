"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { ReadFailure } from "@/components/read-failure";
import { RefundTimeline } from "@/components/refund-timeline";
import { getRefund } from "@/lib/refund-api";
import { privateKey } from "@/lib/query-keys";
import styles from "../refunds.module.css";
export function RefundDetail({ refundId }: { refundId: string }) {
  const { session, isReady } = useAuth();
  const query = useQuery({
    queryKey: privateKey("refunds", session?.user.id, refundId, {}),
    queryFn: () => getRefund(refundId),
    enabled: isReady && session?.user.role === "ATTENDEE",
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      ["REQUESTED", "APPROVED", "PROCESSING", "UNKNOWN"].includes(
        query.state.data?.status ?? "",
      )
        ? 15000
        : false,
    refetchIntervalInBackground: false,
  });
  if (isReady && session?.user.role !== "ATTENDEE")
    return (
      <section>
        <h1>Attendee access required.</h1>
        <Link className="button" href="/account">
          My account
        </Link>
      </section>
    );
  return (
    <main id="main-content" className={`wrap ${styles.page}`}>
      <Link href="/refunds" className="text-link">
        ← Refund history
      </Link>
      <h1>Refund details</h1>
      {!isReady || query.isPending ? (
        <p>Loading private refund…</p>
      ) : query.isError ? (
        <ReadFailure
          error={query.error}
          retry={() => void query.refetch()}
          fetching={query.isFetching}
          next={`/refunds/${refundId}`}
        />
      ) : (
        <section className={styles.timeline}>
          <h2>{query.data.order.eventNameSnapshot}</h2>
          <Link className="button" href={`/orders/${query.data.orderId}`}>
            Open the related order →
          </Link>
          <RefundTimeline refund={query.data} />
          <button
            type="button"
            className="button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Refresh refund status
          </button>
        </section>
      )}
    </main>
  );
}
