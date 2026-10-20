import { Suspense } from "react";
import { SavedEventList } from "./saved-event-list";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading saved events…</p>}>
      <SavedEventList />
    </Suspense>
  );
}
