import type { Refund } from "@/lib/refund-api";
import { formatEventDate, formatMoney } from "@/lib/format";
const labels: Record<string, string> = {
  REQUESTED: "Request submitted",
  REQUEST_RESUBMITTED: "Request resubmitted",
  REFUND_APPROVED: "Administrator approved",
  REFUND_REJECTED: "Administrator rejected",
  PROVIDER_CONFIRMED_FAILED: "Provider confirmed failure",
  PROVIDER_CONFIRMED_REFUNDED: "Provider confirmed refund",
  REFUND_REQUIRES_INVESTIGATION: "Reconciliation required",
};
export function RefundTimeline({ refund }: { refund: Refund }) {
  return (
    <section>
      <h3>
        {refund.status.replaceAll("_", " ")} · {formatMoney(refund.amountPaisa)}
      </h3>
      <p>{refund.reason.replaceAll("_", " ")}</p>
      <p>
        {refund.status === "SUCCEEDED"
          ? "The provider confirmed completion."
          : refund.status === "REJECTED"
            ? "The administrator rejected this request. Review the reason below."
            : refund.status === "FAILED"
              ? "Refund processing failed. An administrator must review the next step; do not submit a duplicate request."
              : refund.status === "UNKNOWN" || refund.needsInvestigation
                ? "The provider outcome is uncertain and requires reconciliation. Do not start another refund."
                : "This refund is under review or processing. Completion depends on provider confirmation; no fixed completion time is promised."}
      </p>
      <dl>
        <dt>Requested</dt>
        <dd>{formatEventDate(refund.requestedAt)}</dd>
        {refund.reviewedAt && (
          <>
            <dt>Reviewed</dt>
            <dd>{formatEventDate(refund.reviewedAt)}</dd>
          </>
        )}
        {refund.processedAt && (
          <>
            <dt>Provider processing started</dt>
            <dd>{formatEventDate(refund.processedAt)}</dd>
          </>
        )}
        {refund.completedAt && (
          <>
            <dt>Terminal outcome recorded</dt>
            <dd>{formatEventDate(refund.completedAt)}</dd>
          </>
        )}
      </dl>
      {refund.userMessage && <p>Your message: {refund.userMessage}</p>}
      {refund.reviewerNote && (
        <p>Administrator review: {refund.reviewerNote}</p>
      )}
      <h4>Recorded activity</h4>
      {refund.activities.length ? (
        <ol>
          {refund.activities.map((activity) => (
            <li key={activity.id}>
              <time dateTime={activity.createdAt}>
                {formatEventDate(activity.createdAt)}
              </time>{" "}
              ·{" "}
              {labels[activity.action] ?? activity.action.replaceAll("_", " ")}
              {activity.note ? ` — ${activity.note}` : ""}
            </li>
          ))}
        </ol>
      ) : (
        <p>No activity entries have been recorded yet.</p>
      )}
    </section>
  );
}
