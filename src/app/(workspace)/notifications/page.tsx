import { Suspense } from "react";
import { NotificationHistory } from "./notification-history";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading notification history…</p>}>
      <NotificationHistory />
    </Suspense>
  );
}
