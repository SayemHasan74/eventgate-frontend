import { EventOrderLedger } from "./event-order-ledger";
import { Suspense } from "react";
export default function EventOrdersPage() {
  return (
    <Suspense fallback={<p>Loading event orders…</p>}>
      <EventOrderLedger />
    </Suspense>
  );
}
