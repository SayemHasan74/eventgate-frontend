import { Suspense } from "react";
import { WaitlistHistory } from "./waitlist-history";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading stock-alert memberships…</p>}>
      <WaitlistHistory />
    </Suspense>
  );
}
