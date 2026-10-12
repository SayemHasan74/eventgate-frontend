export const admissionLabels: Record<string, string> = {
  ACTIVE: "Active pass",
  CHECKED_IN: "Already checked in",
  VOIDED: "Pass voided",
  REFUNDED: "Pass refunded",
  REFUND_PENDING: "Admission blocked by refund",
  PAYMENT_REVIEW: "Payment review required",
  CANCELLED: "Event cancelled",
  EVENT_ENDED: "Event ended",
};
export const admissionExplanations: Record<string, string> = {
  ACTIVE:
    "A QR can be opened only during the published check-in window. Every scan is validated by the server.",
  CHECKED_IN:
    "This pass has already admitted one guest and cannot be scanned again.",
  VOIDED: "This pass is not valid for entry. Review the booking for details.",
  REFUNDED:
    "This pass belongs to a refunded payment and is not valid for entry.",
  REFUND_PENDING:
    "An active, approved or unresolved refund blocks admission. Review its current status on your order.",
  PAYMENT_REVIEW:
    "The payment needs review; admission is blocked until resolved.",
  CANCELLED:
    "The event was cancelled. Do not present this pass for admission; follow any refund on your order.",
  EVENT_ENDED:
    "The admission window has ended. This is a historical pass, not a current entry credential.",
};
