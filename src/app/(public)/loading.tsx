import { Skeleton } from "@/components/ui";
export default function PublicLoading() {
  return (
    <main id="main-content" className="wrap">
      <p role="status">Loading EventGate…</p>
      <Skeleton />
    </main>
  );
}
